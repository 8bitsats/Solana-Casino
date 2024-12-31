import React, { useState, useEffect } from 'react';
import { useTreasury } from './WalletProvider';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Transaction, Connection } from '@solana/web3.js';

const TreasuryBalance: React.FC = () => {
  const { treasuryWallet, grinMint, connection } = useTreasury();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsInit, setNeedsInit] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!connection) {
        setError('No connection available');
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        console.log('Fetching balance...');

        // Get ATA
        const treasuryAta = await getAssociatedTokenAddress(
          grinMint,
          treasuryWallet.publicKey
        );
        console.log('Treasury ATA:', treasuryAta.toString());

        // Check if ATA exists
        const ataInfo = await connection.getAccountInfo(treasuryAta);
        if (!ataInfo) {
          console.log('Treasury ATA does not exist');
          setNeedsInit(true);
          setBalance(0);
          setIsLoading(false);
          return;
        }

        // Get balance
        const accountInfo = await connection.getTokenAccountBalance(treasuryAta);
        console.log('Account info:', accountInfo);
        
        setBalance(Number(accountInfo.value.amount) / 1e9); // Convert from lamports to GRIN
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch treasury balance:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch balance');
        setIsLoading(false);
      }
    };

    // Fetch initial balance
    fetchBalance();

    // Set up interval to fetch balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [treasuryWallet, grinMint, connection]);

  const initializeTreasury = async () => {
    if (!connection) {
      setError('No connection available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check SOL balance
      const solBalance = await connection.getBalance(treasuryWallet.publicKey);
      console.log('Treasury SOL balance:', solBalance / 1e9);

      // Request SOL if needed
      if (solBalance < 0.1 * 1e9) { // 0.1 SOL minimum
        console.log('Requesting SOL from devnet faucets...');
        const rpcEndpoints = [
          'https://api.devnet.solana.com',
          'https://devnet.helius-rpc.com/?api-key=c55c146c-71ef-41b9-a574-cb08f359c00c',
          'https://devnet.genesysgo.net/',
        ];

        let airdropSuccess = false;
        for (const endpoint of rpcEndpoints) {
          if (airdropSuccess) break;
          
          try {
            console.log(`Trying airdrop from ${endpoint}...`);
            const tempConnection = new Connection(endpoint, 'confirmed');
            const signature = await tempConnection.requestAirdrop(treasuryWallet.publicKey, 1e9);
            await tempConnection.confirmTransaction(signature);
            console.log('Airdrop successful from', endpoint);
            airdropSuccess = true;
          } catch (error) {
            console.error(`Airdrop failed from ${endpoint}:`, error);
          }
        }

        if (!airdropSuccess) {
          setError('Treasury needs SOL. Visit https://faucet.solana.com to get devnet SOL.');
          return;
        }

        // Verify the balance after airdrop
        const newBalance = await connection.getBalance(treasuryWallet.publicKey);
        if (newBalance < 0.1 * 1e9) {
          setError('Treasury needs SOL. Visit https://faucet.solana.com to get devnet SOL.');
          return;
        }
      }

      const treasuryAta = await getAssociatedTokenAddress(
        grinMint,
        treasuryWallet.publicKey
      );

      console.log('Creating ATA instruction...');
      const instruction = createAssociatedTokenAccountInstruction(
        treasuryWallet.publicKey, // payer
        treasuryAta, // ata
        treasuryWallet.publicKey, // owner
        grinMint // mint
      );
      console.log('Instruction created:', instruction);

      console.log('Creating transaction...');
      const transaction = new Transaction();
      transaction.add(instruction);

      console.log('Getting latest blockhash...');
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      console.log('Got blockhash:', blockhash);
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = treasuryWallet.publicKey;

      // Send and confirm transaction
      console.log('Sending transaction...');
      const signature = await connection.sendTransaction(transaction, [treasuryWallet]);
      console.log('Transaction sent:', signature);

      console.log('Confirming transaction...');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmation:', {
        err: confirmation.value.err,
        slot: confirmation.context.slot
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('Treasury ATA created:', signature);
      setNeedsInit(false);
      
      // Fetch updated balance
      const accountInfo = await connection.getTokenAccountBalance(treasuryAta);
      setBalance(Number(accountInfo.value.amount) / 1e9);
    } catch (error) {
      console.error('Failed to initialize treasury:', error);
      if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes('Simulation failed')) {
          setError('Transaction simulation failed. Please try again.');
        } else if (error.message.includes('blockhash')) {
          setError('Network error. Please try again.');
        } else {
          setError(`Initialization failed: ${error.message}`);
        }
      } else {
        setError('Failed to initialize treasury. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div className={`absolute inset-0 ${error ? 'bg-red-400/20' : needsInit ? 'bg-yellow-400/20' : 'bg-green-400/20'} animate-pulse rounded-lg`} />
        <div className={`relative px-3 py-1 rounded-lg ${error ? 'bg-red-500/10 border-red-500' : needsInit ? 'bg-yellow-500/10 border-yellow-500' : 'bg-[var(--accent)]/10 border-[var(--accent)]'} border`}>
          <span className={`text-sm font-medium ${error ? 'text-red-500' : needsInit ? 'text-yellow-500' : 'text-[var(--accent)]'}`}>
            Treasury: {isLoading ? '...' : error ? 'Error' : needsInit ? 'Needs Initialization' : `${balance?.toLocaleString() ?? 0} GRIN`}
          </span>
        </div>
      </div>
      {needsInit && !isLoading && !error && (
        <button
          onClick={initializeTreasury}
          className="px-2 py-1 text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500 rounded hover:bg-yellow-500/20 transition-colors"
        >
          Initialize
        </button>
      )}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 p-4 bg-black/80 text-white rounded-lg text-xs max-w-md overflow-auto">
          <pre>
            Network: {import.meta.env.VITE_SOLANA_NETWORK}
            Treasury: {treasuryWallet?.publicKey.toString()}
            GRIN Mint: {grinMint?.toString()}
            {error && `\nError: ${error}`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TreasuryBalance;
