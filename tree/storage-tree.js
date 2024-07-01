const TreeNode = require('./tree-node');
const crypto = require('crypto');

function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

class StorageTree {
    constructor(db, contractAddress) {
        this.db = db;
        this.root = new TreeNode();  // Initialize root node
        this.contractAddress = contractAddress;
    }

    async loadRoot() {
        try {
            const data = await this.db.get(this.contractAddress + ':storageroot');
            this.root = TreeNode.deserialize(data);
        } catch (err) {
            if (err.notFound) {
                console.log('No existing root node found');
                this.root = new TreeNode();  // No existing root, initialize a new one
            } else {
                throw err;
            }
        }
    }

    async saveRoot() {
        await this.db.put(this.contractAddress + ':storageroot', this.root.serialize());
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
        await this.putNode(this.root);
        await this.saveRoot();  // Store the root node
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

module.exports = StorageTree;
