const crypto = require("crypto");
const StorageTree = require("./tree/storage-tree");

function hash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

class VM {
  constructor(accountTree, db) {
    this.stack = [];
    this.memory = {};
    this.pc = 0; // program counter
    this.functions = {};
    this.initialization = [];
    this.currentFunctionParams = [];
    this.bytecode = {};
    this.accountTree = accountTree;
    this.db = db;
  }

  load(bytecode) {
    this.bytecode = bytecode;
    this.contractAddress = hash(JSON.stringify(this.bytecode));
    this.storageTree = new StorageTree(this.db, this.contractAddress);
    this.storageTree.loadRoot();
    this.initialization = bytecode.initialization || [];
    for (let key in bytecode) {
      if (key !== "initialization") {
        this.functions[key] = bytecode[key];
      }
    }
  }

  async deploy() {
    this.pc = 0;
    this.instructions = this.initialization;
    this.execute();
    return this.contractAddress;
  }

  async callFunction(index, args = []) {
    const func = this.functions[index];
    if (!func) {
      throw new Error(`Function ${index} not found`);
    }
    this.pc = 0;
    this.stack = []; // Clear the stack before pushing new arguments
    for (let i = 0; i < args.length; i++) {
      this.memory[func.params[i]] = args[i];
    }
    this.currentFunctionParams = func.params;
    this.instructions = func.body;
    this.execute();
    return this.stack.pop(); // Return the result from the stack
  }

  async execute() {
    while (this.pc < this.instructions.length) {
      const instruction = this.instructions[this.pc];
      this.pc++;
      this.runInstruction(instruction);
    }
  }

  async runInstruction(instruction) {
    switch (instruction.opcode) {
      case "PUSH":
        this.stack.push(instruction.value);
        break;
      case "POP":
        this.stack.pop();
        break;
      case "PUSH_PARAM":
        if (this.memory[instruction.value] !== undefined) {
          this.stack.push(this.memory[instruction.value]);
        } else {
          throw new Error(`Parameter ${instruction.value} not found`);
        }
        break;
      case "LOAD":
        const loadKey = instruction.value;
        const storedValue = await this.storageTree.get(loadKey.toString());
        if (storedValue !== null) {
          this.stack.push(parseInt(storedValue, 10));
        } else {
          throw new Error(`Variable at key ${loadKey} not found in storage`);
        }
        break;
      case "STORE":
        const storeValue = this.stack.pop();
        const storeKey = instruction.value;
        await this.storageTree.insert(storeKey.toString(), storeValue.toString()); // Store in the tree

        console.log("Account Root " + (await this.storageTree.getRootHash()));
        break;
        break;
      case "PLUS":
        this.stack.push(this.stack.pop() + this.stack.pop());
        break;
      case "MINUS":
        this.stack.push(-this.stack.pop() + this.stack.pop());
        break;
      case "MULTIPLY":
        this.stack.push(this.stack.pop() * this.stack.pop());
        break;
      case "DIVIDE":
        const divisor = this.stack.pop();
        this.stack.push(this.stack.pop() / divisor);
        break;
      case "MODULO":
        const divisorMod = this.stack.pop();
        this.stack.push(this.stack.pop() % divisorMod);
        break;
      default:
        throw new Error(`Unknown opcode: ${instruction.opcode}`);
    }
  }
}

module.exports = VM;
