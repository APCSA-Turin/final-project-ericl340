async function getPriceHistory(res, session, query) {
    res.setHeader("Content-Type", "application/json");
    try {
        if (global.assets[0][query.id]) {
            query.range = query.range ? query.range % 5 : query.range
            let price = (await (await fetch(`https://www.coingecko.com/price_charts/${global.assets[0][query.id][2]}/usd/${['24_hours', '7_days', '30_days', '90_days', 'max'][query.range]}.json`)).json())
            res.end(JSON.stringify(price.stats))
            return
        }
    } catch(_) {}
    res.statusCode = 502;
    res.end('{"error":true}')
}
module.exports = getPriceHistory