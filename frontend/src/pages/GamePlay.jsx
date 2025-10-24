import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useGame } from '../contexts/GameContext';
import toast from 'react-hot-toast';
import {
  Send,
  Loader,
  ArrowLeft,
  Clock,
  Users,
  Trophy,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const GamePlay = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { isConnected, contract, account, fhevmInstance } = useWallet();
  const { fetchGameInfo } = useGame();

  const [game, setGame] = useState(null);
  const [guess, setGuess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [guessHistory, setGuessHistory] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [letterInputs, setLetterInputs] = useState([]);

  useEffect(() => {
    if (gameId && contract) {
      loadGameInfo();
      const interval = setInterval(loadGameInfo, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [gameId, contract]);

  // Countdown timer
  useEffect(() => {
    if (!game || game.status === 'completed') return;

    const calculateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const endTime = Math.floor(game.roundEndTime?.getTime() / 1000) || now + 60;
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, [game]);

  // Initialize letter inputs when game loads
  useEffect(() => {
    if (game?.wordLength) {
      setLetterInputs(Array(game.wordLength).fill(''));
    }
  }, [game?.wordLength]);

  const loadGameInfo = async () => {
    try {
      const gameInfo = await fetchGameInfo(gameId);
      setGame(gameInfo);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading game:', error);
      toast.error('Failed to load game information');
      setIsLoading(false);
    }
  };

  const handleLetterChange = (index, value) => {
    const newValue = value.toUpperCase().replace(/[^A-Z]/g, '');
    const newInputs = [...letterInputs];
    newInputs[index] = newValue.slice(-1); // Only take last character
    setLetterInputs(newInputs);
    setGuess(newInputs.join(''));

    // Auto-focus next input
    if (newValue && index < letterInputs.length - 1) {
      const nextInput = document.getElementById(`letter-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleLetterKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !letterInputs[index] && index > 0) {
      const prevInput = document.getElementById(`letter-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmitGuess = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!fhevmInstance) {
      toast.error('FHE instance not initialized');
      return;
    }

    if (!guess.trim()) {
      toast.error('Please enter a guess');
      return;
    }

    if (guess.length !== game?.wordLength) {
      toast.error(`Word must be ${game?.wordLength} letters`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Encrypting and submitting guess...');

    try {
      // Convert guess to number (could be improved with better encoding)
      const guessValue = guess
        .toLowerCase()
        .split('')
        .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 96), 0);

      // Encrypt the guess
      const encryptedGuess = fhevmInstance.encrypt32(guessValue);

      console.log('Submitting encrypted guess:', {
        guess: guess.toLowerCase(),
        guessValue,
        gameId,
      });

      const tx = await contract.submitGuess(gameId, encryptedGuess, {
        gasLimit: 500000,
      });

      toast.loading('Validating guess...', { id: loadingToast });
      const receipt = await tx.wait();

      // Add to local history
      setGuessHistory([
        ...guessHistory,
        {
          guess: guess.toLowerCase(),
          timestamp: Date.now(),
          status: 'pending',
        },
      ]);

      toast.success('Guess submitted!', { id: loadingToast });
      setGuess('');

      // Reload game info
      await loadGameInfo();

    } catch (error) {
      console.error('Error submitting guess:', error);

      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected', { id: loadingToast });
      } else if (error.message?.includes('not qualified')) {
        toast.error('You are not qualified for this game', { id: loadingToast });
      } else if (error.message?.includes('already guessed')) {
        toast.error('You already made a guess this round', { id: loadingToast });
      } else {
        toast.error(
          error.reason || error.message || 'Failed to submit guess',
          { id: loadingToast }
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
          <p className="text-gray-400 mb-6">
            The game you're looking for doesn't exist or has ended.
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

  const isPlayer = game.players?.some(
    p => p.toLowerCase() === account?.toLowerCase()
  );
  const gameEnded = game.status === 'completed';
  const hasWinner = game.winner && game.winner !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white flex items-center mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lobby
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Game #{gameId}</h1>
            <p className="text-gray-400">Room #{game.roomId}</p>
          </div>
          <div className="flex items-center space-x-4">
            {gameEnded ? (
              <span className="badge bg-gray-600">Game Ended</span>
            ) : (
              <>
                <span className="badge bg-green-600">Round {game.round}</span>
                <span className="badge bg-yellow-600">
                  <Clock className="w-4 h-4 mr-1" />
                  {game.timeRemaining || 60}s
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Word Info Card */}
          <div className="card bg-gradient-to-br from-primary-900/40 to-purple-900/40 border border-primary-700/30">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Secret Word</h2>
              <div className="flex justify-center space-x-2 mb-4">
                {Array.from({ length: game.wordLength || 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center text-2xl font-bold"
                  >
                    ?
                  </div>
                ))}
              </div>
              <p className="text-gray-400">
                <Lock className="w-4 h-4 inline mr-1" />
                {game.wordLength} letter word (encrypted)
              </p>
            </div>
          </div>

          {/* Guess Input */}
          {!gameEnded && isPlayer && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Your Guess</h3>
              <form onSubmit={handleSubmitGuess} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                    placeholder={`Enter ${game.wordLength} letter word`}
                    maxLength={game.wordLength}
                    className="input w-full text-lg uppercase text-center"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    {guess.length} / {game.wordLength} letters
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || guess.length !== game.wordLength}
                  className="btn btn-primary w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Encrypted Guess
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Game Status */}
          {gameEnded && (
            <div className="card">
              {hasWinner ? (
                <div className="text-center">
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Game Complete!</h2>
                  <p className="text-gray-400 mb-4">
                    Winner:{' '}
                    <span className="font-mono text-white">
                      {game.winner.slice(0, 6)}...{game.winner.slice(-4)}
                    </span>
                  </p>
                  {game.winner.toLowerCase() === account?.toLowerCase() && (
                    <p className="text-green-400 font-bold">
                      Congratulations! You won!
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Game Ended</h2>
                  <p className="text-gray-400">No winner this round</p>
                </div>
              )}
            </div>
          )}

          {/* Guess History */}
          {guessHistory.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Your Guesses</h3>
              <div className="space-y-2">
                {guessHistory.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                  >
                    <span className="font-mono uppercase">{item.guess}</span>
                    <span className="text-sm text-gray-400">
                      {item.status === 'pending' ? (
                        <Clock className="w-4 h-4 text-yellow-400" />
                      ) : item.status === 'correct' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Players */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">
              <Users className="w-5 h-5 inline mr-2" />
              Players ({game.qualifiedCount || 0})
            </h3>
            <div className="space-y-2">
              {game.players?.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2"
                >
                  <span className="font-mono text-sm">
                    {player.slice(0, 6)}...{player.slice(-4)}
                  </span>
                  {player.toLowerCase() === account?.toLowerCase() && (
                    <span className="text-xs bg-primary-600 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
              )) || <p className="text-gray-400 text-sm">No players</p>}
            </div>
          </div>

          {/* Game Stats */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Round</span>
                <span className="font-bold">{game.round || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Qualified Players</span>
                <span className="font-bold">{game.qualifiedCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Word Length</span>
                <span className="font-bold">{game.wordLength || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`badge ${gameEnded ? 'bg-gray-600' : 'bg-green-600'}`}>
                  {gameEnded ? 'Ended' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="card bg-primary-900/20 border border-primary-700/30">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary-300 mb-1">
                  Encrypted Gameplay
                </p>
                <p className="text-gray-400">
                  All guesses are encrypted before submission. The game logic
                  validates answers without revealing the secret word.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePlay;
