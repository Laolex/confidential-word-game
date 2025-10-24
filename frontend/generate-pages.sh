#!/bin/bash

# This script generates all remaining frontend page files
# Run: chmod +x generate-pages.sh && ./generate-pages.sh

echo "Generating frontend pages..."

# Create CreateRoom.jsx
cat > src/pages/CreateRoom.jsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Coins } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import toast from 'react-hot-toast';

const CreateRoom = () => {
  const { contract, encrypt32, isConnected } = useWallet();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [depositAmount, setDepositAmount] = useState('100');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    setIsCreating(true);
    try {
      // First deposit balance if needed
      const amount = parseFloat(depositAmount);
      const encryptedAmount = encrypt32(amount);

      toast.loading('Depositing balance...');
      const depositTx = await contract.depositBalance(
        encryptedAmount.data,
        encryptedAmount.proof
      );
      await depositTx.wait();
      toast.dismiss();
      toast.success('Balance deposited!');

      // Create room
      toast.loading('Creating room...');
      const createTx = await contract.createRoom(displayName.trim());
      const receipt = await createTx.wait();

      // Extract room ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'RoomCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        const roomId = parsed.args[0].toString();
        toast.dismiss();
        toast.success('Room created!');
        navigate(`/room/${roomId}`);
      }
    } catch (error) {
      console.error('Create room error:', error);
      toast.dismiss();
      toast.error(error.reason || error.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card text-center">
          <p className="text-gray-600">Please connect your wallet to create a room.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/')} className="btn-secondary mb-6 flex items-center">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Rooms
      </button>

      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Room</h1>
            <p className="text-gray-600 text-sm">Set up your game room</p>
          </div>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="input"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {displayName.length}/20 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Deposit (Encrypted)
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="100"
                min="1"
                className="input pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This amount will be encrypted and deposited to your on-chain balance
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Game Rules</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Entry fee: 10 ETH per game (deducted from encrypted balance)</li>
              <li>• 2-5 players per room</li>
              <li>• 3 rounds: 3-letter, 4-letter, and 5-letter words</li>
              <li>• 2 attempts per round, 60 seconds time limit</li>
              <li>• Winner takes the prize pool!</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="btn-primary w-full"
          >
            {isCreating ? (
              <>
                <div className="spinner mr-2" />
                Creating Room...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;
EOF

echo "✓ Created src/pages/CreateRoom.jsx"

# Create remaining placeholder pages
cat > src/pages/Room.jsx << 'EOF'
import React from 'react';
import { useParams } from 'react-router-dom';

const Room = () => {
  const { roomId } = useParams();

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Room #{roomId}</h1>
      <p>Room page - waiting for players and game start</p>
    </div>
  );
};

export default Room;
EOF

cat > src/pages/GamePlay.jsx << 'EOF'
import React from 'react';
import { useParams } from 'react-router-dom';

const GamePlay = () => {
  const { gameId } = useParams();

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Game #{gameId}</h1>
      <p>Game play page - submit guesses here</p>
    </div>
  );
};

export default GamePlay;
EOF

cat > src/pages/Leaderboard.jsx << 'EOF'
import React from 'react';
import { Trophy } from 'lucide-react';

const Leaderboard = () => {
  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>
      <p className="text-gray-600">Top players coming soon!</p>
    </div>
  );
};

export default Leaderboard;
EOF

cat > src/pages/Profile.jsx << 'EOF'
import React from 'react';
import { User } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';

const Profile = () => {
  const { account } = useWallet();
  const { playerXP } = useGame();

  return (
    <div className="card">
      <div className="flex items-center space-x-3 mb-6">
        <User className="w-8 h-8 text-primary-600" />
        <h1 className="text-2xl font-bold">Your Profile</h1>
      </div>
      {account && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-mono text-sm">{account}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total XP</p>
            <p className="text-2xl font-bold text-primary-600">{playerXP}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
EOF

echo "✓ Created all page files"
echo "✓ Frontend page generation complete!"
EOF

chmod +x generate-pages.sh
