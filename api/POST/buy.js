const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const dataFolder = path.join(__dirname, "..", "..", "data", "users")
function buy(res, session, body) {
    res.setHeader("Content-Type", "application/json");
    if (!session) {
        res.statusCode = 401
        res.end('{"error":true}')
        return
    }
    const hash = crypto.createHash('sha512').update(session).digest('hex')
    let filePath = path.join(dataFolder, hash + ".json")
    if (fs.existsSync(filePath)) {
        let data = JSON.parse(fs.readFileSync(filePath))
        try {
            var reqData = JSON.parse(body)
        }catch(_){
            res.statusCode = 400;
            res.end('{"error":true}')
        }
        let price = global.apiCache.price[global.assets[0][reqData.assetID][2]]
        let cost = reqData.amount * price
        if (reqData.amount > 0 && data.balance >= cost) {
            if (!data.assets[reqData.assetID]) {
                data.assets[reqData.assetID] = [...global.assets[0][reqData.assetID].slice(0, -2), 0]
            }
            data.assets[reqData.assetID][2] += reqData.amount
            data.balance -= cost
            fs.writeFileSync(filePath, JSON.stringify(data))
            res.end('{"success":true}')
        }else{
            res.end('{"success":false}')
        }
    }else{
        res.statusCode = 404
        res.end('{"error":true}')
    }
}
module.exports = buy