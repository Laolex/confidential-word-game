import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import toast from 'react-hot-toast';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { contract, account, isConnected } = useWallet();

  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [playerXP, setPlayerXP] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch all rooms
  const fetchRooms = useCallback(async () => {
    if (!contract) return;

    try {
      const roomCounter = await contract.roomCounter();
      const roomsData = [];

      for (let i = 1; i <= roomCounter; i++) {
        try {
          const roomInfo = await contract.getRoomInfo(i);
          if (roomInfo.isActive) {
            roomsData.push({
              roomId: i,
              creator: roomInfo.creator,
              playerCount: Number(roomInfo.playerCount),
              isActive: roomInfo.isActive,
              createdAt: new Date(Number(roomInfo.createdAt) * 1000),
              currentGameId: Number(roomInfo.currentGameId),
              players: roomInfo.playerAddresses,
            });
          }
        } catch (error) {
          console.error(`Error fetching room ${i}:`, error);
        }
      }

      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }, [contract]);

  // Fetch current game info
  const fetchGameInfo = useCallback(async (gameId) => {
    if (!contract || !gameId) return null;

    try {
      const gameInfo = await contract.getGameInfo(gameId);
      const qualifiedPlayers = await contract.getQualifiedPlayers(gameId);

      return {
        gameId,
        roomId: Number(gameInfo.roomId),
        wordLength: Number(gameInfo.wordLength),
        currentStage: Number(gameInfo.currentStage),
        roundStartTime: new Date(Number(gameInfo.roundStartTime) * 1000),
        roundEndTime: new Date(Number(gameInfo.roundEndTime) * 1000),
        qualifiedPlayerCount: Number(gameInfo.qualifiedPlayerCount),
        isComplete: gameInfo.isComplete,
        qualifiedPlayers,
      };
    } catch (error) {
      console.error('Error fetching game info:', error);
      return null;
    }
  }, [contract]);

  // Fetch player info in a room
  const fetchPlayerInfo = useCallback(async (roomId) => {
    if (!contract || !account || !roomId) return null;

    try {
      const playerInfo = await contract.getPlayerInfo(roomId, account);
      return {
        wallet: playerInfo.wallet,
        score: Number(playerInfo.score),
        roundsWon: Number(playerInfo.roundsWon),
        isActive: playerInfo.isActive,
        hasGuessed: playerInfo.hasGuessed,
        isCorrect: playerInfo.isCorrect,
        attemptsUsed: Number(playerInfo.attemptsUsed),
        displayName: playerInfo.displayName,
      };
    } catch (error) {
      console.error('Error fetching player info:', error);
      return null;
    }
  }, [contract, account]);

  // Fetch player XP
  const fetchPlayerXP = useCallback(async () => {
    if (!contract || !account) return;

    try {
      const xp = await contract.getPlayerXP(account);
      setPlayerXP(Number(xp));
    } catch (error) {
      console.error('Error fetching player XP:', error);
    }
  }, [contract, account]);

  // Listen to events
  useEffect(() => {
    if (!contract) return;

    const handleRoomCreated = (roomId) => {
      console.log('Room created:', roomId.toString());
      fetchRooms();
    };

    const handlePlayerJoined = (roomId, player) => {
      console.log('Player joined:', player);
      fetchRooms();
      if (player.toLowerCase() === account?.toLowerCase()) {
        setCurrentRoom(Number(roomId));
      }
    };

    const handleGameStarted = (roomId, gameId, wordLength) => {
      console.log('Game started:', { roomId: roomId.toString(), gameId: gameId.toString() });
      toast.success(`Game #${gameId.toString()} started! ${wordLength} letter word.`);
      if (currentRoom === Number(roomId)) {
        fetchGameInfo(Number(gameId)).then(setCurrentGame);
      }
    };

    const handleGuessValidated = (gameId, player, isCorrect) => {
      if (player.toLowerCase() === account?.toLowerCase()) {
        if (isCorrect) {
          toast.success('🎉 Correct guess!');
        } else {
          toast.error('❌ Incorrect guess');
        }
        if (currentRoom) {
          fetchPlayerInfo(currentRoom).then(setPlayerInfo);
        }
      }
    };

    const handleGameEnded = (gameId, winner) => {
      console.log('Game ended:', { gameId: gameId.toString(), winner });
      if (winner.toLowerCase() === account?.toLowerCase()) {
        toast.success('🏆 You won the game!');
      } else if (winner !== '0x0000000000000000000000000000000000000000') {
        toast('Game ended!');
      }
      fetchPlayerXP();
    };

    const handleXPAwarded = (player, amount, reason) => {
      if (player.toLowerCase() === account?.toLowerCase()) {
        toast.success(`⭐ +${amount.toString()} XP: ${reason}`);
        fetchPlayerXP();
      }
    };

    contract.on('RoomCreated', handleRoomCreated);
    contract.on('PlayerJoined', handlePlayerJoined);
    contract.on('GameStarted', handleGameStarted);
    contract.on('GuessValidated', handleGuessValidated);
    contract.on('GameEnded', handleGameEnded);
    contract.on('XPAwarded', handleXPAwarded);

    return () => {
      contract.off('RoomCreated', handleRoomCreated);
      contract.off('PlayerJoined', handlePlayerJoined);
      contract.off('GameStarted', handleGameStarted);
      contract.off('GuessValidated', handleGuessValidated);
      contract.off('GameEnded', handleGameEnded);
      contract.off('XPAwarded', handleXPAwarded);
    };
  }, [contract, account, currentRoom, fetchRooms, fetchGameInfo, fetchPlayerInfo, fetchPlayerXP]);

  // Initial fetch
  useEffect(() => {
    if (isConnected) {
      fetchRooms();
      fetchPlayerXP();
    }
  }, [isConnected, fetchRooms, fetchPlayerXP]);

  const value = {
    rooms,
    currentRoom,
    currentGame,
    playerInfo,
    playerXP,
    loading,
    fetchRooms,
    fetchGameInfo,
    fetchPlayerInfo,
    setCurrentRoom,
    setCurrentGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
