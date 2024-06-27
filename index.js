const Block = require('./block');
const Blockchain = require('./blockchain');
const Miner = require('./miner');
const Compiler = require('./compiler/compiler');
const VM = require('./vm');
const Wallet = require('./wallet');

const blockchain = new Blockchain();
const miner = new Miner();


const block = new Block("Genesis Block");

miner.mine(block, blockchain);

blockchain.addBlock(block);

const blockOne = new Block("Block 1");

miner.mine(blockOne, blockchain);

blockchain.addBlock(blockOne);

console.log(blockchain.chain);

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

console.log(instructions);

const vm = new VM();
vm.load(instructions);

// Deploy the contract (execute initialization code)
vm.deploy();

// Check initial memory state after deployment
console.log(vm.memory); // Outputs: { a: 7, b: 17 }

// Execute the 'add' function (index 2) with arguments 5 and 10 and return the result
const addResult = vm.callFunction(2, [5, 10]);
console.log('add result:', addResult); // Outputs: 15

// Execute the 'subtract' function (index 3) with arguments 5 and 10 and return the result
const subtractResult = vm.callFunction(3, [5, 10]);
console.log('subtract result:', subtractResult); // Outputs: -5

// Execute the 'multiply' function (index 4) with arguments 5 and 10 and return the result
const multiplyResult = vm.callFunction(4, [5, 10]);
console.log('multiply result:', multiplyResult); // Outputs: 50

// Execute the 'divide' function (index 5) with arguments 10 and 5 and return the result
const divideResult = vm.callFunction(5, [10, 5]);
console.log('divide result:', divideResult); // Outputs: 2

// Execute the 'modulo' function (index 6) with arguments 10 and 3 and return the result
const moduloResult = vm.callFunction(6, [10, 3]);
console.log('modulo result:', moduloResult); // Outputs: 1

const wallet = new Wallet();

main();

async function main() {
    const keyPair = await wallet.generateKeyPair();

    console.log("Public Key:", keyPair.publicKey);
    console.log("Private Key:", keyPair.privateKey);

    const publicKey = await exportKey(keyPair.publicKey);
    const privateKey = await exportKey(keyPair.privateKey);

    const publicKeyBase64 = arrayBufferToHex(publicKey);
    const privateKeyBase64 = arrayBufferToHex(privateKey);

    console.log("Hex Public Key:", publicKeyBase64);
    console.log("Hex Private Key:", privateKeyBase64);
};

function arrayBufferToBase64(buffer) {
    const byteArray = new Uint8Array(buffer);
    let byteString = "";
    for (let i = 0; i < byteArray.byteLength; i++) {
        byteString += String.fromCharCode(byteArray[i]);
    }
    return btoa(byteString);
}

function arrayBufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer);
    let hexString = "";
    for (let i = 0; i < byteArray.byteLength; i++) {
        const hex = byteArray[i].toString(16).padStart(2, '0');
        hexString += hex;
    }
    return hexString;
}

async function exportKey(key) {
    const exported = await crypto.subtle.exportKey(
        key.type === "public" ? "spki" : "pkcs8",
        key
    );

    return exported;
}