const Block = require('./block');
const crypto = require('crypto');

class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 0;
    }

    addBlock(block) {
        if (block.hash === crypto.createHash('sha256').update(block.timestamp + block.previousHash + block.nonce).digest('hex') &&
            block.hash.substring(0, this.difficulty) === '0'.repeat(this.difficulty)) {
                if (this.chain.length === 0) {
                    if (block.previousHash === "") {
                        this.chain.push(block);
                    }
                } else {
                    if (block.previousHash === this.chain[this.chain.length - 1].hash) {
                        this.chain.push(block);
                    }
                }
        }
    }
}

module.exports = Blockchain;