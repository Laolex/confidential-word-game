import React, { useState, useEffect } from 'react';
import { createWordGameSDK } from '../WordGameSDK';

// Import deployed contract info
import contractDeployment from '../../deployments/sepolia-deployment.json';
import contractABI from '../../deployments/sepolia-abi.json';

/**
 * Example React Component for Word Game
 */
export default function GameRoom() {
  const [sdk, setSdk] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [hasBalance, setHasBalance] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [gameId, setGameId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guess, setGuess] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [constants, setConstants] = useState(null);

  // Initialize SDK
  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) {
          setStatus('Please install MetaMask');
          return;
        }

        const gameSDK = await createWordGameSDK(
          contractDeployment.contractAddress,
          contractABI
        );

        setSdk(gameSDK);

        const address = await gameSDK.getAddress();
        setUserAddress(address);

        const hasUserBalance = await gameSDK.hasBalance();
        setHasBalance(hasUserBalance);

        const consts = await gameSDK.getConstants();
        setConstants(consts);

        setStatus('Connected!');

        // Setup event listeners
        setupEventListeners(gameSDK);
      } catch (error) {
        console.error('Initialization error:', error);
        setStatus('Failed to connect: ' + error.message);
      }
    };

    init();

    return () => {
      if (sdk) {
        sdk.removeAllListeners();
      }
    };
  }, []);

  // Setup event listeners
  const setupEventListeners = (gameSDK) => {
    gameSDK.on('RoomCreated', (roomId, creator, timestamp) => {
      console.log('Room created:', roomId.toString());
      if (creator.toLowerCase() === userAddress?.toLowerCase()) {
        setStatus(`✅ Room ${roomId.toString()} created!`);
        setRoomId(roomId.toString());
      }
    });

    gameSDK.on('PlayerJoined', (roomId, player, displayName) => {
      console.log('Player joined:', displayName);
      setStatus(`👤 ${displayName} joined room ${roomId.toString()}`);
    });

    gameSDK.on('GameStarted', (roomId, gameId, wordLength, startTime) => {
      console.log('Game started:', gameId.toString());
      setStatus(`🎮 Game started! Word length: ${wordLength}`);
      setGameId(gameId.toString());
    });

    gameSDK.on('GuessSubmitted', (gameId, player, requestId, attemptNumber) => {
      if (player.toLowerCase() === userAddress?.toLowerCase()) {
        setStatus(`⏳ Guess submitted (attempt ${attemptNumber}), waiting for validation...`);
      }
    });

    gameSDK.on('GuessValidated', (gameId, player, isCorrect, attemptNumber) => {
      if (player.toLowerCase() === userAddress?.toLowerCase()) {
        if (isCorrect) {
          setStatus(`✅ Correct guess! You advance to the next round!`);
        } else {
          setStatus(`❌ Wrong guess (attempt ${attemptNumber}). Try again!`);
        }
      }
    });

    gameSDK.on('RoundCompleted', (gameId, qualifiedCount, qualifiedPlayers) => {
      setStatus(`🏁 Round complete! ${qualifiedCount} players qualified`);
    });

    gameSDK.on('GameEnded', (gameId, winner, timestamp) => {
      if (winner !== '0x0000000000000000000000000000000000000000') {
        if (winner.toLowerCase() === userAddress?.toLowerCase()) {
          setStatus(`🏆 You won the game! Congratulations!`);
        } else {
          setStatus(`Game ended. Winner: ${winner}`);
        }
      } else {
        setStatus(`Game ended with no winner`);
      }
    });

    gameSDK.on('XPAwarded', (player, amount, reason) => {
      if (player.toLowerCase() === userAddress?.toLowerCase()) {
        setStatus(`⭐ +${amount} XP (${reason})`);
      }
    });
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      window.location.reload();
    } catch (error) {
      setStatus('Failed to connect wallet: ' + error.message);
    }
  };

  // Deposit balance
  const handleDeposit = async (amount) => {
    setLoading(true);
    setStatus('Depositing balance...');

    try {
      await sdk.depositBalance(amount);
      setStatus(`✅ Deposited ${amount} ETH`);
      setHasBalance(true);
    } catch (error) {
      setStatus('Deposit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Request balance decryption
  const handleCheckBalance = async () => {
    setLoading(true);
    setStatus('Requesting balance decryption...');

    try {
      const requestId = await sdk.requestBalanceDecryption();
      setStatus(`Balance decryption requested. Check events for result.`);

      // Listen for BalanceWithdrawn event
      const listener = sdk.on('BalanceWithdrawn', (player, amount, timestamp) => {
        if (player.toLowerCase() === userAddress.toLowerCase()) {
          setBalance(amount.toString());
          setStatus(`Your balance: ${amount.toString()} wei`);
          sdk.off('BalanceWithdrawn');
        }
      });
    } catch (error) {
      setStatus('Failed to check balance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create room
  const handleCreateRoom = async () => {
    if (!displayName) {
      setStatus('Please enter a display name');
      return;
    }

    setLoading(true);
    setStatus('Creating room...');

    try {
      const result = await sdk.createRoom(displayName);
      setRoomId(result.roomId);
      // Status set by event listener
    } catch (error) {
      setStatus('Failed to create room: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Join room
  const handleJoinRoom = async () => {
    if (!roomId || !displayName) {
      setStatus('Please enter room ID and display name');
      return;
    }

    setLoading(true);
    setStatus('Joining room...');

    try {
      await sdk.joinRoom(roomId, displayName);
      // Status set by event listener
    } catch (error) {
      setStatus('Failed to join room: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit guess
  const handleSubmitGuess = async () => {
    if (!gameId || !guess) {
      setStatus('Please enter game ID and guess');
      return;
    }

    setLoading(true);
    setStatus('Submitting guess...');

    try {
      await sdk.submitGuess(gameId, guess);
      setGuess('');
      // Status set by event listener
    } catch (error) {
      setStatus('Failed to submit guess: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh room info
  const handleRefreshRoom = async () => {
    if (!roomId) return;

    try {
      const info = await sdk.getRoomInfo(roomId);
      setRoomInfo(info);

      if (userAddress) {
        const pInfo = await sdk.getPlayerInfo(roomId, userAddress);
        setPlayerInfo(pInfo);
      }
    } catch (error) {
      console.error('Failed to refresh room:', error);
    }
  };

  // Refresh game info
  const handleRefreshGame = async () => {
    if (!gameId) return;

    try {
      const info = await sdk.getGameInfo(gameId);
      setGameInfo(info);
    } catch (error) {
      console.error('Failed to refresh game:', error);
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (roomId) {
      handleRefreshRoom();
      const interval = setInterval(handleRefreshRoom, 5000);
      return () => clearInterval(interval);
    }
  }, [roomId, userAddress]);

  useEffect(() => {
    if (gameId) {
      handleRefreshGame();
      const interval = setInterval(handleRefreshGame, 3000);
      return () => clearInterval(interval);
    }
  }, [gameId]);

  if (!sdk) {
    return (
      <div className="game-container">
        <h1>Confidential Word Game</h1>
        <button onClick={connectWallet}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="game-container">
      <h1>🎮 Confidential Word Game</h1>

      {/* User Info */}
      <div className="user-info">
        <p><strong>Address:</strong> {userAddress?.slice(0, 10)}...{userAddress?.slice(-8)}</p>
        <p><strong>Has Balance:</strong> {hasBalance ? '✅ Yes' : '❌ No'}</p>
        {balance && <p><strong>Balance:</strong> {balance} wei</p>}
      </div>

      {/* Status */}
      {status && (
        <div className="status-message">
          {status}
        </div>
      )}

      {/* Constants */}
      {constants && (
        <div className="game-constants">
          <h3>Game Rules</h3>
          <ul>
            <li>Entry Fee: {constants.entryFee} ETH</li>
            <li>Max Players: {constants.maxPlayersPerRoom}</li>
            <li>Round Time: {constants.roundTimeLimit}s</li>
            <li>Max Attempts: {constants.maxAttemptsPerRound}</li>
            <li>Word Lengths: {constants.initialWordLength}-{constants.maxWordLength} letters</li>
          </ul>
        </div>
      )}

      {/* Balance Management */}
      <div className="section">
        <h2>💰 Balance</h2>
        <button onClick={() => handleDeposit(100)} disabled={loading}>
          Deposit 100 ETH
        </button>
        <button onClick={handleCheckBalance} disabled={loading || !hasBalance}>
          Check Balance
        </button>
      </div>

      {/* Room Management */}
      {hasBalance && (
        <div className="section">
          <h2>🏠 Room</h2>

          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <button onClick={handleCreateRoom} disabled={loading}>
            Create Room
          </button>

          <div className="join-room">
            <input
              type="number"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={handleJoinRoom} disabled={loading}>
              Join Room
            </button>
          </div>

          {roomInfo && (
            <div className="room-info">
              <h3>Room #{roomInfo.id}</h3>
              <p>Creator: {roomInfo.creator}</p>
              <p>Players: {roomInfo.playerCount}/{constants?.maxPlayersPerRoom}</p>
              <p>Status: {roomInfo.isActive ? '🟢 Active' : '🔴 Inactive'}</p>
              <p>Current Game: {roomInfo.currentGameId !== '0' ? roomInfo.currentGameId : 'None'}</p>
            </div>
          )}

          {playerInfo && (
            <div className="player-info">
              <h3>Your Stats</h3>
              <p>Score: {playerInfo.score}</p>
              <p>Rounds Won: {playerInfo.roundsWon}</p>
              <p>Attempts Used: {playerInfo.attemptsUsed}/{constants?.maxAttemptsPerRound}</p>
              <p>Has Guessed: {playerInfo.hasGuessed ? 'Yes' : 'No'}</p>
              <p>Is Correct: {playerInfo.isCorrect ? '✅' : '❌'}</p>
            </div>
          )}
        </div>
      )}

      {/* Game Play */}
      {roomId && (
        <div className="section">
          <h2>🎯 Play</h2>

          {gameInfo && (
            <div className="game-info">
              <h3>Game #{gameInfo.id}</h3>
              <p>Word Length: {gameInfo.wordLength} letters</p>
              <p>Time Left: {gameInfo.timeLeft}s</p>
              <p>Qualified: {gameInfo.qualifiedPlayerCount}</p>
              <p>Status: {gameInfo.isComplete ? '✅ Complete' : '🎮 In Progress'}</p>
            </div>
          )}

          <input
            type="text"
            placeholder="Game ID (from events)"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />

          <div className="guess-section">
            <input
              type="text"
              placeholder="Your guess (e.g., CAT)"
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              maxLength={gameInfo?.wordLength || 5}
            />
            <button
              onClick={handleSubmitGuess}
              disabled={loading || !gameId || !guess}
            >
              Submit Guess
            </button>
          </div>
        </div>
      )}

      {loading && <div className="loader">Loading...</div>}
    </div>
  );
}
