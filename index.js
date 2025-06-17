const http = require('http');//loads native node modules
const fs = require('fs');
const path = require('path');
const url = require('url');
const api = require('./api');//loads api folder as a module
const port = 3000;
global.assets = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "assets.json")))//sets up constants (crypto data)
global.assets = [Object.fromEntries(global.assets.map(arr => [arr[2], [...arr.slice(0, 2), ...arr.slice(3)]])), global.assets]
global.apiCache = {price:{},history:[{},{},{},{},{}],percent:{}}//sets up caching var
var apiIds = {price:[""],percent:[Object.keys(global.assets[0]).join(',')]}//sets up query param
{
    let ids = global.assets[1].map(x=>x[3])
    let i = 0;
    let amt = 0;
    let totalLength = 68
    for (let k = 0; k < ids.length; k++) {
        if (amt++ < 515 && totalLength + ids[k].length <= 8190) {
            apiIds.price[i] += ids[k] + ","
            totalLength += ids[k].length + 1;
        }else{
            apiIds.price[++i] = ""
            totalLength = 68
            amt = 0;
        }
    }
    apiIds.price = apiIds.price.map(x=>x.slice(0, -1))
}//creates second query param
function updateApi() {//polls api and puts res in cache
    for(let i = 0; i < apiIds.price.length; i++) {
        try{
            fetch("https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=" + apiIds.price[i]).then(x=>x.json()).then(x=>{
                for (const key in x) {
                    global.apiCache.price[key] = x[key].usd
                }
            })
        }catch(_){}
    }
    for(let i = 0; i < apiIds.percent.length; i++) {
        try{
            fetch("https://www.coingecko.com/coins/price_percentage_change?vs_currency=usd&ids=" + apiIds.percent[i]).then(x=>x.json()).then(x=>global.apiCache.percent=x)
        }catch(_){}
    }
}
updateApi()
setInterval(updateApi, 30000)//runs updateApi every 30s
http.createServer((req, res) => {//creates the http server
    let body = '';
    let parsedUrl = url.parse(req.url, true)
    var reqPath = parsedUrl.pathname.split("/").slice(1)
    var response;
    var headers;
    res.statusCode = 200;
    if (req.method == "GET") {//handles reqs by method
        if (reqPath[0] === "api") {//if api path
            let func = api.GET;
            for (let i = 1; i < reqPath.length; i++) {
                if (func) {
                    func = func[reqPath[i]]
                } else {
                    break
                }
            }
            if (typeof func === "function") {
                let session = req.headers.session
                func(res, session, parsedUrl.query)
            } else {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 404;
                res.end('{"error":true}')
            }//gets the specified function from api folder and runs it if it exists
        } else {
            var config;
            try {//gets page config
                config = JSON.parse(fs.readFileSync(path.join(__dirname, "pages", parsedUrl.pathname.slice(1) + ".json")));
            } catch (_) {}
            if (config?.page) {//if its whitelisted itll return the page
                response = fs.readFileSync(path.join(__dirname, "pages", parsedUrl.pathname.slice(1)));
                headers = config.headers;
            } else {
                res.statusCode = 302;
                headers = {
                    'Location': '/index.html'
                };
            }
            for (const k in headers) {
                res.setHeader(k, headers[k]);
            }
            res.end(response);
        }
    } else if (req.method == "POST") {
        req.on('data', (chunk) => {//gets the body since its a stream
            body += chunk;
        });
        req.on('end', () => {
            let func = api.POST;
            for (let i = 1; i < reqPath.length; i++) {
                if (func) {
                    func = func[reqPath[i]]
                } else {
                    break
                }
            }
            if (typeof func === "function") {
                let session = req.headers.session
                func(res, session, body)
            } else {
                res.setHeader("Content-Type", "application/json");
                res.statusCode = 404;
                res.end('{"error":true}')//error handing
            }//runs the specified function, same as above
        });
    } else {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 405;
        res.end('{"error":true}')//error handing
    }
}).listen(port);