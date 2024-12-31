import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dices, Wallet, Settings, MessageSquare, PlusCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { icon: <Dices className="w-5 h-5" />, label: 'Games', path: '/games' },
    { icon: <PlusCircle className="w-5 h-5" />, label: 'Create Casino', path: '/create' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Telegram Bot', path: '/bot' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Wallets', path: '/wallets' },
    { icon: <Search className="w-5 h-5" />, label: 'Explorer', path: '/explorer' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 h-screen bg-[var(--sidebar)] border-r border-[var(--border)] fixed left-0 top-0">
      <div className="p-4">
        <Link to="/" className="flex items-center space-x-3 px-2 py-4">
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
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center"
          >
            <span className="text-2xl">😸</span>
          </motion.div>
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
              Cheshire
            </span>
            <span className="text-xs text-[var(--text-secondary)]">by $GRIN</span>
          </div>
        </Link>
      </div>

      <nav className="mt-4 px-2 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center space-x-3 px-4 py-3 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card)] hover:text-[var(--text-primary)] transition-colors',
              location.pathname === item.path && 'bg-[var(--card)] text-[var(--text-primary)]'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
