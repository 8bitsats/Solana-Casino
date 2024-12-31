import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';

interface TokenAnalysis {
  name: string;
  symbol: string;
  supply: string;
  holders: number;
  riskScore: number;
  riskFactors: string[];
}

interface TokenHolding {
  token: string;
  symbol: string;
  amount: number;
}

interface TransactionInstruction {
  program: string;
  type: string;
}

interface TransactionDetails {
  blockTime: number;
  slot: number;
  fee: number;
  status: 'Success' | 'Failed';
  instructions: TransactionInstruction[];
}

type SearchResult =
  | { type: 'token'; data: TokenAnalysis }
  | { type: 'wallet'; data: TokenHolding[] }
  | { type: 'transaction'; data: TransactionDetails };

const SolanaExplorer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'token' | 'wallet' | 'transaction'>('token');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let toolName = '';
      switch (searchType) {
        case 'token':
          toolName = 'search_token';
          break;
        case 'wallet':
          toolName = 'search_wallet';
          break;
        case 'transaction':
          toolName = 'search_transaction';
          break;
      }

      const args = searchType === 'transaction' 
        ? { signature: searchQuery }
        : { address: searchQuery };

      const requestBody = {
        server: 'solana-explorer-server',
        tool: toolName,
        args,
      };

      console.log('[Explorer] Sending request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Explorer] Response status:', response.status);
      console.log('[Explorer] Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('[Explorer] Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`Request failed (${response.status}): ${responseText}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('[Explorer] Parsed response data:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.error('[Explorer] JSON parse error:', e);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (responseData.error) {
        throw new Error(`Server error: ${responseData.error}`);
      }

      if (!responseData.content || !Array.isArray(responseData.content)) {
        console.error('[Explorer] Invalid response structure:', responseData);
        throw new Error('Invalid response structure: missing content array');
      }

      const content = responseData.content[0];
      if (!content || !content.text) {
        console.error('[Explorer] Invalid content:', content);
        throw new Error('Invalid response structure: missing content text');
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(content.text);
        console.log('[Explorer] Parsed content:', JSON.stringify(parsedContent, null, 2));
      } catch (e) {
        console.error('[Explorer] Content parse error:', e);
        throw new Error(`Invalid content format: ${content.text.substring(0, 100)}...`);
      }

      setResult({ type: searchType, data: parsedContent });
    } catch (error) {
      console.error('[Explorer] Search error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  }, [handleSearch, isLoading]);

  const renderResult = () => {
    if (error) {
      return (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
          {error}
        </div>
      );
    }

    if (!result) return null;

    switch (result.type) {
      case 'token':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Token Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
                <div className="text-sm text-[var(--text-secondary)]">Name</div>
                <div className="font-medium">{(result.data as TokenAnalysis).name}</div>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
                <div className="text-sm text-[var(--text-secondary)]">Symbol</div>
                <div className="font-medium">{(result.data as TokenAnalysis).symbol}</div>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
                <div className="text-sm text-[var(--text-secondary)]">Supply</div>
                <div className="font-medium">{(result.data as TokenAnalysis).supply}</div>
              </div>
              <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
                <div className="text-sm text-[var(--text-secondary)]">Holders</div>
                <div className="font-medium">{(result.data as TokenAnalysis).holders}</div>
              </div>
            </div>
            <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
              <div className="text-sm text-[var(--text-secondary)] mb-2">Risk Analysis</div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="font-medium">Risk Score:</div>
                <div className={`px-2 py-1 rounded text-sm ${
                  (result.data as TokenAnalysis).riskScore > 7 ? 'bg-red-500/20 text-red-400' :
                  (result.data as TokenAnalysis).riskScore > 4 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {(result.data as TokenAnalysis).riskScore}/10
                </div>
              </div>
              <div className="space-y-2">
                {(result.data as TokenAnalysis).riskFactors.map((factor: string, index: number) => (
                  <div key={index} className="text-sm text-[var(--text-secondary)]">
                    • {factor}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Wallet Holdings</h3>
            <div className="space-y-2">
              {(result.data as TokenHolding[]).map((holding, index) => (
                <div key={index} className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] flex justify-between items-center">
                  <div>
                    <div className="font-medium">{holding.token}</div>
                    <div className="text-sm text-[var(--text-secondary)]">{holding.symbol}</div>
                  </div>
                  <div className="font-medium">{holding.amount}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'transaction':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Transaction Details</h3>
            <div className="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] space-y-2">
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Status</div>
                <div className={`inline-block px-2 py-1 rounded text-sm ${
                  (result.data as TransactionDetails).status === 'Success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {(result.data as TransactionDetails).status}
                </div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Fee</div>
                <div className="font-medium">{(result.data as TransactionDetails).fee} SOL</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Block Time</div>
                <div className="font-medium">{new Date((result.data as TransactionDetails).blockTime * 1000).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Instructions</div>
                <div className="space-y-1">
                  {(result.data as TransactionDetails).instructions.map((ix, index) => (
                    <div key={index} className="text-sm">
                      {ix.program}: {ix.type}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Enter ${searchType} address...`}
                className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-[var(--accent)]/50 cursor-not-allowed'
                  : 'bg-[var(--accent)] hover:opacity-90'
              }`}
            >
              {isLoading ? (
                'Searching...'
              ) : (
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </div>
              )}
            </button>
          </div>
          <div className="flex space-x-4">
            {(['token', 'wallet', 'transaction'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  searchType === type
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--accent)]/50'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {renderResult()}
      </div>
    </div>
  );
};

export default SolanaExplorer;
