
const crypto = require('crypto');

class Block {
    constructor(data) {
        this.timestamp = Date.now();
        this.previousHash = "";
        this.nonce = 0;
        this.data = data;
    }

    hash() {
        return crypto.createHash('sha256').update(this.timestamp + this.previousHash + this.nonce).digest('hex');
    }
}

module.exports = Block;