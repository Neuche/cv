'use client';

import { useState, useEffect } from 'react';
import HeaderWallet from './components/HeaderWallet';
import BalanceFaucetDashboard from './components/BalanceFaucetDashboard';

interface TokenData {
  symbol: string;
  price: string;
  priceChangePercent: string;
}

export default function Page() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch('/api/binance');
        const data = await response.json();
        
        // Check if data is an array (success) or error object
        if (Array.isArray(data)) {
          setTokens(data);
        } else {
          console.error('API returned error:', data.error || 'Unknown error');
          setTokens([]);
        }
      } catch (error) {
        console.error('Error fetching token data:', error);
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
    const interval = setInterval(fetchTokens, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm w-full">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ETH Faucet & Tracker</h1>
          <HeaderWallet />
        </div>
      </header>
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Token Tracker</h1>
        
        <BalanceFaucetDashboard />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => (
              <div key={token.symbol} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {token.symbol}
                </h3>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900">
                    ${parseFloat(token.price).toFixed(4)}
                  </p>
                  <p className={`text-sm font-medium ${
                    parseFloat(token.priceChangePercent) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {parseFloat(token.priceChangePercent) >= 0 ? '+' : ''}
                    {parseFloat(token.priceChangePercent).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && tokens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Demo data (live API works locally)</p>
          </div>
        )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Ethereum Faucet & Token Tracker</h3>
            <p className="text-blue-100 text-sm">
              Sepolia testnet mining with live price data
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
