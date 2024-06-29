const TreeNode = require('./tree-node');
const crypto = require('crypto');

function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

class VerklePatriciaTree {
    constructor(db) {
        this.db = db;
        this.root = new TreeNode();  // Initialize root node
    }

    async getNode(hash) {
        try {
            const data = await this.db.get(hash);
            return TreeNode.deserialize(data);
        } catch (err) {
            if (err.notFound) {
                return null;
            }
            throw err;
        }
    }

    async putNode(node) {
        const nodeHash = hash(node.serialize());
        await this.db.put(nodeHash, node.serialize());
        return nodeHash;
    }

    async insert(key, value) {
        let currentNode = this.root;
        for (let char of key) {
            if (!currentNode.children[char]) {
                currentNode.children[char] = new TreeNode();
            }
            currentNode = currentNode.children[char];
        }
        currentNode.value = value;
        await this.putNode(this.root);  // Store the root node
    }

    async get(key) {
        let currentNode = this.root;
        for (let char of key) {
            if (!currentNode.children[char]) {
                return null;
            }
            currentNode = currentNode.children[char];
        }
        return currentNode.value;
    }

    async getRootHash() {
        return hash(this.root.serialize());
    }

    async prove(key) {
        // Implement proof generation logic
    }

    async verify(proof) {
        // Implement proof verification logic
    }
}

module.exports = VerklePatriciaTree;
