require("dotenv").config();
const Block = require("./block");
const Blockchain = require("./blockchain");
const Miner = require("./miner");
const Compiler = require("./compiler/compiler");
const VM = require("./vm");
const Wallet = require("./wallet");
const Transaction = require("./transaction");
const AccountTree = require("./tree/account-tree");
const { Level } = require("level");
const express = require("express");
const cors = require("cors");
var bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

const db = new Level(__dirname + "/db/state", { valueEncoding: "json" });

async function openDatabase() {
  return new Promise((resolve, reject) => {
    db.open((err) => {
      if (err) {
        console.error('Failed to open the database', err);
        reject(err);
      } else {
        console.log('Database is open');
        resolve();
      }
    });
  });
}

app.get('/status', (req, res) => {
    try {
        return res.json({ code: 0 });
    } catch (error) {
        console.error(error);
        return res.json({ code: 1 });
    }
});

app.post('/upload-bytecode', async (req, res) => {
    try {
        const bytecode = req.body;
        const bytecodeString = JSON.stringify(bytecode, replacer, 2);
        console.log("instruction from remote " + bytecodeString)
        const accountTree = new AccountTree(db);
        const vm = new VM(accountTree, db);
        await vm.load(bytecode);
        const address = await vm.deploy();
        res.send({ code: 0, address: address });
    } catch (error) {
      console.log(error)
        res.status(500).send({ code: 2 });
    }
});

app.post('/call-function', async (req, res) => {
    try {
        const { address, index, args } = req.body;
        const accountTree = new AccountTree(db);
        const vm = new VM(accountTree, db);
        const bytecode = await vm.getBytecode(address);
        console.log("call function" + bytecode)
        await vm.load(bytecode);
        const result = await vm.callFunction(index, args);
        console.log("result" + result)
        if (result !== undefined) {
            return res.send({ code: 0, result: [from256BitWord(result)] });
        } else {
            return res.send({ code: 0 });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).send({ code: 1 });
    }
});

app.post('/brodacast-transaction', async (req, res) => {
    try {
        
    } catch (error) {
        console.log(error)
        return res.status(500).send({ code: 2 });
    }
});

app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});


