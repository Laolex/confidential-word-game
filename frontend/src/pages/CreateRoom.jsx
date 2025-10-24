import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { Plus, Users, DollarSign, Lock, Loader } from 'lucide-react';

const CreateRoom = () => {
  const navigate = useNavigate();
  const { isConnected, contract, fhevmInstance } = useWallet();
  const { refreshRooms } = useGame();

  const [formData, setFormData] = useState({
    roomName: '',
    deposit: '100',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!fhevmInstance) {
      toast.error('FHE instance not initialized. Please reconnect your wallet.');
      return;
    }

    if (!formData.roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    const depositAmount = parseFloat(formData.deposit);
    if (isNaN(depositAmount) || depositAmount < 10) {
      toast.error('Minimum deposit is 10 tokens');
      return;
    }

    setIsCreating(true);
    const loadingToast = toast.loading('Creating encrypted room...');

    try {
      // Encrypt the deposit amount using FHE
      const encryptedDeposit = fhevmInstance.encrypt32(Math.floor(depositAmount));

      console.log('Creating room with encrypted deposit:', {
        roomName: formData.roomName,
        depositAmount,
        encryptedDeposit: encryptedDeposit.toString(),
      });

      // Create room with encrypted deposit
      const tx = await contract.depositBalance(encryptedDeposit, {
        gasLimit: 500000,
      });

      toast.loading('Waiting for transaction confirmation...', { id: loadingToast });

      const receipt = await tx.wait();

      // Find the RoomCreated event
      const roomCreatedEvent = receipt.logs
        .map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(parsed => parsed && parsed.name === 'BalanceDeposited');

      if (roomCreatedEvent) {
        const roomId = roomCreatedEvent.args.player;
        toast.success('Room created successfully!', { id: loadingToast });

        // Refresh rooms list
        await refreshRooms();

        // Navigate to the room
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.success('Deposit made successfully!', { id: loadingToast });
        await refreshRooms();
        navigate('/');
      }

    } catch (error) {
      console.error('Error creating room:', error);

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user', { id: loadingToast });
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient balance', { id: loadingToast });
      } else {
        toast.error(
          error.reason || error.message || 'Failed to create room',
          { id: loadingToast }
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to create a game room
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create Game Room</h1>
        <p className="text-gray-400">
          Set up a new encrypted word guessing game
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Room Name
            </label>
            <input
              type="text"
              id="roomName"
              name="roomName"
              value={formData.roomName}
              onChange={handleChange}
              placeholder="Enter room name"
              className="input w-full"
              maxLength={32}
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              Choose a memorable name for your room
            </p>
          </div>

          {/* Deposit Amount */}
          <div>
            <label htmlFor="deposit" className="block text-sm font-medium mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Initial Deposit (Tokens)
            </label>
            <input
              type="number"
              id="deposit"
              name="deposit"
              value={formData.deposit}
              onChange={handleChange}
              placeholder="100"
              min="10"
              step="1"
              className="input w-full"
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              Minimum deposit: 10 tokens. This will be encrypted on-chain.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-primary-900/20 border border-primary-700/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary-300 mb-1">
                  Fully Encrypted
                </p>
                <p className="text-gray-400">
                  Your deposit amount will be encrypted using Fully Homomorphic
                  Encryption (FHE) before being stored on-chain. Nobody can see
                  your actual balance.
                </p>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium mb-1">Entry Fee</h4>
              <p className="text-2xl font-bold text-primary-400">10 Tokens</p>
              <p className="text-sm text-gray-400 mt-1">
                Per game entry
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium mb-1">Max Players</h4>
              <p className="text-2xl font-bold text-primary-400">5</p>
              <p className="text-sm text-gray-400 mt-1">
                Players per room
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary flex-1"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Room
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* How It Works */}
      <div className="card mt-6">
        <h3 className="text-xl font-bold mb-4">How It Works</h3>
        <ol className="space-y-3 text-gray-300">
          <li className="flex items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold mr-3 flex-shrink-0">
              1
            </span>
            <span>
              Create a room with your encrypted deposit
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold mr-3 flex-shrink-0">
              2
            </span>
            <span>
              Wait for other players to join (2+ players required)
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold mr-3 flex-shrink-0">
              3
            </span>
            <span>
              Game starts automatically when ready
            </span>
          </li>
          <li className="flex items-start">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold mr-3 flex-shrink-0">
              4
            </span>
            <span>
              Submit encrypted guesses and compete to win!
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default CreateRoom;
