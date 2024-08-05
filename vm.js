const crypto = require("crypto");
const StorageTree = require("./tree/storage-tree");
const { parse } = require("path");

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
        const hashedValue = hash(dataToHash.toString());
        this.stack.push(hashedValue);
        break;
      case "LOAD":
        const loadKey = this.stack.pop();
        const storedValue = await this.storageTree.get(loadKey.toString());
        if (storedValue !== null) {
          this.stack.push(storedValue);
        } else {
          throw new Error(`Variable at key ${loadKey} not found in storage`);
        }
        break;
      case "STORE":
        const storeValue = this.stack.pop();
        const storeKey = this.stack.pop();
        console.log("Storing value in storage: ", storeKey.toString(), storeValue.toString());
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
        const left = this.from256BitWord(this.stack.pop());
        const right = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(left + right));
        break;
      case "SUBTRACT":
        const subLeft = this.from256BitWord(this.stack.pop());
        const subRight = this.from256BitWord(this.stack.pop());
        const result = subLeft - subRight;
        this.stack.push(this.to256BitWord(-subLeft + subRight));
        break;
      case "MULTIPLY":
        const leftMult = this.from256BitWord(this.stack.pop());
        const rightMult = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(leftMult * rightMult));
        break;
      case "DIVIDE":
        const divisor = this.from256BitWord(this.stack.pop());
        const dividend = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(dividend / divisor));
        break;
      case "MODULO":
        const divisorMod = this.from256BitWord(this.stack.pop());
        const dividendMod = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(dividendMod % divisorMod));
        break;
      case "AND":
        const andRight = this.from256BitWord(this.stack.pop());
        const andLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(andLeft && andRight));
        break;
      case "OR":
        const orRight = this.from256BitWord(this.stack.pop());
        const orLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(orLeft || orRight));
        break;
      case "EQUAL":
        const equalRight = this.from256BitWord(this.stack.pop());
        const equalLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(equalLeft === equalRight));
        break;
      case "NOT_EQUAL":
        const notEqualRight = this.from256BitWord(this.stack.pop());
        const notEqualLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(notEqualLeft !== notEqualRight));
        break;
      case "GREATER_THAN":
        const greaterThanRight = this.from256BitWord(this.stack.pop());
        const greaterThanLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(greaterThanLeft > greaterThanRight));
        break;
      case "LESS_THAN":
        const lessThanRight = this.from256BitWord(this.stack.pop());
        const lessThanLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(this.to256BitWord(lessThanLeft < lessThanRight));
        break;
      case "GREATER_THAN_EQUAL":
        const greaterThanEqualRight = this.from256BitWord(this.stack.pop());
        const greaterThanEqualLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(
          this.to256BitWord(greaterThanEqualLeft >= greaterThanEqualRight)
        );
        break;
      case "LESS_THAN_EQUAL":
        const lessThanEqualRight = this.from256BitWord(this.stack.pop());
        const lessThanEqualLeft = this.from256BitWord(this.stack.pop());
        this.stack.push(
          this.to256BitWord(lessThanEqualLeft <= lessThanEqualRight)
        );
        break;
      case "JUMP":
        this.pc = this.from256BitWord(this.stack.pop(), "number");
        break;
      case "JUMPI":
        const target = this.from256BitWord(this.stack.pop(), "number");
        const condition = this.from256BitWord(this.stack.pop(), "boolean");
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

    // Remove leading zeros (if any)
    let trimmedValue = value.replace(/^0+/, "") || "0";

    if (type === "boolean") {
      if (trimmedValue === "1") {
        return true;
      } else if (trimmedValue === "0") {
        return false;
      }
    }

    if (type === "number") {
      if (/^[0-9a-fA-F]+$/.test(trimmedValue)) {
        let numValue = BigInt("0x" + trimmedValue);
        // Check if the value represents a negative number in two's complement
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
        if (Number.isSafeInteger(Number(numValue))) {
          return Number(numValue);
        }
      }
    }

    // Check if the value is a boolean
    if (trimmedValue === "1") {
      return true;
    } else if (trimmedValue === "0") {
      return false;
    }

    // Check if the value is a number
    if (/^[0-9a-fA-F]+$/.test(trimmedValue)) {
      let numValue = BigInt("0x" + trimmedValue);
      // Check if the value represents a negative number in two's complement
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
      if (Number.isSafeInteger(Number(numValue))) {
        return Number(numValue);
      }
    }

    // Assume the value is a string
    let str = "";
    for (let i = 0; i < trimmedValue.length; i += 2) {
      str += String.fromCharCode(
        parseInt(trimmedValue.substring(i, i + 2), 16)
      );
    }
    return str;
  }

  to256BitWord(value) {
    if (typeof value === "boolean") {
      return value ? "1".padStart(64, "0") : "0".padStart(64, "0");
    } else if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new Error("Number is not a safe integer.");
      }
      let hexValue;
      if (value < 0) {
        hexValue = (
          BigInt(value) +
          BigInt(
            "0x10000000000000000000000000000000000000000000000000000000000000000"
          )
        ).toString(16);
      } else {
        hexValue = value.toString(16);
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
