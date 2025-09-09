'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

interface WalletState {
  account: string | null;
  isConnected: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  balance: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    account: null,
    isConnected: false,
    provider: null,
    signer: null,
    chainId: null,
    balance: null,
    isLoading: false,
    error: null,
  });

  const connectWallet = useCallback(async () => {
    setWallet(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const provider = await detectEthereumProvider();
      
      if (!provider) {
        throw new Error('Please install MetaMask or another Ethereum wallet');
      }

      const ethProvider = new ethers.BrowserProvider(provider as any);
      const accounts = await ethProvider.send('eth_requestAccounts', []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const signer = await ethProvider.getSigner();
      const network = await ethProvider.getNetwork();
      const balance = await ethProvider.getBalance(accounts[0]);
      const balanceInEth = ethers.formatEther(balance);

      setWallet(prev => ({
        ...prev,
        account: accounts[0],
        isConnected: true,
        provider: ethProvider,
        signer,
        chainId: Number(network.chainId),
        balance: parseFloat(balanceInEth).toFixed(4),
        isLoading: false,
        error: null,
      }));

    } catch (error: any) {
      setWallet(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({
      account: null,
      isConnected: false,
      provider: null,
      signer: null,
      chainId: null,
      balance: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const provider = await detectEthereumProvider();
      if (!provider) return;

      const ethProvider = new ethers.BrowserProvider(provider as any);
      const accounts = await ethProvider.listAccounts();
      
      if (accounts.length > 0) {
        const signer = await ethProvider.getSigner();
        const network = await ethProvider.getNetwork();
        const balance = await ethProvider.getBalance(accounts[0].address);
        const balanceInEth = ethers.formatEther(balance);
        
        setWallet(prev => ({
          ...prev,
          account: accounts[0].address,
          isConnected: true,
          provider: ethProvider,
          signer,
          chainId: Number(network.chainId),
          balance: parseFloat(balanceInEth).toFixed(4),
        }));
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWallet(prev => ({
          ...prev,
          account: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWallet(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16),
      }));
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection, disconnectWallet]);

  return {
    ...wallet,
    connectWallet,
    disconnectWallet,
  };
};