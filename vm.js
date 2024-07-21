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

  async load(bytecode) {
    this.bytecode = bytecode;
    const adress = hash(JSON.stringify(this.bytecode));
    this.contractAddress = adress;
    this.storageTree = new StorageTree(this.db, this.contractAddress);
    await this.storageTree.loadRoot();
    this.initialization = bytecode.initialization || [];
    for (let key in bytecode.functions) {
      this.functions[key] = bytecode.functions[key];
    }
  }

  async getBytecode(address) {
    await this.accountTree.loadRoot();
    const bytecode = await this.accountTree.get(address + ":bytecode");
    return bytecode;
  }

  async deploy() {
    this.accountTree.insert(this.contractAddress + ":bytecode", this.bytecode);
    this.pc = 0;
    this.instructions = this.initialization;
    await this.execute();
    return this.contractAddress;
  }

  async callFunction(index, args = []) {
    const func = this.functions[index];
    if (!func) {
      throw new Error(`Function ${index} not found`);
    }
    this.pc = 0;
    this.stack = [];
    for (let i = 0; i < args.length; i++) {
      this.memory[func.params[i]] = args[i];
    }
    this.currentFunctionParams = func.params;
    this.instructions = func.body;
    await this.execute();
    return this.stack.pop();
  }

  async execute() {
    while (this.pc < this.instructions.length) {
      const instruction = this.instructions[this.pc];
      this.pc++;
      await this.runInstruction(instruction);
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
          console.log(this.memory);
          throw new Error(`Parameter ${instruction.value} not found`);
        }
        break;
      case "HASH256":
        const dataToHash = this.stack.pop();
        const hashedValue = hash(dataToHash.toString());
        console.log(`Hashing value ${dataToHash} to ${hashedValue}`);
        this.stack.push(hashedValue);
        break;
      case "LOAD":
        const loadKey = this.stack.pop();
        const storedValue = await this.storageTree.get(loadKey.toString());
        console.log(`Loading value ${storedValue} at key ${loadKey}`);
        if (storedValue !== null) {
          this.stack.push(parseInt(storedValue, 10));
        } else {
          throw new Error(`Variable at key ${loadKey} not found in storage`);
        }
        break;
      case "STORE":
        const storeValue = this.stack.pop();
        const storeKey = this.stack.pop();
        console.log(`Storing value ${storeValue} at key ${storeKey}`);
        await this.storageTree.insert(
          storeKey.toString(),
          storeValue.toString()
        );
        await this.accountTree.insert(
          this.contractAddress,
          await this.storageTree.getRootHash()
        );
        break;
      case "ADD":
        this.stack.push(this.stack.pop() + this.stack.pop());
        break;
      case "SUBTRACT":
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
