'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { BalanceFaucetContract } from '../lib/balanceFaucetContract';
import { BalanceProofOfWorkMiner } from '../lib/balanceProofOfWork';
import FaucetOwnerPanel from './FaucetOwnerPanel';
import { ethers } from 'ethers';

interface MiningState {
  isActive: boolean;
  nonce: number;
  iterations: number;
  hashesPerSecond: number;
  expectedTime: number;
  elapsedTime: number;
  currentHash: string;
  targetValue: string;
  progress: number;
  contractBalance: string;
}

interface TransactionStatus {
  hash: string | null;
  status: 'idle' | 'mining' | 'submitting' | 'confirming' | 'success' | 'failed';
  message: string;
  confirmations: number;
  gasUsed?: string;
  error?: string;
}

interface FaucetData {
  contractBalance: string;
  totalClaims: number;
  currentDifficulty: number;
  lastClaimBlock: number;
  currentBlock: number;
  recentClaimsCount: number;
  totalClaimed: string;
  userBalance: string;
  expectedMiningTime: number;
  difficultyDescription: string;
}

export default function BalanceFaucetDashboard() {
  const { provider, signer, isConnected, account, chainId } = useWallet();
  const [faucetContract, setFaucetContract] = useState<BalanceFaucetContract | null>(null);
  const [faucetData, setFaucetData] = useState<FaucetData>({
    contractBalance: '0',
    totalClaims: 0,
    currentDifficulty: 4,
    lastClaimBlock: 0,
    currentBlock: 0,
    recentClaimsCount: 0,
    totalClaimed: '0',
    userBalance: '0',
    expectedMiningTime: 60,
    difficultyDescription: 'Base difficulty'
  });
  
  const [miningState, setMiningState] = useState<MiningState>({
    isActive: false,
    nonce: 0,
    iterations: 0,
    hashesPerSecond: 0,
    expectedTime: 0,
    elapsedTime: 0,
    currentHash: '',
    targetValue: '',
    progress: 0,
    contractBalance: '0'
  });

  const [txStatus, setTxStatus] = useState<TransactionStatus>({
    hash: null,
    status: 'idle',
    message: '',
    confirmations: 0,
  });

  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Use environment variable for new contract address
  const contractAddress = process.env.NEXT_PUBLIC_BALANCE_FAUCET_ADDRESS || '0xCf98CF1b43FaaD7a9C230841Cc27643180695454';

  useEffect(() => {
    if (provider && isConnected && contractAddress !== '0x0000000000000000000000000000000000000000') {
      const contract = new BalanceFaucetContract(contractAddress, provider);
      if (signer) {
        contract.connect().then(() => {
          setFaucetContract(contract);
          loadFaucetData(contract);
        });
      } else {
        setFaucetContract(contract);
        loadFaucetData(contract);
      }
    }
  }, [provider, signer, isConnected, account, contractAddress]);

  useEffect(() => {
    if (!autoRefresh || !faucetContract) return;
    
    const interval = setInterval(() => {
      loadFaucetData(faucetContract);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, faucetContract]);

  const loadFaucetData = async (contract: BalanceFaucetContract) => {
    if (!provider || !account) return;

    try {
      const [contractInfo, userInfo, difficultyInfo, userBalance] = await Promise.all([
        contract.getContractInfo(),
        contract.getUserInfo(account),
        contract.getDifficultyInfo(),
        provider.getBalance(account).then(b => ethers.formatEther(b))
      ]);

      setFaucetData({
        contractBalance: contractInfo.balance,
        totalClaims: contractInfo.totalClaims,
        currentDifficulty: difficultyInfo.currentDifficulty,
        lastClaimBlock: userInfo.lastClaimBlock,
        currentBlock: contractInfo.currentBlock,
        recentClaimsCount: difficultyInfo.recentClaimsCount,
        totalClaimed: userInfo.totalClaimed,
        userBalance,
        expectedMiningTime: difficultyInfo.expectedMiningTime,
        difficultyDescription: difficultyInfo.difficultyDescription
      });
    } catch (error) {
      console.error('Error loading faucet data:', error);
    }
  };

  const updateTxStatus = (updates: Partial<TransactionStatus>) => {
    setTxStatus(prev => ({ ...prev, ...updates }));
  };

  const resetMiningState = () => {
    setMiningState({
      isActive: false,
      nonce: 0,
      iterations: 0,
      hashesPerSecond: 0,
      expectedTime: 0,
      elapsedTime: 0,
      currentHash: '',
      targetValue: '',
      progress: 0,
      contractBalance: '0'
    });
  };

  const startMining = useCallback(async () => {
    if (!faucetContract || !account || !provider) return;

    setLoading(true);
    resetMiningState();
    updateTxStatus({ status: 'mining', message: 'Starting balance-based proof-of-work mining...', hash: null });

    try {
      // Get current contract state
      const contractBalance = await faucetContract.getCurrentBalance();
      const difficulty = await faucetContract.getCurrentDifficulty();
      const target = BigInt(2 ** (256 - difficulty * 4));
      
      setMiningState(prev => ({
        ...prev,
        isActive: true,
        expectedTime: faucetData.expectedMiningTime || BalanceProofOfWorkMiner.calculateExpectedTime(difficulty),
        targetValue: target.toString(16),
        contractBalance: ethers.formatEther(contractBalance)
      }));

      updateTxStatus({ 
        message: `Mining with difficulty ${difficulty} using balance ${ethers.formatEther(contractBalance)} ETH...` 
      });

      const miner = new BalanceProofOfWorkMiner(account, contractBalance);
      const startTime = Date.now();
      let lastUpdate = startTime;

      const progressCallback = (nonce: number, hash: string, iterations: number) => {
        const now = Date.now();
        if (now - lastUpdate > 500) {
          const elapsed = (now - startTime) / 1000;
          const hashRate = iterations / elapsed;
          const expectedTotal = 2 ** (difficulty * 4);
          const progress = Math.min((iterations / expectedTotal) * 100, 99);

          setMiningState(prev => ({
            ...prev,
            nonce,
            iterations,
            hashesPerSecond: Math.round(hashRate),
            elapsedTime: Math.round(elapsed),
            currentHash: hash,
            progress
          }));

          lastUpdate = now;
        }
      };

      const { nonce, hash, iterations } = await miner.mineNonce(difficulty, progressCallback);

      setMiningState(prev => ({
        ...prev,
        isActive: false,
        nonce,
        currentHash: hash,
        progress: 100
      }));

      updateTxStatus({ 
        status: 'submitting', 
        message: `Found valid nonce ${nonce}! Submitting transaction...` 
      });

      const tx = await faucetContract.claimFaucet(nonce);
      
      updateTxStatus({
        hash: tx.hash,
        status: 'confirming',
        message: 'Transaction submitted! Waiting for confirmation...',
      });

      const receipt = await tx.wait();
      
      updateTxStatus({
        status: 'success',
        message: 'Faucet claim successful!',
        confirmations: receipt ? await receipt.confirmations() : 1,
        gasUsed: receipt?.gasUsed?.toString(),
      });

      await loadFaucetData(faucetContract);

    } catch (error: any) {
      console.error('Mining error:', error);
      setMiningState(prev => ({ ...prev, isActive: false }));
      
      let errorMessage = 'Mining failed';
      let detailedError = error.message || 'Unknown error';
      
      if (error.code === 'CALL_EXCEPTION') {
        if (error.reason) {
          errorMessage = 'Contract revert';
          detailedError = error.reason;
        } else {
          errorMessage = 'Contract rejected transaction';
          detailedError = 'The contract rejected the transaction. Check cooldown period and proof-of-work validity.';
        }
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds';
        detailedError = 'You don\'t have enough ETH to pay for gas fees.';
      } else if (error.code === 'USER_REJECTED') {
        errorMessage = 'Transaction rejected';
        detailedError = 'You rejected the transaction in your wallet.';
      }
      
      updateTxStatus({
        status: 'failed',
        message: errorMessage,
        error: detailedError,
      });
    } finally {
      setLoading(false);
    }
  }, [faucetContract, account, provider]);

  const formatHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getStatusColor = () => {
    switch (txStatus.status) {
      case 'mining': case 'submitting': case 'confirming': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Balance-Based Sepolia ETH Faucet</h3>
          <p className="text-gray-600 mb-4">Connect your wallet to claim 0.0001 Sepolia ETH</p>
          <div className="text-sm text-gray-500">No block timing issues • Balance-based proof-of-work</div>
        </div>
      </div>
    );
  }

  if (contractAddress === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Contract Not Deployed</h3>
          <p className="text-gray-600 mb-4">The new balance-based faucet contract needs to be deployed first</p>
          <div className="text-sm text-gray-500">Please deploy the BalanceFaucet contract and update NEXT_PUBLIC_BALANCE_FAUCET_ADDRESS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Balance-Based Sepolia ETH Faucet</h2>
            <p className="text-green-100 text-sm mt-1">
              No Block Timing Issues • Balance-Based Proof-of-Work • 0.0001 ETH per claim
            </p>
          </div>
          <div className="text-right">
            <div className="text-white text-sm">Contract Balance</div>
            <div className="text-white text-lg font-bold">{faucetData.contractBalance} ETH</div>
            <div className="text-green-100 text-xs">{faucetData.totalClaims} total claims</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Status Display */}
        {txStatus.status !== 'idle' && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            txStatus.status === 'success' ? 'bg-green-50 border-green-400' :
            txStatus.status === 'failed' ? 'bg-red-50 border-red-400' :
            'bg-blue-50 border-blue-400'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full ${getStatusColor()} flex items-center justify-center text-white`}>
                {(txStatus.status === 'mining' || txStatus.status === 'submitting' || txStatus.status === 'confirming') && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {txStatus.status === 'success' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {txStatus.status === 'failed' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{txStatus.message}</p>
                {txStatus.hash && (
                  <p className="text-xs text-gray-600 mt-1">
                    TX: <span className="font-mono">{formatHash(txStatus.hash)}</span>
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
                {txStatus.error && (
                  <p className="text-xs text-red-600 mt-1">Error: {txStatus.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mining Dashboard */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Balance-Based Mining</h3>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Auto-refresh</label>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoRefresh ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoRefresh ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2">Difficulty-Based Protection</h4>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• No cooldown restrictions - can always attempt to claim</li>
                  <li>• Difficulty increases exponentially with recent claims</li>
                  <li>• Balance-based hashing - no block timing issues</li>
                  <li>• Recent claim? Mining takes much longer (natural spam protection)</li>
                </ul>
              </div>

              {/* Mining Progress */}
              {miningState.isActive && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Mining Progress</span>
                    <span className="text-sm text-blue-600">{miningState.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${miningState.progress}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-blue-700">Nonce:</span>
                      <span className="ml-1 font-mono">{miningState.nonce.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Iterations:</span>
                      <span className="ml-1 font-mono">{miningState.iterations.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Hash Rate:</span>
                      <span className="ml-1 font-mono">{miningState.hashesPerSecond.toLocaleString()} H/s</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Elapsed:</span>
                      <span className="ml-1 font-mono">{miningState.elapsedTime}s</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-blue-700">Contract Balance:</span>
                      <span className="ml-1 font-mono">{miningState.contractBalance} ETH</span>
                    </div>
                  </div>
                  {miningState.currentHash && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="text-xs">
                        <span className="text-blue-700">Current Hash:</span>
                        <div className="font-mono text-blue-600 break-all mt-1">{miningState.currentHash}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mining Configuration */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-sm text-gray-600">Difficulty Level</div>
                    <div className="text-2xl font-bold text-gray-900">{faucetData.currentDifficulty}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {faucetData.difficultyDescription}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-sm text-gray-600">Est. Mining Time</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {faucetData.expectedMiningTime < 60 ? `${faucetData.expectedMiningTime}s` : 
                       faucetData.expectedMiningTime < 3600 ? `${Math.round(faucetData.expectedMiningTime / 60)}m` :
                       `${Math.round(faucetData.expectedMiningTime / 3600)}h`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {faucetData.recentClaimsCount > 0 ? 
                        `${faucetData.recentClaimsCount} claims in last 100 blocks` : 
                        'No recent network activity'}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm text-gray-600 mb-2">Global Network Protection</div>
                  <div className="text-green-600">
                    <div className="font-semibold">Always Ready to Mine</div>
                    <div className="text-sm">Difficulty scales with total network activity (last 100 blocks)</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <div>• High network activity? Much harder mining</div>
                    <div>• Low network activity? Easier mining</div>
                    <div>• Current: {faucetData.recentClaimsCount} claims in last 100 blocks</div>
                  </div>
                </div>
              </div>

              {/* Claim Button */}
              <div className="mt-6">
                <button
                  onClick={startMining}
                  disabled={loading || miningState.isActive || parseFloat(faucetData.contractBalance) < 0.0001}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all ${
                    !loading && !miningState.isActive && parseFloat(faucetData.contractBalance) >= 0.0001
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {miningState.isActive ? 'Mining in Progress...' :
                   loading ? 'Processing...' :
                   parseFloat(faucetData.contractBalance) < 0.0001 ? 'Insufficient Contract Balance' :
                   'Start Network-Adaptive Mining & Claim 0.0001 ETH'}
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contract Stats</h3>
            
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Your Balance</div>
                <div className="text-lg font-bold text-gray-900">{parseFloat(faucetData.userBalance).toFixed(4)} ETH</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Your Total Claimed</div>
                <div className="text-lg font-bold text-gray-900">{faucetData.totalClaimed} ETH</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Current Block</div>
                <div className="text-lg font-bold text-gray-900">{faucetData.currentBlock.toLocaleString()}</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Last Claim Block</div>
                <div className="text-lg font-bold text-gray-900">
                  {faucetData.lastClaimBlock ? faucetData.lastClaimBlock.toLocaleString() : 'Never'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Contract Address</div>
                <div className="text-xs font-mono text-gray-900 break-all">
                  {contractAddress}
                </div>
                <a 
                  href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  View on Etherscan
                </a>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">Network</div>
                <div className="text-sm font-semibold text-gray-900">
                  {chainId === 11155111 ? 'Sepolia Testnet' : `Chain ${chainId}`}
                </div>
              </div>
            </div>

            <button
              onClick={() => faucetContract && loadFaucetData(faucetContract)}
              disabled={loading}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>

        <FaucetOwnerPanel 
          faucetContract={faucetContract} 
          onUpdate={() => faucetContract && loadFaucetData(faucetContract)}
        />
      </div>
    </div>
  );
}