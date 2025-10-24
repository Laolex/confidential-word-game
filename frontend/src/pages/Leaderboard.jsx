import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Trophy, Award, Star, TrendingUp, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const Leaderboard = () => {
  const { contract, account } = useWallet();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('xp'); // 'xp' or 'wins'

  useEffect(() => {
    if (contract) {
      loadLeaderboard();
    }
  }, [contract]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, you would:
      // 1. Query PlayerRegistered events to get all players
      // 2. Fetch XP and stats for each player
      // 3. Sort and display

      // For now, we'll use mock data
      const mockData = [
        {
          address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          xp: 1250,
          gamesPlayed: 15,
          gamesWon: 8,
          winRate: 53.3,
        },
        {
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          xp: 980,
          gamesPlayed: 12,
          gamesWon: 6,
          winRate: 50.0,
        },
        {
          address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          xp: 750,
          gamesPlayed: 10,
          gamesWon: 4,
          winRate: 40.0,
        },
      ];

      setLeaderboardData(mockData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const sortedData = [...leaderboardData].sort((a, b) => {
    if (filter === 'xp') {
      return b.xp - a.xp;
    }
    return b.gamesWon - a.gamesWon;
  });

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Award className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-400" />;
      default:
        return <span className="text-gray-400 font-bold">#{rank}</span>;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-gray-300/10 border-gray-300/30';
      case 3:
        return 'bg-orange-500/10 border-orange-500/30';
      default:
        return 'bg-gray-800/50 border-gray-700/30';
    }
  };

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center">
            <Trophy className="w-8 h-8 text-yellow-400 mr-3" />
            Leaderboard
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('xp')}
              className={`btn ${
                filter === 'xp' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <Star className="w-4 h-4 mr-2" />
              XP
            </button>
            <button
              onClick={() => setFilter('wins')}
              className={`btn ${
                filter === 'wins' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Wins
            </button>
          </div>
        </div>
        <p className="text-gray-400">
          Top players competing in encrypted word games
        </p>
      </div>

      {/* Top 3 Podium */}
      {sortedData.length >= 3 && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* 2nd Place */}
          <div className="md:order-1">
            <div className="card bg-gradient-to-br from-gray-300/5 to-gray-500/5 border border-gray-300/30 text-center">
              <div className="mb-4">
                <div className="w-20 h-20 rounded-full bg-gray-300/20 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-10 h-10 text-gray-300" />
                </div>
                <div className="text-2xl font-bold mb-1">2nd</div>
                <div className="font-mono text-sm text-gray-400">
                  {sortedData[1].address.slice(0, 6)}...
                  {sortedData[1].address.slice(-4)}
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-300 mb-1">
                {filter === 'xp' ? sortedData[1].xp : sortedData[1].gamesWon}
              </div>
              <div className="text-sm text-gray-400">
                {filter === 'xp' ? 'XP' : 'Wins'}
              </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="md:order-2">
            <div className="card bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-center transform md:scale-110">
              <div className="mb-4">
                <div className="w-24 h-24 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-12 h-12 text-yellow-400" />
                </div>
                <div className="text-3xl font-bold mb-1">1st</div>
                <div className="font-mono text-sm text-gray-400">
                  {sortedData[0].address.slice(0, 6)}...
                  {sortedData[0].address.slice(-4)}
                </div>
              </div>
              <div className="text-4xl font-bold text-yellow-400 mb-1">
                {filter === 'xp' ? sortedData[0].xp : sortedData[0].gamesWon}
              </div>
              <div className="text-sm text-gray-400">
                {filter === 'xp' ? 'XP' : 'Wins'}
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="md:order-3">
            <div className="card bg-gradient-to-br from-orange-500/5 to-orange-700/5 border border-orange-500/30 text-center">
              <div className="mb-4">
                <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-10 h-10 text-orange-400" />
                </div>
                <div className="text-2xl font-bold mb-1">3rd</div>
                <div className="font-mono text-sm text-gray-400">
                  {sortedData[2].address.slice(0, 6)}...
                  {sortedData[2].address.slice(-4)}
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {filter === 'xp' ? sortedData[2].xp : sortedData[2].gamesWon}
              </div>
              <div className="text-sm text-gray-400">
                {filter === 'xp' ? 'XP' : 'Wins'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4">Rank</th>
                <th className="text-left p-4">Player</th>
                <th className="text-right p-4">XP</th>
                <th className="text-right p-4">Games</th>
                <th className="text-right p-4">Wins</th>
                <th className="text-right p-4">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser =
                  player.address.toLowerCase() === account?.toLowerCase();

                return (
                  <tr
                    key={player.address}
                    className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${
                      isCurrentUser ? 'bg-primary-900/20' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(rank)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <span className="font-mono text-sm">
                          {player.address.slice(0, 10)}...
                          {player.address.slice(-8)}
                        </span>
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-primary-600 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-primary-400">
                      {player.xp}
                    </td>
                    <td className="p-4 text-right">{player.gamesPlayed}</td>
                    <td className="p-4 text-right font-bold">
                      {player.gamesWon}
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`${
                          player.winRate >= 50
                            ? 'text-green-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {player.winRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {leaderboardData.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No players yet. Be the first!</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-400 mb-2">
            {leaderboardData.length}
          </div>
          <div className="text-gray-400">Total Players</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-400 mb-2">
            {leaderboardData.reduce((sum, p) => sum + p.gamesPlayed, 0)}
          </div>
          <div className="text-gray-400">Total Games</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-400 mb-2">
            {leaderboardData.length > 0
              ? (
                  leaderboardData.reduce((sum, p) => sum + p.winRate, 0) /
                  leaderboardData.length
                ).toFixed(1)
              : 0}
            %
          </div>
          <div className="text-gray-400">Avg Win Rate</div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
