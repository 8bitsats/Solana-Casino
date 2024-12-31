import { Keypair, PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';

async function fundTreasury() {
  // Initialize connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const backupConnection = new Connection('https://devnet.helius-rpc.com/?api-key=c55c146c-71ef-41b9-a574-cb08f359c00c', 'confirmed');

  async function requestAirdropWithRetry(pubkey, amount, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Airdrop attempt ${i + 1}/${retries}...`);
        const conn = i === 0 ? connection : backupConnection;
        const signature = await conn.requestAirdrop(pubkey, amount);
        await conn.confirmTransaction(signature);
        console.log('Airdrop successful');
        return true;
      } catch (error) {
        console.error(`Airdrop attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  }

  // Create a new wallet for funding
  const fundingWallet = Keypair.generate();
  console.log('Created funding wallet:', fundingWallet.publicKey.toString());
  
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
    // Try to get SOL for the funding wallet
    console.log('Requesting SOL from devnet faucet for funding wallet...');
    await requestAirdropWithRetry(fundingWallet.publicKey, 2 * LAMPORTS_PER_SOL);
    
    // Verify funding wallet balance
    const fundingBalance = await connection.getBalance(fundingWallet.publicKey);
    console.log('Funding wallet SOL balance:', fundingBalance / LAMPORTS_PER_SOL);
    
    if (fundingBalance < LAMPORTS_PER_SOL) {
      throw new Error('Failed to get enough SOL from faucet for funding wallet');
    }

    // Transfer SOL to source wallet if needed
    const sourceSolBalance = await connection.getBalance(sourceKeypair.publicKey);
    console.log('Source wallet SOL balance:', sourceSolBalance / LAMPORTS_PER_SOL);

    if (sourceSolBalance < LAMPORTS_PER_SOL) {
      console.log('Transferring SOL to source wallet...');
      const solTransferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fundingWallet.publicKey,
          toPubkey: sourceKeypair.publicKey,
          lamports: LAMPORTS_PER_SOL
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      solTransferTx.recentBlockhash = blockhash;
      solTransferTx.feePayer = fundingWallet.publicKey;

      const solSignature = await connection.sendTransaction(solTransferTx, [fundingWallet]);
      await connection.confirmTransaction(solSignature);
      console.log('SOL transfer to source wallet successful:', solSignature);
    }

    // Check treasury balance
    const treasurySolBalance = await connection.getBalance(treasuryAddress);
    console.log('Treasury SOL balance:', treasurySolBalance / LAMPORTS_PER_SOL);

    // Transfer SOL if treasury needs it
    if (treasurySolBalance < 0.1 * LAMPORTS_PER_SOL) {
      console.log('Transferring SOL to treasury...');
      const solTransferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sourceKeypair.publicKey,
          toPubkey: treasuryAddress,
          lamports: 0.1 * LAMPORTS_PER_SOL
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      solTransferTx.recentBlockhash = blockhash;
      solTransferTx.feePayer = sourceKeypair.publicKey;

      const solSignature = await connection.sendTransaction(solTransferTx, [sourceKeypair]);
      await connection.confirmTransaction(solSignature);
      console.log('SOL transfer successful:', solSignature);
    }

    // Get token accounts
    const sourceAta = await getAssociatedTokenAddress(grinMint, sourceKeypair.publicKey);
    const treasuryAta = await getAssociatedTokenAddress(grinMint, treasuryAddress);

    // Create transaction for token operations
    const transaction = new Transaction();

    // Check if treasury has an ATA, if not create it
    try {
      const treasuryAtaInfo = await connection.getAccountInfo(treasuryAta);
      if (!treasuryAtaInfo) {
        console.log('Creating Treasury ATA...');
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
    } catch (error) {
      console.log('Creating Treasury ATA...');
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
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sourceKeypair.publicKey;

    const signature = await connection.sendTransaction(transaction, [sourceKeypair]);
    console.log('Confirming transaction...');
    await connection.confirmTransaction(signature);

    console.log('Treasury funded successfully!');
    console.log('Transaction signature:', signature);

    // Get final balances
    const treasuryAtaInfo = await connection.getTokenAccountBalance(treasuryAta);
    console.log('Final treasury GRIN balance:', treasuryAtaInfo.value.uiAmount);
  } catch (error) {
    console.error('Failed to fund treasury:', error);
  }
}

fundTreasury().catch(console.error);
