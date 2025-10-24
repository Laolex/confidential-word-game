import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Trophy, User, Menu, X, Lock } from 'lucide-react';
import WalletButton from './WalletButton';
import { useWallet } from '../contexts/WalletContext';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isConnected } = useWallet();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/create-room', label: 'Create Room', icon: Plus },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Confidential Word Game</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Fully Encrypted On-Chain</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
                    ${isActive(path)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            {/* Wallet Button */}
            <div className="flex items-center space-x-4">
              <WalletButton />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 animate-slide-up">
              <nav className="flex flex-col space-y-2">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all
                      ${isActive(path)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected && location.pathname !== '/' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Please connect your wallet to access this feature.
            </p>
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-primary-600" />
              <span className="text-sm text-gray-600">
                Powered by <span className="font-semibold">Zama fhEVM</span>
              </span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-600">
              <a href="https://docs.zama.ai" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">
                Docs
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">
                GitHub
              </a>
              <a href="#" className="hover:text-primary-600">
                About
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
