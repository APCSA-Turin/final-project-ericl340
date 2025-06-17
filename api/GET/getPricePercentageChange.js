async function getPricePercentageChange(res, _, query) {
    res.setHeader("Content-Type", "application/json");
    try {
        let price = {}
        let ids = query.ids.split(",")
        for (let i = 0; i < ids.length; i++) {
            price[ids[i]] = global.apiCache.percent[ids[i]]//gets frome cache
        }
        res.end(JSON.stringify(price))
        return
    } catch(_) {}
    res.statusCode = 502;
    res.end('{"error":true}')
}
module.exports = getPricePercentageChange