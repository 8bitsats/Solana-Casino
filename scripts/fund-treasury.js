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

    // Check SOL balance for fees
    const solBalance = await connection.getBalance(sourceKeypair.publicKey);
    console.log('Source wallet SOL balance:', solBalance / 1e9, 'SOL');
    
    if (solBalance < 10000000) { // 0.01 SOL minimum for fees
      throw new Error('Not enough SOL for transaction fees');
    }

    // Create transaction with recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: sourceKeypair.publicKey,
      blockhash,
      lastValidBlockHeight: await connection.getBlockHeight()
    });
    
    // Check if source has an ATA, if not create it
    console.log('Checking source ATA...');
    try {
      const sourceAtaInfo = await connection.getAccountInfo(sourceAta);
      if (!sourceAtaInfo) {
        console.log('Creating source ATA...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            sourceKeypair.publicKey,
            sourceAta,
            sourceKeypair.publicKey,
            grinMint
          )
        );
      } else {
        console.log('Source ATA exists');
      }
    } catch {
      console.log('Creating source ATA...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          sourceKeypair.publicKey,
          sourceAta,
          sourceKeypair.publicKey,
          grinMint
        )
      );
    }

    // Check if treasury has an ATA, if not create it
    console.log('Checking treasury ATA...');
    try {
      const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
      if (!treasuryAtaInfo) {
        console.log('Creating treasury ATA...');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            sourceKeypair.publicKey,
            treasuryAta,
            treasuryAddress,
            grinMint
          )
        );
      } else {
        console.log('Treasury ATA exists');
      }
    } catch {
      console.log('Creating treasury ATA...');
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
    console.log('Adding transfer instruction...');
    transaction.add(
      createTransferInstruction(
        sourceAta,
        treasuryAta,
        sourceKeypair.publicKey,
        50000
      )
    );

    // Send and confirm transaction
    console.log('Sending transaction...');
    const signature = await connection.sendTransaction(transaction, [sourceKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 5
    });
    console.log('Confirming transaction...');
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Treasury funded successfully!');
    console.log('Transaction signature:', signature);
  } catch (error) {
    console.error('Failed to fund treasury:', error);
  }
}

fundTreasury().catch(console.error);
