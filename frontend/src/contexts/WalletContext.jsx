import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { createInstance } from 'fhevmjs';
import toast from 'react-hot-toast';
import CONTRACT_ABI from '../contracts/ConfidentialWordGame.json';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [fhevmInstance, setFhevmInstance] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Contract address from environment
  const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || '';

  // Initialize FHE instance
  const initializeFHE = useCallback(async (provider, networkChainId) => {
    if (!provider) return null;

    setIsInitializing(true);
    try {
      console.log('Initializing FHE instance...');

      const instance = await createInstance({
        chainId: Number(networkChainId),
        networkUrl: provider.connection?.url || 'http://localhost:8545',
        gatewayUrl: GATEWAY_URL || undefined,
      });

      console.log('✅ FHE instance initialized');
      return instance;
    } catch (error) {
      console.warn('⚠️ FHE initialization failed (continuing in mock mode):', error.message);
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [GATEWAY_URL]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return false;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Initialize contract
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI.abi,
        signer
      );

      // Initialize FHE
      const fhevmInstance = await initializeFHE(provider, chainId);

      // Get ETH balance
      const balance = await provider.getBalance(accounts[0]);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      setFhevmInstance(fhevmInstance);
      setChainId(chainId);
      setBalance(ethers.formatEther(balance));

      toast.success(`Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      return true;
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [CONTRACT_ADDRESS, initializeFHE]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setFhevmInstance(null);
    setChainId(null);
    setBalance('0');
    toast.success('Wallet disconnected');
  }, []);

  // Handle account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, connectWallet, disconnectWallet]);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    };

    checkConnection();
  }, []);

  // Encrypt data helper
  const encrypt8 = useCallback((value) => {
    if (!fhevmInstance) {
      throw new Error('FHE not initialized');
    }
    return fhevmInstance.encrypt8(value);
  }, [fhevmInstance]);

  const encrypt32 = useCallback((value) => {
    if (!fhevmInstance) {
      throw new Error('FHE not initialized');
    }
    return fhevmInstance.encrypt32(value);
  }, [fhevmInstance]);

  const value = {
    account,
    provider,
    signer,
    contract,
    fhevmInstance,
    chainId,
    balance,
    isConnecting,
    isInitializing,
    isConnected: !!account,
    contractAddress: CONTRACT_ADDRESS,
    connectWallet,
    disconnectWallet,
    encrypt8,
    encrypt32,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};
