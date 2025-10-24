import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Clock, Play, Lock, Shield, Zap } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';

const Home = () => {
  const { isConnected } = useWallet();
  const { rooms, fetchRooms } = useGame();
  const [filter, setFilter] = useState('all'); // all, waiting, playing

  useEffect(() => {
    if (isConnected) {
      fetchRooms();
      const interval = setInterval(fetchRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchRooms]);

  const filteredRooms = rooms.filter(room => {
    if (filter === 'waiting') return room.currentGameId === 0;
    if (filter === 'playing') return room.currentGameId > 0;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Fully Encrypted</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Confidential Word Game
          </h1>
          <p className="text-lg text-primary-100 mb-6">
            Play word guessing games with complete privacy using Fully Homomorphic Encryption (FHE).
            Your balances, guesses, and game state remain encrypted on-chain.
          </p>
          <div className="flex flex-wrap gap-4">
            {isConnected ? (
              <Link to="/create-room" className="btn bg-white text-primary-700 hover:bg-primary-50">
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </Link>
            ) : (
              <button className="btn bg-white text-primary-700 hover:bg-primary-50" disabled>
                Connect Wallet to Play
              </button>
            )}
            <a
              href="https://docs.zama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-primary-700 text-white hover:bg-primary-800"
            >
              Learn About FHE
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <Shield className="w-10 h-10 text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Private Balances</h3>
          <p className="text-gray-600 text-sm">
            Your token balances are encrypted on-chain. Only you can see your funds.
          </p>
        </div>
        <div className="card">
          <Lock className="w-10 h-10 text-purple-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Encrypted Guesses</h3>
          <p className="text-gray-600 text-sm">
            All guesses are encrypted character-by-character using FHE technology.
          </p>
        </div>
        <div className="card">
          <Zap className="w-10 h-10 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Fast & Secure</h3>
          <p className="text-gray-600 text-sm">
            Gateway-based validation ensures privacy without compromising speed.
          </p>
        </div>
      </div>

      {/* Rooms Section */}
      {isConnected && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
              <p className="text-gray-600 mt-1">Join an existing room or create your own</p>
            </div>
            <Link to="/create-room" className="btn-primary">
              <Plus className="w-5 h-5 mr-2" />
              New Room
            </Link>
          </div>

          {/* Filters */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All ({rooms.length})
            </button>
            <button
              onClick={() => setFilter('waiting')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'waiting' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Waiting ({rooms.filter(r => r.currentGameId === 0).length})
            </button>
            <button
              onClick={() => setFilter('playing')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'playing' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              In Game ({rooms.filter(r => r.currentGameId > 0).length})
            </button>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No rooms available</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all'
                  ? 'Be the first to create a room!'
                  : `No ${filter} rooms at the moment`
                }
              </p>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')} className="btn-secondary">
                  Show All Rooms
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map((room) => (
                <Link
                  key={room.roomId}
                  to={`/room/${room.roomId}`}
                  className="card hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        Room #{room.roomId}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(room.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`badge ${room.currentGameId > 0 ? 'badge-success' : 'badge-warning'}`}>
                      {room.currentGameId > 0 ? 'In Game' : 'Waiting'}
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{room.playerCount} / 5 players</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{new Date(room.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Created by {room.creator.slice(0, 6)}...{room.creator.slice(-4)}
                      </span>
                      <Play className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Not Connected State */}
      {!isConnected && (
        <div className="card text-center py-12">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600">
            Connect your wallet to view available rooms and start playing!
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
