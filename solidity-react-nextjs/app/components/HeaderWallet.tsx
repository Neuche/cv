'use client';

import { useWallet } from '../hooks/useWallet';

export default function HeaderWallet() {
  const { 
    account, 
    isConnected, 
    balance,
    chainId, 
    isLoading, 
    error, 
    connectWallet, 
    disconnectWallet 
  } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 1:
        return 'Ethereum';
      case 11155111:
        return 'Sepolia';
      case 137:
        return 'Polygon';
      case 56:
        return 'BSC';
      case 97:
        return 'BSC Test';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    if (error) return 'bg-red-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-400';
  };

  if (!isConnected) {
    return (
      <div className="flex items-center">
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {error && (
        <div className="text-sm text-red-600 mr-2">
          Error: {error}
        </div>
      )}
      
      {/* Wallet Info */}
      <div className="hidden sm:flex items-center space-x-3 bg-gray-100 rounded-lg px-3 py-2">
        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-xs text-gray-600">{getNetworkName(chainId)}</span>
        </div>

        {/* Balance */}
        <div className="text-sm">
          <span className="font-medium text-gray-900">{balance || '0.0000'}</span>
          <span className="text-gray-600 ml-1">ETH</span>
        </div>

        {/* Address */}
        <div className="text-sm font-mono text-gray-700">
          {account && formatAddress(account)}
        </div>
      </div>

      {/* Mobile view - compact */}
      <div className="sm:hidden bg-gray-100 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm font-mono text-gray-700">
            {account && formatAddress(account)}
          </span>
        </div>
      </div>

      {/* Disconnect Button */}
      <button
        onClick={disconnectWallet}
        className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
        title="Disconnect Wallet"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}