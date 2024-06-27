class Miner {
    mine(block, blockchain) {
        let nonce = 0;
        let didMine = false;
        while (true) {
            if (blockchain.chain.length !== 0) {
                block.previousHash = blockchain.chain[blockchain.chain.length - 1].hash;
            }
            block.nonce = nonce;
            const hash = block.hash();
            console.log(hash.substring(0, blockchain.difficulty));
            if (hash.substring(0, blockchain.difficulty) === '0'.repeat(blockchain.difficulty)) {
                block.hash = hash;
                return block;
            }
            nonce++;
        }
    }
}

module.exports = Miner;