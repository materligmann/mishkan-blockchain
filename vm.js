const crypto = require("crypto");
const StorageTree = require("./tree/storage-tree");
const { parse } = require("path");
const res = require("express/lib/response");

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
    args = args.map((arg) => this.to256BitWord(arg));
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
        const hashedValue = hash(this.to256BitWord(dataToHash));
        console.log("Hashing", dataToHash, "to", hashedValue);
        this.stack.push(hashedValue);
        break;
      case "SLOAD":
        const loadKey = this.stack.pop();
        console.log("Loading from storage", loadKey);
        const storedValue = await this.storageTree.get(loadKey.toString());
        console.log("Stored value", storedValue);
        if (storedValue !== null) {
          this.stack.push(storedValue);
        } else {
          throw new Error(`Variable at key ${loadKey} not found in storage`);
        }
        break;
      case "SSTORE":
        const storeValue = this.stack.pop();
        const storeKey = this.stack.pop();
        console.log("Storing in storage", storeKey, storeValue);  
        await this.storageTree.insert(
          storeKey.toString(),
          storeValue
        );
        await this.accountTree.insert(
          this.contractAddress,
          await this.storageTree.getRootHash()
        );
        break;

      case "MLOAD":
        const mloadKey = this.stack.pop();
        if (this.memory[mloadKey] !== undefined) {
          this.stack.push(this.memory[mloadKey]);
          console.log("Loading from memory", mloadKey, this.memory[mloadKey]);
        } else {
          throw new Error(`Memory at key ${mloadKey} not found`);
        }
        break;
      case "MSTORE":
        const mstoreValue = this.stack.pop();
        const mstoreKey = this.stack.pop();
        this.memory[mstoreKey] = mstoreValue;
        break;
      case "ADD":
        const left = this.from256BitWord(this.stack.pop(), "bigint");
        const right = this.from256BitWord(this.stack.pop(), "bigint");
        console.log("Adding", left, right, "to", this.to256BitWord(left + right));
        this.stack.push(this.to256BitWord(left + right));
        break;
      case "SUBTRACT":
        const subLeft = this.from256BitWord(this.stack.pop(), "bigint");
        const subRight = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(-subLeft + subRight));
        break;
      case "MULTIPLY":
        const leftMult = this.from256BitWord(this.stack.pop(), "bigint");
        const rightMult = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(leftMult * rightMult));
        break;
      case "DIVIDE":
        const divisor = this.from256BitWord(this.stack.pop(), "number");
        const dividend = this.from256BitWord(this.stack.pop(), "number");
        const resultDiv = Math.ceil(dividend / divisor);
        console.log("Dividing", dividend, "by", divisor, "to", resultDiv);
        this.stack.push(this.to256BitWord(resultDiv));
        break;
      case "MODULO":
        const divisorMod = this.from256BitWord(this.stack.pop(), "bigint");
        const dividendMod = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(dividendMod % divisorMod));
        break;
      case "AND":
        const andRight = this.from256BitWord(this.stack.pop(), "bigint");
        const andLeft = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(andLeft && andRight));
        break;
      case "OR":
        const orRight = this.from256BitWord(this.stack.pop(), "bigint");
        const orLeft = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(orLeft || orRight));
        break;
      case "EQUAL":
        const equalRight = this.from256BitWord(this.stack.pop(), "bigint");
        const equalLeft = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(equalLeft === equalRight));
        break;
      case "NOT_EQUAL":
        const notEqualRight = this.from256BitWord(this.stack.pop(), "bigint");
        const notEqualLeft = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(notEqualLeft !== notEqualRight));
        break;
      case "GREATER_THAN":
        const greaterThanRight = this.from256BitWord(this.stack.pop(), "bigint");
        const greaterThanLeft = this.from256BitWord(this.stack.pop(), "bigint");
        console.log("Comparing", greaterThanLeft, ">", greaterThanRight , "to", greaterThanLeft > greaterThanRight);
        this.stack.push(this.to256BitWord(greaterThanLeft > greaterThanRight));
        break;
      case "LESS_THAN":
        const lessThanRight = this.from256BitWord(this.stack.pop(), "bigint");
        const lessThanLeft = this.from256BitWord(this.stack.pop(), "bigint");
        this.stack.push(this.to256BitWord(lessThanLeft < lessThanRight));
        break;
      case "GREATER_THAN_EQUAL":
        const greaterThanEqualRight = this.from256BitWord(this.stack.pop(), "bigint");
        const greaterThanEqualLeft = this.from256BitWord(this.stack.pop(), "bigint");
        const gteresult = greaterThanEqualLeft >= greaterThanEqualRight;
        this.stack.push(
          this.to256BitWord(gteresult)
        );
        break;
      case "LESS_THAN_EQUAL":
        const lessThanEqualRight = this.from256BitWord(this.stack.pop(), "bigint");
        const lessThanEqualLeft = this.from256BitWord(this.stack.pop(), "bigint");
        const lteresult = lessThanEqualLeft <= lessThanEqualRight;
        this.stack.push(
          this.to256BitWord(lteresult)
        );
        break;
      case "JUMP":
        console.log("Jumping to ===============================");
        const targetJump = this.stack.pop()
        this.pc = this.from256BitWord(targetJump, "number");
        break;
      case "JUMPI":
        const condition = this.from256BitWord(this.stack.pop(), "bigint");
        const target = this.from256BitWord(this.stack.pop(), "number");
        console.log("Jumping to", target, "if", condition) ;
        if (condition) {
        } else {
          this.pc = target;
        }
        break;
      default:
        throw new Error(`Unknown opcode: ${instruction.opcode}`);
    }
  }

  from256BitWord(value, type) {
    if (typeof value !== "string" || value.length !== 64) {
      throw new Error("Invalid 256-bit word");
    }
  
    let trimmedValue = value.replace(/^0+/, "") || "0";
  
    if (type === "boolean") {
      return trimmedValue === "1";
    }
  
    if (type === "number" || type === "bigint") {
      let numValue = BigInt("0x" + trimmedValue);
      if (
        numValue >=
        BigInt(
          "0x8000000000000000000000000000000000000000000000000000000000000000"
        )
      ) {
        numValue -= BigInt(
          "0x10000000000000000000000000000000000000000000000000000000000000000"
        );
      }
      return type === "number" ? Number(numValue) : numValue;
    }
  
    // Handle string case
    let str = "";
    for (let i = 0; i < trimmedValue.length; i += 2) {
      str += String.fromCharCode(parseInt(trimmedValue.substring(i, i + 2), 16));
    }
    return str;
  }

  to256BitWord(value) {
    console.log("to256BitWord", value);
    if (typeof value === "boolean") {
      return value ? "1".padStart(64, "0") : "0".padStart(64, "0");
    } else if (typeof value === "number" || typeof value === "bigint") {
      const bigIntValue = BigInt(value);
      let hexValue;
      if (bigIntValue < 0) {
        hexValue = (
          bigIntValue +
          BigInt(
            "0x10000000000000000000000000000000000000000000000000000000000000000"
          )
        ).toString(16);
      } else {
        hexValue = bigIntValue.toString(16);
      }
      return hexValue.padStart(64, "0");
    } else if (typeof value === "string") {
      let hex = "";
      for (let i = 0; i < value.length; i++) {
        hex += value.charCodeAt(i).toString(16).padStart(2, "0");
      }
      return hex.padStart(64, "0");
    } else {
      throw new Error("Unsupported type for to256BitWord");
    }
  }
}

module.exports = VM;
