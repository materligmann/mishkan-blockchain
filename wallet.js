class Wallet {
  constructor() {
    this.keyPairs = [];
  }

  async generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048, // Length in bits (2048 is recommended)
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: "SHA-256", // Hash function to use
      },
      true, // Whether the key is extractable (i.e., can be used in exportKey)
      ["sign", "verify"] // Can be any combination of "sign" and "verify"
    );

    this.keyPairs.push(keyPair);

    return keyPair;
  }

  hexToArrayBuffer(hexString) {
    const byteArray = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return byteArray.buffer;
  }


  async exportKey(key) {
    const exported = await crypto.subtle.exportKey(
      key.type === "public" ? "spki" : "pkcs8",
      key
    );

    return exported;
  }

  async importPublicKey(hex) {
    const binaryDer = this.hexToArrayBuffer(hex);
    return crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-PSS",
        hash: "SHA-256"
      },
      true,
      ["verify"]
    );
  }

  async importPrivateKey(hex) {
    const binaryDer = this.hexToArrayBuffer(hex);
    return crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSA-PSS",
        hash: "SHA-256"
      },
      true,
      ["sign"]
    );
  }

  arrayBufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer);
    let hexString = "";
    for (let i = 0; i < byteArray.byteLength; i++) {
      const hex = byteArray[i].toString(16).padStart(2, "0");
      hexString += hex;
    }
    return hexString;
  }

  async signMessage(publicKey, message) {
    const encodedMessage = new TextEncoder().encode(message);
    console.log(this.keyPairs[0].publicKey);
    console.log(publicKey);
    const keyPair = this.keyPairs.find(
      (keyPair) => keyPair.publicKey === publicKey
    );
    if (keyPair) {
      const signature = await crypto.subtle.sign(
        {
          name: "RSA-PSS",
          saltLength: 32, // The length of the salt
        },
        keyPair.privateKey,
        encodedMessage
      );

      return signature;
    } else {
      throw new Error("Private key not found");
    }
  }

  async verifySignature(publicKey, message, signature) {
    const encodedMessage = new TextEncoder().encode(message);

    const isValid = await crypto.subtle.verify(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      publicKey,
      signature,
      encodedMessage
    );

    return isValid;
  }

  async getKeyPair() {
    const keyPair = await this.generateKeyPair();

    const publicKey = await this.exportKey(keyPair.publicKey);
    const privateKey = await this.exportKey(keyPair.privateKey);

    const publicKeyHex = this.arrayBufferToHex(publicKey);
    const privateKeyHex = this.arrayBufferToHex(privateKey);

    return keyPair;
  }

  arrayBufferToBase64(buffer) {
    const byteArray = new Uint8Array(buffer);
    let byteString = "";
    for (let i = 0; i < byteArray.byteLength; i++) {
      byteString += String.fromCharCode(byteArray[i]);
    }
    return btoa(byteString);
  }
}

module.exports = Wallet;
