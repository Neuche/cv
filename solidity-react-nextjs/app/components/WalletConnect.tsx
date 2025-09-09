'use client';

import { useWallet } from '../hooks/useWallet';

export default function WalletConnect() {
  const { 
    account, 
    isConnected, 
    chainId, 
    isLoading, 
    error, 
    connectWallet, 
    disconnectWallet 
  } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId: number | null) => {
    switch (chainId) {
      case 1:
        return 'Ethereum Mainnet';
      case 11155111:
        return 'Sepolia Testnet';
      case 137:
        return 'Polygon Mainnet';
      case 80001:
        return 'Polygon Mumbai';
      case 56:
        return 'BSC Mainnet';
      case 97:
        return 'BSC Testnet';
      default:
        return `Chain ID: ${chainId}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Connection</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {!isConnected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Connect your wallet to interact with smart contracts</p>
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </span>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-800">Connected</span>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-gray-600">Address:</p>
                  <p className="font-mono text-sm text-gray-900" title={account || ''}>
                    {account && formatAddress(account)}
                  </p>
                </div>
                {chainId && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Network:</p>
                    <p className="text-sm text-gray-900">{getChainName(chainId)}</p>
                  </div>
                )}
              </div>
              <button
                onClick={disconnectWallet}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Account Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chain ID:</span>
                    <span className="text-gray-900">{chainId}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                    View on Explorer
                  </button>
                  <button className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors">
                    Contract Interaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}