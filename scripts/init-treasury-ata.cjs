const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const bs58 = require('bs58');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  try {
    // Initialize connection
    const connection = new Connection(process.env.VITE_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

    // Initialize treasury wallet
    const privateKey = process.env.VITE_TREASURY_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Treasury private key not found in environment variables');
    }
    const secretKey = bs58.decode(privateKey);
    const treasuryWallet = Keypair.fromSecretKey(secretKey);
    console.log('Treasury wallet:', treasuryWallet.publicKey.toString());

    // Initialize GRIN mint
    const mintAddress = process.env.VITE_GRIN_TOKEN_MINT;
    if (!mintAddress) {
      throw new Error('GRIN token mint not found in environment variables');
    }
    const grinMint = new PublicKey(mintAddress);
    console.log('GRIN mint:', grinMint.toString());

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

    // Create ATA using spl-token CLI
    console.log('Creating ATA using spl-token CLI...');
    const command = `spl-token create-account ${grinMint.toString()} --owner ${treasuryWallet.publicKey.toString()} --url devnet`;
    console.log('Command:', command);
    console.log('Run this command in your terminal to create the ATA');

  } catch (error) {
    console.error('Failed to initialize treasury ATA:', error);
  }
}

main();
