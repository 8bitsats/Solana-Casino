import React, { useState, useEffect } from 'react';
import { useTreasury } from './WalletProvider';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { Connection } from '@solana/web3.js';

const TreasuryBalance: React.FC = () => {
  const { treasuryWallet, grinMint } = useTreasury();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const connection = new Connection(
          import.meta.env.VITE_SOLANA_NETWORK === 'devnet'
            ? 'https://api.devnet.solana.com'
            : import.meta.env.HELIUS_RPC_URL
        );

        const treasuryAta = await getAssociatedTokenAddress(
          grinMint,
          treasuryWallet.publicKey
        );

        const accountInfo = await connection.getTokenAccountBalance(treasuryAta);
        setBalance(Number(accountInfo.value.amount) / 1e9); // Convert from lamports to GRIN
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch treasury balance:', error);
        setIsLoading(false);
      }
    };

    // Fetch initial balance
    fetchBalance();

    // Set up interval to fetch balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [treasuryWallet, grinMint]);

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div className="absolute inset-0 bg-green-400/20 animate-pulse rounded-lg" />
        <div className="relative px-3 py-1 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]">
          <span className="text-sm font-medium text-[var(--accent)]">
            Treasury: {isLoading ? '...' : `${balance?.toLocaleString() ?? 0} GRIN`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TreasuryBalance;
