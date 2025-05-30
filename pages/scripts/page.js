var sidebarPage = 0
const sidebar = document.getElementById("sidebar")
const coinPageLimit = 19
function sfetch(url, method, value) {
    return fetch(url, {
        "headers": {
            "session": localStorage.getItem("session")
        },
        "body": method == "POST" ? JSON.stringify(value) : null,
        "method": method,
    });
}
const cma = (x) => x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
function randStr(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
        result += chars[values[i] % chars.length];
    }
    return result;
}
async function updateSidebar(page) {
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
        }else {
            element.textContent = ""
            element.classList.add('disabled');
        }
    }
    if (sidebarPage <= 0){
        pageSelectors[0].classList.add('view');
        pageSelectors[1].classList.add('view');
    }else {
        if (pageSelectors[0].classList.contains('view')) {
            pageSelectors[0].classList.toggle('view')
            pageSelectors[1].classList.toggle('view')
        }
    }
    if (sidebarPage >= coinPageLimit) {
        pageSelectors[5].classList.add('view');
        pageSelectors[6].classList.add('view');
    }else {
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
        sfetch(`api/getPrice?id=${coins[i][2]}`, "GET").then(x=>x.text()).then(x=>{
            price.textContent = '$' + x
        })
    }
    sfetch(`api/getPricePercentageChange?ids=${coins.map(x=>x[2]).join(",")}`, "GET").then(x=>x.json()).then(x=>{
        let elements = Object.fromEntries(Array.from(sidebar.children).map(x=>[x.dataset.id, x]))
        let ranges = ['1h', '24h', '7d', '30d']
        for (const id in x) {
            for (let i = 1; i < 5; i++) {
                elements[id].children[i].textContent = `${ranges[i]}: ${x[id]["price_change_percentage_" + ranges[i]]}%`
                elements[id].children[i].style = x[id]["price_change_percentage_" + ranges[i]] > 0 ? "color:#16c784;" : "color:#ea3943;"
            }
            elements[id].children[1].textContent = `1h: ${x[id].price_change_percentage_1h}%`
            elements[id].children[1].style = x[id].price_change_percentage_1h > 0 ? "color:#16c784;" : "color:#ea3943;"
            elements[id].children[2].textContent = `1d: ${x[id].price_change_percentage_24h}%`
            elements[id].children[2].style = x[id].price_change_percentage_24h > 0 ? "color:#16c784;" : "color:#ea3943;"
            elements[id].children[3].textContent = `7d: ${x[id].price_change_percentage_7d}%`
            elements[id].children[3].style = x[id].price_change_percentage_7d > 0 ? "color:#16c784;" : "color:#ea3943;"
            elements[id].children[4].textContent = `30d: ${x[id].price_change_percentage_30d}%`
            elements[id].children[4].style = x[id].price_change_percentage_30d > 0 ? "color:#16c784;" : "color:#ea3943;"
        }
    })
}
var currentPage
async function updatePage(id, name, ticker) {
    currentPage = Array.from(arguments)
    let price = await (await sfetch('api/getPrice?id=' + id, "GET")).text()
    document.getElementById('mainTitle').textContent = name + '/' + ticker + '\n$' + price
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
    let amt = inventory.assets[id] ?? 0
    balance.textContent = 'Your Balance: $' + cma(inventory.balance)
    let assetMenu = document.getElementById('assetMenu')
    assetMenu.childNodes[0].textContent = `${amt} ${ticker} ($${price * amt})`
    let currencySelect = document.getElementById('currencySelect')
    currencySelect.children[1].childNodes[1].textContent = ticker
}
async function loadInventory() {
    document.getElementById('mainTitle').textContent = "Portfolio"
    let inventoryContent = document.getElementById('inventoryView')
    let assetContent = document.getElementById('assetView')
    assetContent.style.display = 'none'
    if (inventoryContent.style.display === 'none') {
        inventoryContent.style.display = '';
    }
}
async function trade(sell) {
    let value = Number(document.getElementById('tradeActionText').value)
    if (!value) {
        return
    }
    updateSidebar(sidebarPage)
    let usd = document.querySelector('input[name="actionCurrency"]:checked').value;
    let amt = usd ? value / await (await sfetch('api/getPrice?id=' + currentPage[0], "GET")).text() : value
    sfetch('api/' + (sell ? 'sell' : 'buy'), "POST", {amount:amt,assetID:currentPage[0]})
    updatePage(...currentPage)
}
google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(draw);
let currentGraph = 0;
async function draw() {
    let graphElement = document.getElementById('graphElement')
    let history = await (await sfetch(`api/getPriceHistory?id=${currentPage[0]}&range=${currentGraph}`)).json()
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'Price');
     data.addRows([
        [0, 0],   [1, 10],  [2, 23],  [3, 17],  [4, 18],  [5, 9],
        [6, 11],  [7, 27],  [8, 33],  [9, 40],  [10, 32], [11, 35],
        [12, 30], [13, 40], [14, 42], [15, 47], [16, 44], [17, 48],
        [18, 52], [19, 54], [20, 42], [21, 55], [22, 56], [23, 57],
        [24, 60], [25, 50], [26, 52], [27, 51], [28, 49], [29, 53],
        [30, 55], [31, 60], [32, 61], [33, 59], [34, 62], [35, 65],
        [36, 62], [37, 58], [38, 55], [39, 61], [40, 64], [41, 65],
        [42, 63], [43, 66], [44, 67], [45, 69], [46, 69], [47, 70],
        [48, 72], [49, 68], [50, 66], [51, 65], [52, 67], [53, 70],
        [54, 71], [55, 72], [56, 73], [57, 75], [58, 70], [59, 68],
        [60, 64], [61, Math.random() * 700], [62, 65], [63, 67], [64, 68], [65, 69],
        [66, 70], [67, 72], [68, 75], [69, 80], [70, 800]
    ]);
    var options = {
        theme:'material',
        focusTarget:'category',
        hAxis: {
            title: 'Date'
        },
        vAxis: {
            title: 'Price'
        },
        legend:{
            position:'none'
        },
        width: graphElement.offsetWidth,
        height: graphElement.offsetHeight
    };
    var chart = new google.visualization.LineChart(graphElement);
    chart.draw(data, options);
}
window.onresize = function() {
  draw()
};
async function setUp() {
    if (!localStorage.getItem("session")) {
        localStorage.setItem("session", randStr(96));
    }
    document.getElementById("save-input").value = localStorage.getItem("session");
    document.getElementById("save-submit").addEventListener("click", () => {
        localStorage.setItem("session", document.getElementById("save-input").value);
    });
    updateSidebar(0)
    Array.from(document.getElementById("sidebarPagination").children).forEach((x, i)=>{
        x.addEventListener("click", () => {
            let num = i - 3
            sidebarPage += Math.sign(num) * 10 ** (Math.abs(num) - 1)
            if (sidebarPage < 0) {
                sidebarPage = 0
            }else if (sidebarPage > coinPageLimit) {
                sidebarPage = coinPageLimit;
            }
            updateSidebar(sidebarPage)
        })
    });
    Array.from(sidebar.children).forEach(x=>{
        x.addEventListener('click', function () {
            updatePage(this.dataset.id, ...this.childNodes[0].textContent.split('/'));
        });
    })
    Array.from(graphSelector.children).forEach((x,i)=>{
        x.addEventListener('click', function () {
            currentGraph = i
            updatePage(...currentPage);
        });
    })
    loadInventory()
}
setUp()