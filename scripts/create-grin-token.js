import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import bs58 from 'bs58';

// Treasury wallet private key (from .env)
const privateKey = '4haVDk7mTJ2t7uF2PSoAaoriJkTCvekEWDZihogXnSFMLdpoih56Uf5Q3tLY2sKd22YFg6mvZPfqWeEpRUNn53Kb';
const secretKey = bs58.decode(privateKey);
const treasuryWallet = Keypair.fromSecretKey(secretKey);

async function main() {
  try {
    // Initialize connection
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=c55c146c-71ef-41b9-a574-cb08f359c00c', 'confirmed');

    console.log('Creating GRIN token mint...');
    const mint = await createMint(
      connection,
      treasuryWallet, // payer
      treasuryWallet.publicKey, // mint authority
      treasuryWallet.publicKey, // freeze authority
      9 // decimals
    );

    console.log('GRIN token mint created:', mint.toString());
    console.log('Update VITE_GRIN_TOKEN_MINT in .env with this address');

  } catch (error) {
    console.error('Failed to create GRIN token:', error);
  }
}

main();
