import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';
import toast from 'react-hot-toast';
import {
  Users,
  Clock,
  DollarSign,
  Play,
  Loader,
  ArrowLeft,
  UserPlus,
  Lock
} from 'lucide-react';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isConnected, contract, account, fhevmInstance } = useWallet();
  const { rooms, fetchRoomInfo } = useGame();

  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');

  useEffect(() => {
    if (roomId && contract) {
      loadRoomInfo();
    }
  }, [roomId, contract]);

  const loadRoomInfo = async () => {
    setIsLoading(true);
    try {
      const roomInfo = await fetchRoomInfo(roomId);
      setRoom(roomInfo);
    } catch (error) {
      console.error('Error loading room:', error);
      toast.error('Failed to load room information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!fhevmInstance) {
      toast.error('FHE instance not initialized');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) {
      toast.error('Minimum deposit is 10 tokens');
      return;
    }

    setIsJoining(true);
    const loadingToast = toast.loading('Joining room with encrypted deposit...');

    try {
      // Encrypt the deposit
      const encryptedDeposit = fhevmInstance.encrypt32(Math.floor(amount));

      const tx = await contract.depositBalance(encryptedDeposit, {
        gasLimit: 500000,
      });

      toast.loading('Confirming transaction...', { id: loadingToast });
      await tx.wait();

      toast.success('Successfully joined the room!', { id: loadingToast });

      // Reload room info
      await loadRoomInfo();

    } catch (error) {
      console.error('Error joining room:', error);

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected', { id: loadingToast });
      } else {
        toast.error(
          error.reason || error.message || 'Failed to join room',
          { id: loadingToast }
        );
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartGame = () => {
    if (room?.currentGameId > 0) {
      navigate(`/game/${room.currentGameId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold mb-2">Room Not Found</h2>
          <p className="text-gray-400 mb-6">
            The room you're looking for doesn't exist or has been closed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isInRoom = room.players?.some(
    p => p.toLowerCase() === account?.toLowerCase()
  );
  const canJoin = !isInRoom && room.playerCount < room.maxPlayers;
  const gameActive = room.currentGameId > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white flex items-center mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </button>
          <h1 className="text-3xl font-bold">Room #{roomId}</h1>
        </div>
        {gameActive && isInRoom && (
          <button
            onClick={handleStartGame}
            className="btn btn-primary"
          >
            <Play className="w-5 h-5 mr-2" />
            Join Game
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Room Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Room Status</h2>
              <span className={`badge ${gameActive ? 'bg-green-600' : 'bg-yellow-600'}`}>
                {gameActive ? 'Game In Progress' : 'Waiting for Players'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center text-gray-400 mb-1">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">Players</span>
                </div>
                <p className="text-2xl font-bold">
                  {room.playerCount} / {room.maxPlayers}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center text-gray-400 mb-1">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span className="text-sm">Entry Fee</span>
                </div>
                <p className="text-2xl font-bold">10</p>
              </div>

              {gameActive && (
                <>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center text-gray-400 mb-1">
                      <Play className="w-4 h-4 mr-2" />
                      <span className="text-sm">Game ID</span>
                    </div>
                    <p className="text-2xl font-bold">#{room.currentGameId}</p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center text-gray-400 mb-1">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="text-sm">Round Time</span>
                    </div>
                    <p className="text-2xl font-bold">60s</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Players List */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Players</h2>
            <div className="space-y-2">
              {room.players && room.players.length > 0 ? (
                room.players.map((player, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </div>
                      <span className="font-mono text-sm">
                        {player.slice(0, 6)}...{player.slice(-4)}
                      </span>
                      {player.toLowerCase() === account?.toLowerCase() && (
                        <span className="ml-2 text-xs bg-primary-600 px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">
                  No players yet. Be the first to join!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Join Card */}
          {!isConnected ? (
            <div className="card text-center">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold mb-2">Connect Wallet</h3>
              <p className="text-sm text-gray-400 mb-4">
                Connect your wallet to join this room
              </p>
            </div>
          ) : isInRoom ? (
            <div className="card">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-bold">You're In!</h3>
                <p className="text-sm text-gray-400 mt-2">
                  {gameActive
                    ? 'Game is in progress. Click "Join Game" to play.'
                    : 'Waiting for more players to join...'}
                </p>
              </div>
              {gameActive && (
                <button
                  onClick={handleStartGame}
                  className="btn btn-primary w-full"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Join Game
                </button>
              )}
            </div>
          ) : canJoin ? (
            <div className="card">
              <h3 className="font-bold mb-4">Join Room</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Deposit Amount
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="10"
                  step="1"
                  className="input w-full"
                  placeholder="100"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Min: 10 tokens (encrypted)
                </p>
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={isJoining}
                className="btn btn-primary w-full"
              >
                {isJoining ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Join Room
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="card text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold mb-2">Room Full</h3>
              <p className="text-sm text-gray-400">
                This room has reached maximum capacity
              </p>
            </div>
          )}

          {/* Info Card */}
          <div className="card bg-primary-900/20 border border-primary-700/30">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary-300 mb-1">
                  Privacy Protected
                </p>
                <p className="text-gray-400">
                  All deposits and guesses are encrypted using FHE. Your data
                  remains private on-chain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
