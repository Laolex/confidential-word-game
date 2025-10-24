import React, { useState } from 'react';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';

const WalletButton = () => {
  const { account, balance, isConnecting, isConnected, connectWallet, disconnectWallet, chainId } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    toast.success('Address copied!');
    setIsDropdownOpen(false);
  };

  const viewOnExplorer = () => {
    const explorerUrl = chainId === 1337 || chainId === 31337
      ? `http://localhost:8545` // Local
      : chainId === 11155111
      ? `https://sepolia.etherscan.io/address/${account}`
      : `https://explorer.zama.ai/address/${account}`;

    window.open(explorerUrl, '_blank');
    setIsDropdownOpen(false);
  };

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="btn-primary flex items-center space-x-2"
      >
        {isConnecting ? (
          <>
            <div className="spinner" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-900">{formatAddress(account)}</span>
        </div>
        <div className="flex items-center space-x-2 pl-3 border-l border-gray-300">
          <span className="text-sm font-semibold text-gray-700">
            {parseFloat(balance).toFixed(4)} ETH
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 animate-fade-in">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Connected Account</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{formatAddress(account)}</p>
              <p className="text-sm text-gray-600 mt-1">{parseFloat(balance).toFixed(6)} ETH</p>
            </div>

            <button
              onClick={copyAddress}
              className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 text-left"
            >
              <Copy className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">Copy Address</span>
            </button>

            <button
              onClick={viewOnExplorer}
              className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 text-left"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">View on Explorer</span>
            </button>

            <div className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => {
                  disconnectWallet();
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-red-50 text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WalletButton;
