import { Keypair, PublicKey, Connection, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';

async function fundTreasury() {
  // Initialize connection
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

  // Source wallet (holding GRIN tokens)
  const sourcePrivateKey = '4eFSqdmjSd5228rR1Mexqqk3R3xtmjRpFtxWpy5MfiipJcpBfPNgusyBMe3yiE4djhaBGxXZiaB8UWmci8KdR1Dk';
  const sourceKeypair = Keypair.fromSecretKey(
    bs58.decode(sourcePrivateKey)
  );

  // Treasury wallet
  const treasuryAddress = new PublicKey('iTPybDA8grKHij2N3w8DaTyBXqMLuc8Ys4dBo3vNgqT');

  // GRIN token mint
  const grinMint = new PublicKey('7JofsgKgD3MerQDa7hEe4dfkY3c3nMnsThZzUuYyTFpE');

  try {
    // Get token accounts
    const sourceAta = await getAssociatedTokenAddress(grinMint, sourceKeypair.publicKey);
    const treasuryAta = await getAssociatedTokenAddress(grinMint, treasuryAddress);

    // Create transaction
    const transaction = new Transaction();

    // Check if treasury has an ATA, if not create it
    try {
      await connection.getAccountInfo(treasuryAta);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          sourceKeypair.publicKey,
          treasuryAta,
          treasuryAddress,
          grinMint
        )
      );
    }

    // Add transfer instruction (50,000 GRIN tokens)
    transaction.add(
      createTransferInstruction(
        sourceAta,
        treasuryAta,
        sourceKeypair.publicKey,
        50000
      )
    );

    // Send and confirm transaction
    const signature = await connection.sendTransaction(transaction, [sourceKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Treasury funded successfully!');
    console.log('Transaction signature:', signature);
  } catch (error) {
    console.error('Failed to fund treasury:', error);
  }
}

fundTreasury().catch(console.error);
