class TreeNode {
    constructor(children = {}, value = null) {
        this.children = children;  // Dictionary of child nodes
        this.value = value;  // Value stored in the node (if it's a leaf)
    }

    serialize() {
        return JSON.stringify(this);
    }

    static deserialize(data) {
        const obj = JSON.parse(data);
        return new TreeNode(obj.children, obj.value);
    }
}

module.exports = TreeNode;