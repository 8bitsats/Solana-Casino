import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import TreasuryBalance from '../TreasuryBalance';

const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1" /> {/* Spacer */}
        
        {/* Centered Logo and Title */}
        <div className="flex flex-col items-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              filter: [
                'drop-shadow(0 0 20px rgba(147, 51, 234, 0.4))',
                'drop-shadow(0 0 35px rgba(236, 72, 153, 0.6))',
                'drop-shadow(0 0 20px rgba(147, 51, 234, 0.4))'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative mb-1"
          >
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
              😸
            </div>
          </motion.div>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
              Cheshire Casino
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Powered by $GRIN • Governed by GRIN DAO
            </p>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-end space-x-4">
          <TreasuryBalance />
          <button 
            className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
            aria-label="Notifications"
            title="View notifications"
          >
            <Bell className="w-5 h-5 text-[var(--text-secondary)]" aria-hidden="true" />
          </button>
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !text-white hover:!opacity-90" />
        </div>
      </div>
    </header>
  );
};

export default Header;
