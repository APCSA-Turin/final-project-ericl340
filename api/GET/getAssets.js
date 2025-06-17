function getAssets(res, _, query) {
    res.setHeader("Content-Type", "application/json");
    query.page = Number(query.page)
    if (Number.isFinite(query.page)) {//gets from consts
        res.end(JSON.stringify(global.assets[1].slice(query.page * 10, query.page * 10 + 10).map(x=>x.slice(0, 3))))
    }else {
        res.statusCode = 400
        res.end('{"error":true}')
    }
}
module.exports = getAssets