var sidebarPage = 0
const sidebar = document.getElementById("sidebar")
const coinPageLimit = 99//page limiter

function sfetch(url, method, value) {//wraps fetch function and adds session header
    return fetch(url, {
        "headers": {
            "session": localStorage.getItem("session")
        },
        "body": method == "POST" ? JSON.stringify(value) : null,
        "method": method,
    });
}
const cma = (x) => x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")//regex to format nums

function randStr(length) {//random string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        result += chars[values[i] % chars.length];
    }
    return result;
}
async function updateSidebar(page) {//updates the sidebar
    sidebarPage = page
    let pageSelectors = document.getElementById("sidebarPagination").children
    for (let i = -1; i < 2; i++) {
        let element = pageSelectors[i + 3]
        let num = sidebarPage + i
        if (num >= 0 && num <= coinPageLimit) {
            element.textContent = num + 1
            if (element.classList.contains('disabled')) {
                element.classList.toggle('disabled')
            }
        } else {
            element.textContent = ""
            element.classList.add('disabled');
        }
    }
    if (sidebarPage <= 0) {
        pageSelectors[0].classList.add('view');
        pageSelectors[1].classList.add('view');
    } else {
        if (pageSelectors[0].classList.contains('view')) {
            pageSelectors[0].classList.toggle('view')
            pageSelectors[1].classList.toggle('view')
        }
    }
    if (sidebarPage >= coinPageLimit) {
        pageSelectors[5].classList.add('view');
        pageSelectors[6].classList.add('view');
    } else {
        if (pageSelectors[5].classList.contains('view')) {
            pageSelectors[5].classList.toggle('view')
            pageSelectors[6].classList.toggle('view')
        }
    }
    let children = sidebar.children
    let coins = await (await sfetch(`api/getAssets?page=${page}`, "GET")).json()
    for (let i = 0; i < coins.length; i++) {
        let coinElement = children[i]
        coinElement.childNodes[0].textContent = coins[i].slice(0, 2).join('/');
        coinElement.dataset.id = coins[i][2]
        let price = coinElement.children[0]
        sfetch(`api/getPrice?id=${coins[i][2]}`, "GET").then(x => x.text()).then(x => {//asynchronous to do all the requests at once
            price.textContent = '$' + x
        })
    }
    sfetch(`api/getPricePercentageChange?ids=${coins.map(x=>x[2]).join()}`, "GET").then(x => x.json()).then(x => {
        let elements = Object.fromEntries(Array.from(sidebar.children).map(x => [x.dataset.id, x]))
        let ranges = ['1h', '24h', '7d', '30d']
        for (const id in x) {//logic to set colors and % changes
            for (let i = 1; i < 5; i++) {
                elements[id].children[i].textContent = `${ranges[i]}: ${x[id]["price_change_percentage_" + ranges[i]]}%`
                elements[id].children[i].style = x[id]["price_change_percentage_" + ranges[i]] > 0 ? "color:#16c784;" : "color:#ea3943;"
            }
            elements[id].children[1].textContent = `1h: ${x[id].price_change_percentage_1h}%`
            elements[id].children[1].style = x[id].price_change_percentage_1h > 0 ? "color:#16c784;" : "color:#ea3943;"
            elements[id].children[2].textContent = `24h: ${x[id].price_change_percentage_24h}%`
            elements[id].children[2].style = x[id].price_change_percentage_24h > 0 ? "color:#16c784;" : "color:#ea3943;"
            elements[id].children[3].textContent = `7d: ${x[id].price_change_percentage_7d}%`
            elements[id].children[3].style = x[id].price_change_percentage_7d > 0 ? "color:#16c784;" : "color:#ea3943;"
            elements[id].children[4].textContent = `30d: ${x[id].price_change_percentage_30d}%`
            elements[id].children[4].style = x[id].price_change_percentage_30d > 0 ? "color:#16c784;" : "color:#ea3943;"
        }
    })
}
var currentPage
async function updatePage(id, name, ticker) {//updates main page view
    document.getElementById('loadInventory').style.display = '';
    document.getElementById('main').style.overflow = 'hidden'
    currentPage = Array.from(arguments)
    let price = await (await sfetch('api/getPrice?id=' + id, "GET")).text()
    document.getElementById('mainTitle').textContent = name + '/' + ticker + '\n$' + cma(price)
    let inventoryContent = document.getElementById('inventoryView')
    let assetContent = document.getElementById('assetView')
    inventoryContent.style.display = 'none'
    if (assetContent.style.display === 'none') {
        assetContent.style.display = '';
    }
    draw()
    updateSidebar(sidebarPage)
    let balance = document.getElementById('balance')
    let inventory = await (await sfetch('api/getInventory', "GET")).json()
    let amt = inventory.assets[id]?.[2] ?? 0
    balance.textContent = 'Your Balance: $' + cma(inventory.balance)
    let assetMenu = document.getElementById('assetMenu')
    assetMenu.childNodes[0].textContent = `${cma(amt)} ${ticker} ($${cma(price * amt)})`
    let currencySelect = document.getElementById('currencySelect')
    currencySelect.children[1].childNodes[1].textContent = ticker
}
async function loadInventory() {//loads portfolio view
    document.getElementById('loadInventory').style.display = 'none';
    document.getElementById('main').style.overflow = ''
    let mainTitle = document.getElementById('mainTitle')
    let inventoryContent = document.getElementById('inventoryView')
    let assetView = document.getElementById('assetView')
    let assetContainer = document.getElementById('assetContainer')
    assetView.style.display = 'none'
    if (inventoryContent.style.display === 'none') {
        inventoryContent.style.display = '';
    }
    let inventory = await (await sfetch('api/getInventory', "GET")).json()
    let assets = Object.entries(inventory.assets).filter(x => x[1][2] > 0)
    var newChildren = []
    var totalAssetValue = 0

    function update() {
        mainTitle.textContent = `Portfolio\n$${cma(inventory.balance)} + ($${cma(totalAssetValue)}) = $${cma(inventory.balance + totalAssetValue)}`
        assetContainer.replaceChildren(...newChildren)
    }
    update()
    let percents = {}
    for (let i = 0; i < assets.length; i++) {
        let child = document.createElement("div")
        let assetName = document.createElement("div")
        let userBalance = document.createElement("div")
        let assetPrice = document.createElement("div")
        let assetPercent = document.createElement("div")
        percents[assets[i][0]] = assetPercent
        child.replaceChildren(assetName, userBalance, assetPrice, assetPercent)
        assetName.textContent = assets[i][1][0] + '/' + assets[i][1][1]
        child.dataset.id = assets[i][0]
        child.className = 'assets'
        child.addEventListener("click", () => {
            updatePage(assets[i][0], assets[i][1][0], assets[i][1][1]);
        })
        newChildren.push(child)
        sfetch('api/getPrice?id=' + assets[i][0], "GET").then(x => x.text()).then(price => {
            price = Number(price)
            assetPrice.textContent = 'Price: $' + cma(price)
            userBalance.textContent = `${cma(assets[i][1][2])} ${assets[i][1][1]} ($${cma(price * assets[i][1][2])})`
            totalAssetValue += price * assets[i][1][2]
            update()
        })
    }
    sfetch(`api/getPricePercentageChange?ids=${assets.map(x=>x[0])}`, "GET").then(x => x.json()).then(x => {
        for (k in x) {
            let percent = percents[k]
            for (key in x[k]) {
                let element = document.createElement("div")
                element.textContent = `${key.match(/_([^_]+)$/)[1]}: ${x[k][key]}%`
                element.style = x[k][key] > 0 ? "color:#16c784;" : "color:#ea3943;"//color updating
                percent.appendChild(element)
            }
        }
    })
}
async function trade(sell) {//buying and selling
    let value = Number(document.getElementById('tradeActionText').value)
    if (!value) {
        return
    }
    updateSidebar(sidebarPage)
    let usd = document.querySelector('input[name="actionCurrency"]:checked').value;
    let amt = usd ? value / await (await sfetch('api/getPrice?id=' + currentPage[0], "GET")).text() : value
    sfetch('api/' + (sell ? 'sell' : 'buy'), "POST", {
        amount: amt,
        assetID: currentPage[0]
    })
    updatePage(...currentPage)
}
google.charts.load('current', {
    packages: ['corechart', 'line']
});
google.charts.setOnLoadCallback(draw);
let currentGraph = 0;
async function draw() {//drawing graph (google charts)
    try {
        let graphElement = document.getElementById('graphElement')
        let history = (await (await sfetch(`api/getPriceHistory?id=${currentPage[0]}&range=${currentGraph}`)).json()).map(x => [new Date(x[0]), x[1]]);// geting hist data
        let assetStats = document.getElementById('assetStats')
        let { min, max, sum, count } = history.reduce((acc, [, y]) => {
            acc.min = Math.min(acc.min, y);
            acc.max = Math.max(acc.max, y);
            acc.sum += y;
            acc.count++;
            return acc;
        }, { min: Infinity, max: -Infinity, sum: 0, count: 0 });//getting sum and count and min and max
        assetStats.textContent = `Min: $${cma(min)} Max: $${cma(max)} Mean: $${cma(sum / count)}`
        var data = new google.visualization.DataTable();
        data.addColumn('date', 'Date');
        data.addColumn('number', 'Price');
        data.addRows(history);
        var options = {
            theme: 'material',
            focusTarget: 'category',
            hAxis: {
                title: 'Date/Time'
            },
            vAxis: {
                title: 'Price (USD)'
            },
            legend: {
                position: 'none'
            },
            width: graphElement.offsetWidth,
            height: graphElement.offsetHeight
        };
        var chart = new google.visualization.LineChart(graphElement);
        chart.draw(data, options);
    } catch (_) {console.log(_)}
}
window.onresize = function() {//updates on resize
    draw()
};
async function setUp() {//basic main first page view stuff
    if (!localStorage.getItem("session")) {
        localStorage.setItem("session", randStr(96));
    }
    document.getElementById("save-input").value = localStorage.getItem("session");
    document.getElementById("save-submit").addEventListener("click", () => {
        localStorage.setItem("session", document.getElementById("save-input").value);
    });
    updateSidebar(0)
    Array.from(document.getElementById("sidebarPagination").children).forEach((x, i) => {
        x.addEventListener("click", () => {
            let num = i - 3
            sidebarPage += Math.sign(num) * 10 ** (Math.abs(num) - 1)
            if (sidebarPage < 0) {
                sidebarPage = 0
            } else if (sidebarPage > coinPageLimit) {
                sidebarPage = coinPageLimit;
            }
            updateSidebar(sidebarPage)
        })
    });
    Array.from(sidebar.children).forEach(x => {
        x.addEventListener('click', function() {//sets up sidebar clicking
            updatePage(this.dataset.id, ...this.childNodes[0].textContent.split('/'));
        });
    })
    Array.from(graphSelector.children).forEach((x, i) => {
        x.addEventListener('click', function() {//sets up graph time range view changing btns
            currentGraph = i
            updatePage(...currentPage);
        });
    })
    loadInventory()
}
setUp()