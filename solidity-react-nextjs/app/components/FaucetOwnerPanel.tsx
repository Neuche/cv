'use client';

import { useState, useEffect } from 'react';
import { BalanceFaucetContract } from '../lib/balanceFaucetContract';
import { ethers } from 'ethers';

interface OwnerPanelProps {
  faucetContract: BalanceFaucetContract | null;
  onUpdate: () => void;
}

interface OwnerData {
  owner: string;
  baseDifficulty: number;
  contractBalance: string;
  isCallerOwner: boolean;
}

export default function FaucetOwnerPanel({ faucetContract, onUpdate }: OwnerPanelProps) {
  const [ownerData, setOwnerData] = useState<OwnerData>({
    owner: '',
    baseDifficulty: 4,
    contractBalance: '0',
    isCallerOwner: false
  });

  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  
  // Form states
  const [newDifficulty, setNewDifficulty] = useState('4');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  
  // Transaction status
  const [txStatus, setTxStatus] = useState<{
    type: string;
    status: 'idle' | 'pending' | 'success' | 'failed';
    message: string;
    hash?: string;
  }>({
    type: '',
    status: 'idle',
    message: ''
  });

  useEffect(() => {
    loadOwnerData();
  }, [faucetContract]);

  const loadOwnerData = async () => {
    if (!faucetContract) return;

    try {
      const ownerInfo = await faucetContract.getOwnerInfo();
      setOwnerData(ownerInfo);
      setNewDifficulty(ownerInfo.baseDifficulty.toString());
      setShowPanel(ownerInfo.isCallerOwner);
    } catch (error) {
      console.error('Error loading owner data:', error);
    }
  };

  const updateTxStatus = (updates: Partial<typeof txStatus>) => {
    setTxStatus(prev => ({ ...prev, ...updates }));
  };

  const executeOwnerFunction = async (
    functionName: string,
    operation: () => Promise<ethers.TransactionResponse>,
    successMessage: string
  ) => {
    setLoading(true);
    updateTxStatus({
      type: functionName,
      status: 'pending',
      message: `Executing ${functionName}...`
    });

    try {
      const tx = await operation();
      updateTxStatus({
        status: 'pending',
        message: 'Transaction submitted. Waiting for confirmation...',
        hash: tx.hash
      });

      const receipt = await tx.wait();
      updateTxStatus({
        status: 'success',
        message: successMessage,
        hash: tx.hash
      });

      // Refresh data
      await loadOwnerData();
      onUpdate();

      // Reset form
      if (functionName === 'withdrawFunds') setWithdrawAmount('');
      if (functionName === 'transferOwnership') setNewOwnerAddress('');

    } catch (error: any) {
      updateTxStatus({
        status: 'failed',
        message: error.reason || error.message || 'Transaction failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDifficulty = () => {
    const difficulty = parseInt(newDifficulty);
    if (difficulty < 1 || difficulty > 10) {
      updateTxStatus({
        type: 'setDifficulty',
        status: 'failed',
        message: 'Difficulty must be between 1 and 10'
      });
      return;
    }

    executeOwnerFunction(
      'setBaseDifficulty',
      () => faucetContract!.setBaseDifficulty(difficulty),
      `Base difficulty updated to ${difficulty}`
    );
  };

  const handleWithdrawFunds = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      updateTxStatus({
        type: 'withdrawFunds',
        status: 'failed',
        message: 'Please enter a valid amount'
      });
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(ownerData.contractBalance)) {
      updateTxStatus({
        type: 'withdrawFunds',
        status: 'failed',
        message: 'Amount exceeds contract balance'
      });
      return;
    }

    executeOwnerFunction(
      'withdrawFunds',
      () => faucetContract!.withdrawFunds(withdrawAmount),
      `Successfully withdrew ${withdrawAmount} ETH`
    );
  };

  const handleWithdrawAll = () => {
    executeOwnerFunction(
      'withdrawAllFunds',
      () => faucetContract!.withdrawAllFunds(),
      `Successfully withdrew all funds (${ownerData.contractBalance} ETH)`
    );
  };

  const handleTransferOwnership = () => {
    if (!ethers.isAddress(newOwnerAddress)) {
      updateTxStatus({
        type: 'transferOwnership',
        status: 'failed',
        message: 'Please enter a valid Ethereum address'
      });
      return;
    }

    executeOwnerFunction(
      'transferOwnership',
      () => faucetContract!.transferOwnership(newOwnerAddress),
      `Ownership transferred to ${newOwnerAddress}`
    );
  };

  const handleRenounceOwnership = () => {
    if (!confirm('Are you sure you want to renounce ownership? This action cannot be undone!')) {
      return;
    }

    executeOwnerFunction(
      'renounceOwnership',
      () => faucetContract!.renounceOwnership(),
      'Ownership renounced. Contract is now ownerless.'
    );
  };

  if (!showPanel) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-6 mt-6">
      <div className="flex items-center mb-4">
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2h-8a2 2 0 01-2-2V9a2 2 0 012-2m8 0V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m8 0h4m-4 8h4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-purple-900">👑 Contract Owner Panel</h3>
      </div>

      {/* Owner Info */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-purple-200">
        <h4 className="font-semibold text-purple-800 mb-3">Owner Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Contract Owner:</span>
            <div className="font-mono text-gray-900 break-all">{ownerData.owner}</div>
          </div>
          <div>
            <span className="text-gray-600">Current Base Difficulty:</span>
            <div className="font-bold text-purple-700">{ownerData.baseDifficulty}</div>
          </div>
          <div>
            <span className="text-gray-600">Contract Balance:</span>
            <div className="font-bold text-green-700">{ownerData.contractBalance} ETH</div>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      {txStatus.status !== 'idle' && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          txStatus.status === 'success' ? 'bg-green-50 border-green-400' :
          txStatus.status === 'failed' ? 'bg-red-50 border-red-400' :
          'bg-blue-50 border-blue-400'
        }`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white ${
              txStatus.status === 'success' ? 'bg-green-500' :
              txStatus.status === 'failed' ? 'bg-red-500' :
              'bg-blue-500'
            }`}>
              {txStatus.status === 'pending' && (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              )}
              {txStatus.status === 'success' && <span className="text-xs">✓</span>}
              {txStatus.status === 'failed' && <span className="text-xs">✗</span>}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{txStatus.message}</p>
              {txStatus.hash && (
                <p className="text-xs text-gray-600 mt-1">
                  TX: <span className="font-mono">{txStatus.hash.slice(0, 10)}...{txStatus.hash.slice(-8)}</span>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${txStatus.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    View on Etherscan
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty Management */}
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <h4 className="font-semibold text-purple-800 mb-3">⚙️ Difficulty Management</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Difficulty (1-10)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSetDifficulty}
                  disabled={loading || newDifficulty === ownerData.baseDifficulty.toString()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Higher difficulty = longer mining time. Affects all new claims.
            </div>
          </div>
        </div>

        {/* Fund Management */}
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <h4 className="font-semibold text-purple-800 mb-3">Fund Management</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Withdraw Amount (ETH)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.001"
                  max={ownerData.contractBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
                <button
                  onClick={handleWithdrawFunds}
                  disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Withdraw
                </button>
              </div>
            </div>
            <button
              onClick={handleWithdrawAll}
              disabled={loading || parseFloat(ownerData.contractBalance) === 0}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Withdraw All ({ownerData.contractBalance} ETH)
            </button>
          </div>
        </div>

        {/* Ownership Management */}
        <div className="bg-white rounded-lg p-4 border border-purple-200 md:col-span-2">
          <h4 className="font-semibold text-purple-800 mb-3">🔑 Ownership Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transfer Ownership
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  disabled={loading}
                />
                <button
                  onClick={handleTransferOwnership}
                  disabled={loading || !newOwnerAddress || !ethers.isAddress(newOwnerAddress)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Transfer
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRenounceOwnership}
                disabled={loading}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚠️ Renounce Ownership
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            ⚠️ Transferring or renouncing ownership cannot be undone. Use with caution.
          </div>
        </div>
      </div>
    </div>
  );
}