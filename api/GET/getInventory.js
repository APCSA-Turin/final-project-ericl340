const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const dataFolder = path.join(__dirname, "..", "..", "data", "users")
function getInventory(res, session) {
    res.setHeader("Content-Type", "application/json");
    if (!session) {
        res.end('{"error":true}')
        return
    }
    const hash = crypto.createHash('sha512').update(session).digest('hex')//finds folder (sha512 hash)
    let filePath = path.join(dataFolder, hash + ".json")
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{"balance":10000,"assets":{}}')//sets up default inv
    }
    res.end(fs.readFileSync(filePath))
}
module.exports = getInventory