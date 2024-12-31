import { FC, ReactNode, useMemo, createContext, useContext, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
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
  connection: Connection | null;
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
    console.log('Network:', import.meta.env.VITE_SOLANA_NETWORK);
    console.log('RPC URL:', import.meta.env.VITE_RPC_URL);
    return import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com';
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
    wsEndpoint: import.meta.env.VITE_WSS_URL || undefined
  }), []);

  // Initialize treasury wallet from environment variables
  const treasuryWallet = useMemo(() => {
    try {
      console.log('Initializing treasury wallet...');
      const privateKey = import.meta.env.VITE_TREASURY_PRIVATE_KEY;
      if (!privateKey) {
        console.error('Treasury private key not found in environment variables');
        throw new Error('Treasury private key not found in environment variables');
      }
      console.log('Private key found, creating wallet...');
      const secretKey = bs58.decode(privateKey);
      const wallet = Keypair.fromSecretKey(secretKey);
      console.log('Treasury wallet created:', wallet.publicKey.toString());
      return wallet;
    } catch (error) {
      console.error('Failed to initialize treasury wallet:', error);
      throw error;
    }
  }, []);

  // Initialize GRIN token mint
  const grinMint = useMemo(() => {
    try {
      console.log('Initializing GRIN mint...');
      const mintAddress = import.meta.env.VITE_GRIN_TOKEN_MINT;
      if (!mintAddress) {
        console.error('GRIN token mint not found in environment variables');
        throw new Error('GRIN token mint not found in environment variables');
      }
      console.log('Mint address found:', mintAddress);
      const mint = new PublicKey(mintAddress);
      console.log('GRIN mint initialized:', mint.toString());
      return mint;
    } catch (error) {
      console.error('Failed to initialize GRIN mint:', error);
      throw error;
    }
  }, []);

  // Create connection instance
  const connection = useMemo(() => {
    try {
      console.log('Creating connection to:', endpoint);
      const conn = new Connection(endpoint, config);
      console.log('Connection created successfully');
      return conn;
    } catch (error) {
      console.error('Failed to create Solana connection:', error);
      return null;
    }
  }, [endpoint, config]);

  // Verify connection
  useEffect(() => {
    if (connection) {
      connection.getVersion()
        .then(version => {
          console.log('Connected to Solana node version:', version);
        })
        .catch(error => {
          console.error('Failed to get node version:', error);
        });
    }
  }, [connection]);

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
    connection,
    payoutTokens,
    transferTokens,
  }), [treasuryWallet, grinMint, connection]);

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
