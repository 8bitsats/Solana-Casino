import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

import bs58 from 'bs58';

// Treasury wallet private key (from .env)
const privateKey = '4haVDk7mTJ2t7uF2PSoAaoriJkTCvekEWDZihogXnSFMLdpoih56Uf5Q3tLY2sKd22YFg6mvZPfqWeEpRUNn53Kb';
const secretKey = bs58.decode(privateKey);
const treasuryWallet = Keypair.fromSecretKey(secretKey);

// GRIN mint address (from .env)
const grinMint = new PublicKey('7JofsgKgD3MerQDa7hEe4dfkY3c3nMnsThZzUuYyTFpE');

async function main() {
  try {
    // Initialize connection
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=c55c146c-71ef-41b9-a574-cb08f359c00c', 'confirmed');

    // Get ATA address
    const treasuryAta = await getAssociatedTokenAddress(
      grinMint,
      treasuryWallet.publicKey
    );
    console.log('Treasury ATA:', treasuryAta.toString());

    // Check if ATA exists
    const ataInfo = await connection.getAccountInfo(treasuryAta);
    if (ataInfo) {
      console.log('Treasury ATA already exists');
      return;
    }

    // Create ATA instruction
    const instruction = createAssociatedTokenAccountInstruction(
      treasuryWallet.publicKey, // payer
      treasuryAta, // ata
      treasuryWallet.publicKey, // owner
      grinMint, // mint
      TOKEN_PROGRAM_ID, // Token program ID
      ASSOCIATED_TOKEN_PROGRAM_ID // Associated token program ID
    );

    // Create and sign transaction
    const transaction = new Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryWallet.publicKey;
    transaction.sign(treasuryWallet);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('Creating ATA...');
    await connection.confirmTransaction(signature);
    console.log('Treasury ATA created:', signature);

  } catch (error) {
    console.error('Failed to create treasury ATA:', error);
  }
}

main();
