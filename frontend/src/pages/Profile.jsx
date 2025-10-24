import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import {
  User,
  DollarSign,
  Star,
  Trophy,
  TrendingUp,
  Lock,
  Eye,
  Loader,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

const Profile = () => {
  const { isConnected, account, contract, fhevmInstance } = useWallet();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  useEffect(() => {
    if (isConnected && contract && account) {
      loadProfile();
    }
  }, [isConnected, contract, account]);

  const loadProfile = async () => {
    if (!contract || !account) return;

    setIsLoading(true);
    try {
      // Fetch player data
      const [xp, gamesPlayed, encryptedBalance] = await Promise.all([
        contract.playerXP(account),
        contract.playerGamesPlayed(account),
        contract.playerBalances(account),
      ]);

      // In a real app, you would decrypt the balance using FHE
      // For now, we'll just show it's encrypted
      setProfile({
        address: account,
        xp: Number(xp),
        gamesPlayed: Number(gamesPlayed),
        encryptedBalance: encryptedBalance.toString(),
        // Mock additional stats
        gamesWon: Math.floor(Number(gamesPlayed) * 0.4),
        rank: 1,
        winRate: 40.0,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');

      // Set default values on error
      setProfile({
        address: account,
        xp: 0,
        gamesPlayed: 0,
        encryptedBalance: '0',
        gamesWon: 0,
        rank: 0,
        winRate: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
    toast.success('Profile refreshed!');
  };

  const handleDecryptBalance = async () => {
    if (!fhevmInstance) {
      toast.error('FHE instance not initialized');
      return;
    }

    toast.info('Balance decryption would require gateway callback in production');
    setShowBalance(!showBalance);
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to view your profile
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-gray-400">Track your performance and stats</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary"
        >
          {isRefreshing ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh
            </>
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Profile Card */}
        <div className="md:col-span-2 space-y-6">
          {/* Player Info */}
          <div className="card bg-gradient-to-br from-primary-900/40 to-purple-900/40 border border-primary-700/30">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">Player</h2>
                  <p className="font-mono text-sm text-gray-400">
                    {profile?.address?.slice(0, 10)}...
                    {profile?.address?.slice(-8)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-400">
                  #{profile?.rank || '-'}
                </div>
                <div className="text-sm text-gray-400">Global Rank</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold mb-1">
                  {profile?.xp || 0}
                </div>
                <div className="text-sm text-gray-400">XP</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <Trophy className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold mb-1">
                  {profile?.gamesWon || 0}
                </div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <TrendingUp className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <div className="text-2xl font-bold mb-1">
                  {profile?.winRate || 0}%
                </div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Encrypted Balance */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center">
                <DollarSign className="w-6 h-6 text-primary-400 mr-2" />
                Encrypted Balance
              </h3>
              <button
                onClick={handleDecryptBalance}
                className="btn btn-secondary btn-sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showBalance ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6">
              {showBalance ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-400 mb-2">
                    ??? Tokens
                  </div>
                  <p className="text-sm text-gray-400">
                    Balance decryption requires gateway callback
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Lock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <div className="font-mono text-sm text-gray-400 mb-2">
                    Encrypted: {profile?.encryptedBalance?.slice(0, 20)}...
                  </div>
                  <p className="text-xs text-gray-500">
                    Your balance is fully encrypted on-chain
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 bg-primary-900/20 border border-primary-700/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-primary-300 mb-1">
                    Privacy Protected
                  </p>
                  <p className="text-gray-400">
                    Your token balance is encrypted using Fully Homomorphic
                    Encryption. Only you can request decryption via the FHE
                    gateway.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Game Statistics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Games Played</span>
                  <span className="font-bold">{profile?.gamesPlayed || 0}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500"
                    style={{
                      width: `${Math.min((profile?.gamesPlayed / 100) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Games Won</span>
                  <span className="font-bold">{profile?.gamesWon || 0}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        profile?.gamesPlayed > 0
                          ? (profile?.gamesWon / profile?.gamesPlayed) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Experience Points</span>
                  <span className="font-bold">{profile?.xp || 0} XP</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${Math.min((profile?.xp / 1000) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Games</span>
                <span className="font-bold text-lg">
                  {profile?.gamesPlayed || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Wins</span>
                <span className="font-bold text-lg text-green-400">
                  {profile?.gamesWon || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total XP</span>
                <span className="font-bold text-lg text-yellow-400">
                  {profile?.xp || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Win Rate</span>
                <span className={`font-bold text-lg ${
                  (profile?.winRate || 0) >= 50 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {profile?.winRate?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Achievements</h3>
            <div className="space-y-3">
              <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                (profile?.gamesPlayed || 0) >= 1
                  ? 'bg-primary-600/20 border border-primary-700/30'
                  : 'bg-gray-800/30 opacity-50'
              }`}>
                <Trophy className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="font-bold text-sm">First Game</div>
                  <div className="text-xs text-gray-400">Play your first game</div>
                </div>
              </div>

              <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                (profile?.gamesWon || 0) >= 1
                  ? 'bg-primary-600/20 border border-primary-700/30'
                  : 'bg-gray-800/30 opacity-50'
              }`}>
                <Star className="w-6 h-6 text-green-400" />
                <div>
                  <div className="font-bold text-sm">First Win</div>
                  <div className="text-xs text-gray-400">Win your first game</div>
                </div>
              </div>

              <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                (profile?.xp || 0) >= 1000
                  ? 'bg-primary-600/20 border border-primary-700/30'
                  : 'bg-gray-800/30 opacity-50'
              }`}>
                <TrendingUp className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="font-bold text-sm">1000 XP</div>
                  <div className="text-xs text-gray-400">Earn 1000 XP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="card bg-gray-800/50">
            <h3 className="text-lg font-bold mb-3">Account</h3>
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Address</div>
                <div className="font-mono text-xs break-all bg-gray-900/50 p-2 rounded">
                  {profile?.address}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
