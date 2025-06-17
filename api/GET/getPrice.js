async function getPrice(res, _, query) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    try {
        if (global.apiCache.price[global.assets[0][query.id][2]]) {
            res.end(String(global.apiCache.price[global.assets[0][query.id][2]]))//gets from cache
        }else {
            let price = (await (await fetch(`https://www.coingecko.com/price_charts/${global.assets[0][query.id][2]}/usd/24_hours.json`)).json()).stats.at(-1)[1]
            res.end(String(price))
            global.apiCache.price[global.assets[0][query.id][2]] = price
        }
    } catch(_) {
    res.statusCode = 502;
        res.end("error")
    }
}
module.exports = getPrice