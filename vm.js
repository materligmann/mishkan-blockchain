const crypto = require("crypto");

function hash(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

class VM {
  constructor() {
    this.stack = [];
    this.memory = {};
    this.pc = 0; // program counter
    this.functions = {};
    this.initialization = [];
    this.currentFunctionParams = [];
  }

  load(bytecode) {
    this.initialization = bytecode.initialization || [];
    for (let key in bytecode) {
      if (key !== "initialization") {
        this.functions[key] = bytecode[key];
      }
    }
  }

  deploy() {
    this.pc = 0;
    this.instructions = this.initialization;
    this.execute();
    return hash(JSON.stringify(this.instructions));
  }

  callFunction(index, args = []) {
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

  execute() {
    while (this.pc < this.instructions.length) {
      const instruction = this.instructions[this.pc];
      this.pc++;
      this.runInstruction(instruction);
    }
  }

  runInstruction(instruction) {
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
        const address = instruction.value;
        console.log("Loading", value, "in", instruction.value);
        if (this.memory[address] !== undefined) {
          this.stack.push(this.memory[address]);
        } else {
          throw new Error(`Variable ${address} not found in memory`);
        }
        break;
      case "STORE":
        const value = this.stack.pop();
        console.log("Storing", value, "in", instruction.value);
        const addressStore = instruction.value;
        this.memory[addressStore] = value;
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
