const crypto = require('node:crypto');

const { publicKey } = crypto.generateKeyPairSync('ed25519');

const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });

const publicKeyBase64 = publicKeyDer.toString('base64');

console.log(publicKeyBase64);
