require("dotenv").config();
const Block = require("./block");
const Blockchain = require("./blockchain");
const Miner = require("./miner");
const Compiler = require("./compiler/compiler");
const VM = require("./vm");
const Wallet = require("./wallet");
const Action = require("./action");
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
        const db = new Level(__dirname + "/db/state", { valueEncoding: "json" });
        const accountTree = new AccountTree(db);
        const vm = new VM(accountTree, db);
        await vm.load(bytecode);
        const address = await vm.deploy();
        res.send({ address: address });
    } catch (error) {
      console.log(error)
        res.status(500).send({ error: error.message });
    }
});

app.post('/call-function', async (req, res) => {
    try {
        const { address, index, args } = req.body;
        const db = new Level(__dirname + "/db/state", { valueEncoding: "json" });
        const accountTree = new AccountTree(db);
        const vm = new VM(accountTree, db);
        await vm.load({ address: address });
        const result = await vm.callFunction(index, args);
        res.send({ result: result });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});


async function main() {
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
  var a: number = 7
  var b: number = 17

  func read() -> number {
    return a
  }

  func write(c: number) {
    b = c
  }

  func readTwo() {
    return b
  }

  func add(e: number, d: number) -> number {
    return e + d
  }

  func substract(e: number, d: number) -> number {
    return e - d
  }

  func multiply(e: number, d: number) -> number {
    return e * d
  }

  func divide(e: number, d: number) -> number {
    return e / d
  }

  func modulo(e: number, d: number) -> number {
    return e % d
  }
}
`;

  const instructions = compiler.compile(code);

  //console.log(instructions);

  // ---------------------------------  Tree

  const db = new Level(__dirname + "/db/state", { valueEncoding: "json" });

  db.open((err) => {
    if (err) {
      console.error('Failed to open the database', err);
    } else {
      //console.log('Database is open');
      // Your code to perform database operations goes here
    }
  });

  const accountTree = new AccountTree(db);
  await accountTree.loadRoot();

  await accountTree.insert("key5", "value3");

  //console.log("Account Root " + (await accountTree.getRootHash()));

  const vm = new VM(accountTree, db);
  await vm.load(instructions);

  // Deploy the contract (execute initialization code)
  const contractAddress = await vm.deploy();

  // Execute 'write' function (index 1) with argument 10
 //

  // Execute 'readTwo' function (index 2) and log the result
  const readRes = await vm.callFunction(2);
  //console.log("Root account hash " + await accountTree.getRootHash());

  await vm.callFunction(1, [11]);

  //console.log("Root account hash " + await accountTree.getRootHash());




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

  const wallet = new Wallet();

  const keyPair = await wallet.getKeyPair();

  const action = new Action("mathias", "contract", "my action");
  const signature = await wallet.signMessage(keyPair.publicKey, action);
  const signatureHex = wallet.arrayBufferToHex(signature);
  //console.log(signatureHex);
  action.signature = signatureHex;

  const publicKeyHex = wallet.arrayBufferToHex(
    await wallet.exportKey(keyPair.publicKey)
  );
  const importedPublicKey = await wallet.importPublicKey(publicKeyHex);

  const isValid = await wallet.verifySignature(
    importedPublicKey,
    action,
    signature
  );
  //console.log("Is the signature valid?", isValid);

  // Close the database
  db.close();
}

main();
