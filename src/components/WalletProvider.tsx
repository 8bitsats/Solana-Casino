import { FC, ReactNode, useMemo, createContext, useContext } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CloverWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { Commitment, Connection } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

interface TreasuryContextType {
  treasuryWallet: Keypair;
  grinMint: PublicKey;
  payoutTokens: (recipient: PublicKey, amount: number) => Promise<string>;
  transferTokens: (sender: Keypair, recipient: PublicKey, amount: number) => Promise<string>;
}

const TreasuryContext = createContext<TreasuryContextType | null>(null);

export const useTreasury = () => {
  const context = useContext(TreasuryContext);
  if (!context) throw new Error('useTreasury must be used within TreasuryProvider');
  return context;
};

const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use Helius RPC URL from environment variables with fallback
  const endpoint = useMemo(() => {
    const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
    if (network === 'devnet') {
      return 'https://api.devnet.solana.com';
    }
    return import.meta.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }, []);

  // Initialize multiple wallet adapters
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
    new CloverWalletAdapter()
  ], []);

  // Add configuration options for better connection handling
  const config = useMemo(() => ({
    commitment: 'confirmed' as Commitment,
    confirmTransactionInitialTimeout: 60000,
    preflightCommitment: 'confirmed' as Commitment,
    wsEndpoint: import.meta.env.HELIUS_WSS_URL || undefined
  }), []);

  // Initialize treasury wallet from environment variables
  const treasuryWallet = useMemo(() => {
    const privateKey = import.meta.env.VITE_TREASURY_PRIVATE_KEY;
    if (!privateKey) throw new Error('Treasury private key not found in environment variables');
    const secretKey = Uint8Array.from(Buffer.from(privateKey, 'base64'));
    return Keypair.fromSecretKey(secretKey);
  }, []);

  // Initialize GRIN token mint
  const grinMint = useMemo(() => {
    const mintAddress = import.meta.env.VITE_GRIN_TOKEN_MINT;
    if (!mintAddress) throw new Error('GRIN token mint not found in environment variables');
    return new PublicKey(mintAddress);
  }, []);

  // Create connection instance
  const connection = useMemo(() => {
    try {
      return new Connection(endpoint, config);
    } catch (error) {
      console.error('Failed to create Solana connection:', error);
      return null;
    }
  }, [endpoint, config]);

  // Function to handle token payouts
  const payoutTokens = async (recipient: PublicKey, amount: number): Promise<string> => {
    if (!connection) throw new Error('No connection available');

    try {
      const recipientAta = await getAssociatedTokenAddress(grinMint, recipient);
      const treasuryAta = await getAssociatedTokenAddress(grinMint, treasuryWallet.publicKey);

      const transaction = new Transaction();

      // Check if recipient has an ATA, if not create it
      try {
        await connection.getAccountInfo(recipientAta);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            treasuryWallet.publicKey,
            recipientAta,
            recipient,
            grinMint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          treasuryAta,
          recipientAta,
          treasuryWallet.publicKey,
          amount
        )
      );

      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, [treasuryWallet]);
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Payout failed:', error);
      throw error;
    }
  };

  // Function to handle token transfers
  const transferTokens = async (sender: Keypair, recipient: PublicKey, amount: number): Promise<string> => {
    if (!connection) throw new Error('No connection available');

    try {
      const recipientAta = await getAssociatedTokenAddress(grinMint, recipient);
      const senderAta = await getAssociatedTokenAddress(grinMint, sender.publicKey);

      const transaction = new Transaction();

      // Check if recipient has an ATA, if not create it
      try {
        await connection.getAccountInfo(recipientAta);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            sender.publicKey,
            recipientAta,
            recipient,
            grinMint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          senderAta,
          recipientAta,
          sender.publicKey,
          amount
        )
      );

      // Send and confirm transaction
      const signature = await connection.sendTransaction(transaction, [sender]);
      await connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    }
  };

  const treasuryContextValue = useMemo(() => ({
    treasuryWallet,
    grinMint,
    payoutTokens,
    transferTokens,
  }), [treasuryWallet, grinMint]);

  // If connection failed, show error
  if (!connection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Connection Error</h1>
          <p className="text-gray-400">Failed to connect to Solana network</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <TreasuryContext.Provider value={treasuryContextValue}>
        <SolanaWalletProvider 
          wallets={wallets} 
          autoConnect={true}
          onError={(error) => {
            console.error('Wallet error:', error);
          }}
        >
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </TreasuryContext.Provider>
    </ConnectionProvider>
  );
}

export { WalletProvider };
