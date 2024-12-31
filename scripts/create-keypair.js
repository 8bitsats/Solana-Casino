import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

// Treasury wallet private key (from .env)
const privateKey = '4haVDk7mTJ2t7uF2PSoAaoriJkTCvekEWDZihogXnSFMLdpoih56Uf5Q3tLY2sKd22YFg6mvZPfqWeEpRUNn53Kb';
const secretKey = bs58.decode(privateKey);

// Create keypair
const keypair = Keypair.fromSecretKey(secretKey);

// Save keypair to file
fs.writeFileSync('treasury-keypair.json', `[${keypair.secretKey.toString()}]`);
console.log('Keypair saved to treasury-keypair.json');
console.log('Public key:', keypair.publicKey.toString());
