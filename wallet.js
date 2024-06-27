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
}

module.exports = Wallet;