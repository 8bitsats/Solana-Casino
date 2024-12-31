import React from 'react';
import SolanaExplorer from '../components/SolanaExplorer';

const Explorer: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Blockchain Explorer</h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Search and analyze Solana tokens, wallets, and transactions. Get detailed risk analysis for meme tokens.
      </p>
      <SolanaExplorer />
    </div>
  );
};

export default Explorer;