async function main() {
  await openDatabase();
  //--------------------------------- Blockchain

  const blockchain = new Blockchain();
  const miner = new Miner();

  const block = new Block("Genesis Block");

  miner.mine(block, blockchain);

  blockchain.addBlock(block);

  const blockOne = new Block("Block 1");

  miner.mine(blockOne, blockchain);

  blockchain.addBlock(blockOne);

  //console.log(blockchain.chain);

  // --------------------------------- Compiler

  const compiler = new Compiler();
  const code = `
contract MyContract {
  var first: Int = 7
  var second: Int = 17

  mapping(address => Int) userBalance
  mapping(address => mapping(address => Int)) nestedMapping
  mapping(address => mapping(address => mapping(address => Int))) nestedMapping2

  func setNestedMapping2(key1: address, key2: address, key3: address, value: Int) {
    nestedMapping2[key1][key2][key3] = value
  }

  func getNestedMapping2(key1: address, key2: address, key3: address) -> Int {
    return nestedMapping2[key1][key2][key3]
  }

  func setNestedMapping(key1: address, key2: address, value: Int) {
    nestedMapping[key1][key2] = value
  }

  func getNestedMapping(key1: address, key2: address) -> Int {
    return nestedMapping[key1][key2]
  }

  func setBalance(key: address, value: Int) {
    userBalance[key] = value
  }

  func getBalance(key: address) -> Int {
    return userBalance[key]
  }

  func readFirst() -> Int {
    return first
  }

  func write(c: Int) {
    second = c
  }

  func readSecond() {
    return second
  }

  func add(e: Int, d: Int) -> Int {
    return e + d
  }

  func substract(e: Int, d: Int) -> Int {
    return e - d
  }

  func multiply(e: Int, d: Int) -> Int {
    return e * d
  }

  func divide(e: Int, d: Int) -> Int {
    return e / d
  }

  func modulo(e: Int, d: Int) -> Int {
    return e % d
  }

  func and(g: Bool, h: Bool) -> Bool {
    return g && h
  }

  func or(i: Bool, j: Bool) -> Bool {
    return i || j
  }

  func assignBinary(o: Int, n: Int) {
    second = o + n
  }

  func assignNumber() {
    second = 10
  }

  func assignBinaryWithNumber(p: Int) {
    second = p + 16
  }

  func incrementSecond() {
    second = second + 1
  }

  func equal(a: Int, b: Int) -> Bool {
    return a == b
  }

  func notEqual(a: Int, b: Int) -> Bool {
    return a != b
  }

  func greaterThan(a: Int, b: Int) -> Bool {
    return a > b
  }
  
  func lessThan(a: Int, b: Int) -> Bool {
    return a < b
  }

  func greaterThanEqual(a: Int, b: Int) -> Bool {
    return a >= b
  }

  func lessThanEqual(a: Int, b: Int) -> Bool {
    return a <= b
  }

  func impbricated() -> Bool {
   return second % 2 == 0
  }

  func impbricated2() -> Bool {
   return 0 == second % 2 
  }
}
`;
  const instructions = compiler.compile(code);

  // ---------------------------------  Tree

  const accountTree = new AccountTree(db);
  await accountTree.loadRoot();

  await accountTree.insert("key5", "value3");

  const vm = new VM(accountTree, db);
  await vm.load(instructions);

  // Deploy the contract (execute initialization code)
  const contractAddress = await vm.deploy();

  const bytecode = await vm.getBytecode(contractAddress);

  const bytecodeString = JSON.stringify(bytecode, replacer, 2);
  console.log("instruction from local " + bytecodeString);

  console.log("function 0")
  await vm.callFunction(0, ["0xABC...123", "0xABC...124", "0xABC...125", 500]);
  console.log("Nested Mapping set for 0xABC...123, 0xABC...124 and 0xABC...125");

  console.log("function 1")
  const nestedMapping2 = await vm.callFunction(1, ["0xABC...123", "0xABC...124", "0xABC...125"]);
  console.log("Nested Mapping retrieved for 0xABC...123, 0xABC...124 and 0xABC...125:", from256BitWord(nestedMapping2));

  console.log("function 2")
  await vm.callFunction(2, ["0xABC...123", "0xABC...124", 1000]);
  console.log("Nested Mapping set for 0xABC...123 and 0xABC...124");

  console.log("function 3")
  const nestedMapping = await vm.callFunction(3, ["0xABC...123", "0xABC...124"]);
  console.log("Nested Mapping retrieved for 0xABC...123 and 0xABC...124:", from256BitWord(nestedMapping));

  console.log("function 4")
  await vm.callFunction(4, ["0xABC...123", 1001]);
  console.log("Balance set for 0xABC...123");

  console.log("function 5")
  const balance = await vm.callFunction(5, ["0xABC...123"]);
  console.log("Balance retrieved for 0xABC...123:", from256BitWord(balance));

  console.log("function 6")
  const readA = await vm.callFunction(6);
  console.log("read result:", from256BitWord(readA)); // Outputs: 7

  console.log("function 7")
  const readSecond = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readSecond)); // Outputs: 17

  console.log("function 8")
  await vm.callFunction(7, [10]);
  console.log("writed 10"); // Outputs: 10

  console.log("function 9")
  const readC = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readC)); // Outputs: 10

  console.log("function 10")
  const addResult = await vm.callFunction(9, [5, 10]);
  console.log("add result:", from256BitWord(addResult)); // Outputs: 15

  console.log("function 11")
  const subResult = await vm.callFunction(10, [5, 10]); 
  console.log("substract result:", from256BitWord(subResult)); // Outputs: -5

  console.log("function 12")
  const mulResult = await vm.callFunction(11, [5, 10]); 
  console.log("multiply result:", from256BitWord(mulResult)); // Outputs: 50

  console.log("function 13")
  const divResult = await vm.callFunction(12, [10, 5]);
  console.log("divide result:", from256BitWord(divResult)); // Outputs: 2

  console.log("function 14")
  const modResult = await vm.callFunction(13, [10, 3]);
  console.log("modulo result:", from256BitWord(modResult, "number")); // Outputs: 1

  console.log("function 15")
  const andResult = await vm.callFunction(14, [true, false]);
  console.log("and result:", from256BitWord(andResult)); // Outputs: false

  console.log("function 16")
  const orResult = await vm.callFunction(15, [true, false]);
  console.log("or result:", from256BitWord(orResult)); // Outputs: true

  console.log("function 17")
  await vm.callFunction(16, [5, 16]);
  console.log("assignBinary result");

  console.log("function 18")
  const readAssignBinary = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readAssignBinary)); // Outputs: 15

  console.log("function 19")
  await vm.callFunction(17);

  console.log("function 20")
  const readAssignNumber = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readAssignNumber)); // Outputs: 10

  console.log("function 21")
  await vm.callFunction(18, [5]);
  
  console.log("function 22")
  const readAssignNumberBinary = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readAssignNumberBinary)) // Outputs: 21

  console.log("function 23")
  await vm.callFunction(19);

  console.log("function 24")
  const readIncrementSecond = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readIncrementSecond)); // Outputs: 22

  console.log("function 25")
  const equalResult = await vm.callFunction(20, [5, 5]);
  console.log("equal result:", from256BitWord(equalResult)); // Outputs: true

  console.log("function 26")
  const notEqualResult = await vm.callFunction(21, [5, 5]);
  console.log("not equal result:", from256BitWord(notEqualResult)); // Outputs: false

  console.log("function 27")
  const greaterThanResult = await vm.callFunction(22, [5, 5]);
  console.log("greater than result:", from256BitWord(greaterThanResult)); // Outputs: false 

  console.log("function 28")
  const lessThanResult = await vm.callFunction(23, [5, 5]);
  console.log("less than result:", from256BitWord(lessThanResult)); // Outputs: false

  console.log("function 29")
  const greaterThanEqualResult = await vm.callFunction(24, [5, 5]);
  console.log("greater than equal result:", from256BitWord(greaterThanEqualResult)); // Outputs: true

  console.log("function 30")
  const lessThanEqualResult = await vm.callFunction(25, [5, 5]);
  console.log("less than equal result:", from256BitWord(lessThanEqualResult)); // Outputs: true

  console.log("function 31")
  const readSecond2 = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readSecond2));

  console.log("function 32")
  const impbricatedResult = await vm.callFunction(26);
  console.log("impbricated result:", from256BitWord(impbricatedResult)); // Outputs: true

  console.log("function 33")
  const impbricatedResult2 = await vm.callFunction(27);
  console.log("impbricated2 result:", from256BitWord(impbricatedResult2)); // Outputs: true

  console.log("function 34")
  await vm.callFunction(19);

  console.log("function 35")
  const readSecond3 = await vm.callFunction(8);
  console.log("read result:", from256BitWord(readSecond3));

  console.log("function 36")
  const impbricatedResult3 = await vm.callFunction(26);
  console.log("impbricated result:", from256BitWord(impbricatedResult3)); // Outputs: false

  console.log("function 37")
  const impbricatedResult4 = await vm.callFunction(27);
  console.log("impbricated2 result:", from256BitWord(impbricatedResult4)); // Outputs: false


  //const readRes1 = await vm.callFunction(2);
  //console.log("read result:", readRes1); // Outputs: 10
  // Execute 'write' function (index 1) with argument 10
  //await vm.callFunction(1, [10]);
  //console.log("writed 10"); // Outputs: 10

  // Execute 'readTwo' function (index 2) and log the result
  //const readRes2 = await vm.callFunction(2);
  //console.log("read result:", readRes2); // Outputs: 10

  //await vm.callFunction(1, [11]);

  //console.log("Root account hash " + await accountTree.getRootHash());

 /*  await vm.callFunction('0', ['0xABC...123', 1000]);
  console.log('Balance set for 0xABC...123');

  const balance = await vm.callFunction('1', ['0xABC...123']);
  console.log('Balance retrieved for 0xABC...123:', balance); */

  
  // Stringify the bytecode object with indentation
  //const bytecodeString = JSON.stringify(instructions, replacer, 2);
  
  // Display the full bytecode in the console
  //console.log(bytecodeString);


  // Execute the 'add' function (index 2) with arguments 5 and 10 and return the result
  //const addResult = await vm.callFunction(3, [5, 10]);
  //console.log("add result:", addResult); // Outputs: 15

  // Execute the 'subtract' function (index 3) with arguments 5 and 10 and return the result
  //const subtractResult = vm.callFunction(4, [5, 10]);
  //console.log("subtract result:", subtractResult); // Outputs: -5

  // Execute the 'multiply' function (index 4) with arguments 5 and 10 and return the result
  //const multiplyResult = vm.callFunction(5, [5, 10]);
  //console.log("multiply result:", multiplyResult); // Outputs: 50

  // Execute the 'divide' function (index 5) with arguments 10 and 5 and return the result
  //const divideResult = await vm.callFunction(6, [10, 5]);
  //console.log("divide result:", divideResult); // Outputs: 2

  // Execute the 'modulo' function (index 6) with arguments 10 and 3 and return the result
  //const moduloResult = await vm.callFunction(7, [10, 3]);
  //console.log("modulo result:", moduloResult); // Outputs: 1

  const instructions2 = {
    initialization: [
      { opcode: 'PUSH', value: 7 },     // Push value 7
      { opcode: 'PUSH', value: 0 },     // Push storage slot 0
      { opcode: 'STORE' },              // Store value 7 at slot 0
      { opcode: 'PUSH', value: 17 },    // Push value 17
      { opcode: 'PUSH', value: 1 },     // Push storage slot 1
      { opcode: 'STORE' },              // Store value 17 at slot 1
    ],
    functions: {
      '0': {
        params: ['key', 'value'],
        body: [
          { opcode: 'PUSH_PARAM', value: 'key' }, // Push the key onto the stack
          { opcode: 'HASH256' }, // Hash the key
          { opcode: 'PUSH_PARAM', value: 'value' }, // Push the value onto the stack
          { opcode: 'STORE' }, // Store the value at the hashed key
        ],
      },
      '1': {
        params: ['key'],
        body: [
          { opcode: 'PUSH_PARAM', value: 'key' }, // Push the key onto the stack
          { opcode: 'HASH256' }, // Hash the key
          { opcode: 'LOAD' }, // Load the value from the hashed key
        ],
      },
    }
  }

  const instructions3 = {
    "initialization": [
      {
        "opcode": "PUSH",
        "value": 7
      },
      {
        "opcode": "PUSH",
        "value": 0
      },
      {
        "opcode": "STORE"
      },
      {
        "opcode": "PUSH",
        "value": 17
      },
      {
        "opcode": "PUSH",
        "value": 1
      },
      {
        "opcode": "STORE"
      }
    ],
    "functions": {
      "0": {
        "params": [],
        "body": [
          {
            "opcode": "PUSH",
            "value": 0
          },
          {
            "opcode": "LOAD"
          }
        ]
      },
      "1": {
        "params": [
          "c"
        ],
        "body": [
          {
            "opcode": "PUSH_PARAM",
            "value": "c"
          },
          {
            "opcode": "PUSH",
            "value": 1
          },
          {
            "opcode": "STORE"
          }
        ]
      },
      "2": {
        "params": [],
        "body": [
          {
            "opcode": "PUSH",
            "value": 1
          },
          {
            "opcode": "LOAD"
          }
        ]
      },
      "3": {
        "params": [
          "e",
          "d"
        ],
        "body": [
          {
            "opcode": "PUSH_PARAM",
            "value": "e"
          },
          {
            "opcode": "PUSH_PARAM",
            "value": "d"
          },
          {
            "opcode": "ADD"
          }
        ]
      },
      "4": {
        "params": [
          "e",
          "d"
        ],
        "body": [
          {
            "opcode": "PUSH_PARAM",
            "value": "e"
          },
          {
            "opcode": "PUSH_PARAM",
            "value": "d"
          },
          {
            "opcode": "SUBTRACT"
          }
        ]
      },
      "5": {
        "params": [
          "e",
          "d"
        ],
        "body": [
          {
            "opcode": "PUSH_PARAM",
            "value": "e"
          },
          {
            "opcode": "PUSH_PARAM",
            "value": "d"
          },
          {
            "opcode": "MULTIPLY"
          }
        ]
      },
      "6": {
        "params": [
          "e",
          "d"
        ],
        "body": [
          {
            "opcode": "PUSH_PARAM",
            "value": "e"
          },
          {
            "opcode": "PUSH_PARAM",
            "value": "d"
          },
          {
            "opcode": "DIVIDE"
          }
        ]
      },
      "7": {
        "params": [
          "e",
          "d"
        ],
        "body": [
          {
            "opcode": "PUSH_PARAM",
            "value": "e"
          },
          {
            "opcode": "PUSH_PARAM",
            "value": "d"
          },
          {
            "opcode": "MODULO"
          }
        ]
      }
    }
  }

  const wallet = new Wallet();

  const keyPair = await wallet.getKeyPair();

  const transaction = new Transaction("mathias", "contract", "my Transaction");
  const signature = await wallet.signMessage(keyPair.publicKey, Transaction);
  const signatureHex = wallet.arrayBufferToHex(signature);
  //console.log(signatureHex);
  transaction.signature = signatureHex;

  const publicKeyHex = wallet.arrayBufferToHex(
    await wallet.exportKey(keyPair.publicKey)
  );
  const importedPublicKey = await wallet.importPublicKey(publicKeyHex);

  const isValid = await wallet.verifySignature(
    importedPublicKey,
    Transaction,
    signature
  );
  //console.log("Is the signature valid?", isValid);

  // Close the database
}

main();

function replacer(key, value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value;
}

function from256BitWord(value, type) {
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
      if (numValue >= BigInt("0x8000000000000000000000000000000000000000000000000000000000000000")) {
        numValue -= BigInt("0x10000000000000000000000000000000000000000000000000000000000000000");
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
    if (numValue >= BigInt("0x8000000000000000000000000000000000000000000000000000000000000000")) {
      numValue -= BigInt("0x10000000000000000000000000000000000000000000000000000000000000000");
    }
    if (Number.isSafeInteger(Number(numValue))) {
      return Number(numValue);
    }
  }

  // Assume the value is a string
  let str = "";
  for (let i = 0; i < trimmedValue.length; i += 2) {
    str += String.fromCharCode(parseInt(trimmedValue.substring(i, i + 2), 16));
  }
  return str;
}