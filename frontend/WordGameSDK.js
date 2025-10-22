import { ethers } from 'ethers';
import { createInstance } from 'fhevmjs';

/**
 * WordGameSDK - Frontend SDK for Confidential Word Game
 *
 * Handles:
 * - FHE encryption/decryption
 * - Contract interactions
 * - Event listening
 * - Balance management
 */
export class WordGameSDK {
  constructor(contractAddress, contractABI) {
    this.contractAddress = contractAddress;
    this.contractABI = contractABI;
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.fhevmInstance = null;
    this.eventListeners = new Map();
  }

  /**
   * Initialize SDK with Web3 provider
   * @param {Object} ethereum - window.ethereum or provider
   */
  async initialize(ethereum) {
    try {
      // Setup provider and signer
      this.provider = new ethers.BrowserProvider(ethereum);
      this.signer = await this.provider.getSigner();

      // Initialize contract
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.signer
      );

      // Initialize fhEVM
      const network = await this.provider.getNetwork();
      this.fhevmInstance = await createInstance({
        chainId: Number(network.chainId),
        networkUrl: await this.provider.connection?.url || window.location.origin,
        gatewayUrl: this._getGatewayUrl(Number(network.chainId))
      });

      console.log('✅ SDK initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize SDK:', error);
      throw error;
    }
  }

  /**
   * Get Gateway URL based on chain ID
   */
  _getGatewayUrl(chainId) {
    const gateways = {
      8009: 'https://gateway.devnet.zama.ai', // Zama devnet
      9000: 'https://gateway.testnet.zama.ai', // Zama testnet
      31337: 'http://localhost:7077' // Local
    };
    return gateways[chainId] || 'http://localhost:7077';
  }

  /**
   * Get current user address
   */
  async getAddress() {
    const address = await this.signer.getAddress();
    return address;
  }

  /**
   * Encrypt amount for deposit
   * @param {number|string} amount - Amount to encrypt (in wei or ether)
   * @param {boolean} isEther - Whether amount is in ether (true) or wei (false)
   */
  async encryptAmount(amount, isEther = true) {
    const amountWei = isEther ? ethers.parseEther(amount.toString()) : BigInt(amount);
    const amountNumber = Number(amountWei);

    // Encrypt as euint32 (max 4.2 billion wei, ~4.2 gwei)
    // For larger amounts, use euint64 or euint128
    const encrypted = this.fhevmInstance.encrypt32(amountNumber);

    return {
      data: encrypted.data,
      signature: encrypted.signature
    };
  }

  /**
   * Deposit encrypted balance
   * @param {number} amountEther - Amount in ether
   */
  async depositBalance(amountEther) {
    try {
      const encrypted = await this.encryptAmount(amountEther, true);

      const tx = await this.contract.depositBalance(
        encrypted.data,
        encrypted.signature
      );

      const receipt = await tx.wait();
      console.log('✅ Balance deposited:', receipt.hash);

      return receipt;
    } catch (error) {
      console.error('Failed to deposit balance:', error);
      throw error;
    }
  }

  /**
   * Get encrypted balance
   * @returns {Object} Encrypted balance (ciphertext)
   */
  async getEncryptedBalance() {
    try {
      const encryptedBalance = await this.contract.getEncryptedBalance();
      return encryptedBalance;
    } catch (error) {
      console.error('Failed to get encrypted balance:', error);
      throw error;
    }
  }

  /**
   * Request balance decryption
   * NOTE: This triggers Gateway decryption, result comes via event
   */
  async requestBalanceDecryption() {
    try {
      const tx = await this.contract.requestBalanceDecryption();
      const receipt = await tx.wait();

      // Extract request ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'BalanceCheckRequested';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        return parsed.args.gatewayRequestId;
      }

      return receipt;
    } catch (error) {
      console.error('Failed to request balance decryption:', error);
      throw error;
    }
  }

  /**
   * Create a new game room
   * @param {string} displayName - Player display name
   */
  async createRoom(displayName) {
    try {
      const tx = await this.contract.createRoom(displayName);
      const receipt = await tx.wait();

      // Extract room ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'RoomCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        return {
          roomId: parsed.args.roomId.toString(),
          receipt
        };
      }

      return { receipt };
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  /**
   * Join an existing room
   * @param {number|string} roomId - Room ID
   * @param {string} displayName - Player display name
   */
  async joinRoom(roomId, displayName) {
    try {
      const tx = await this.contract.joinRoom(roomId, displayName);
      const receipt = await tx.wait();

      console.log('✅ Joined room:', roomId);
      return receipt;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  /**
   * Encrypt a word for submission
   * @param {string} word - The word to encrypt
   */
  async encryptWord(word) {
    const letters = word.toUpperCase().split('');
    const encryptedLetters = [];
    const inputProofs = [];

    for (const letter of letters) {
      const letterCode = letter.charCodeAt(0); // 65-90 for A-Z

      if (letterCode < 65 || letterCode > 90) {
        throw new Error(`Invalid letter: ${letter}`);
      }

      const encrypted = this.fhevmInstance.encrypt8(letterCode);
      encryptedLetters.push(encrypted.data);
      inputProofs.push(encrypted.signature);
    }

    return { encryptedLetters, inputProofs };
  }

  /**
   * Submit a guess
   * @param {number|string} gameId - Game ID
   * @param {string} guess - The guessed word
   */
  async submitGuess(gameId, guess) {
    try {
      const { encryptedLetters, inputProofs } = await this.encryptWord(guess);

      const tx = await this.contract.submitGuess(
        gameId,
        encryptedLetters,
        inputProofs,
        {
          gasLimit: 2000000 // Higher gas limit for FHE operations
        }
      );

      const receipt = await tx.wait();
      console.log('✅ Guess submitted:', receipt.hash);

      // Extract request ID
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'GuessSubmitted';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        return {
          requestId: parsed.args.gatewayRequestId.toString(),
          receipt
        };
      }

      return { receipt };
    } catch (error) {
      console.error('Failed to submit guess:', error);
      throw error;
    }
  }

  /**
   * Get room information
   * @param {number|string} roomId - Room ID
   */
  async getRoomInfo(roomId) {
    try {
      const info = await this.contract.getRoomInfo(roomId);

      return {
        id: info.id.toString(),
        creator: info.creator,
        playerCount: Number(info.playerCount),
        isActive: info.isActive,
        createdAt: Number(info.createdAt),
        currentGameId: info.currentGameId.toString(),
        playerAddresses: info.playerAddresses
      };
    } catch (error) {
      console.error('Failed to get room info:', error);
      throw error;
    }
  }

  /**
   * Get player information in a room
   * @param {number|string} roomId - Room ID
   * @param {string} playerAddress - Player address (optional, defaults to current user)
   */
  async getPlayerInfo(roomId, playerAddress = null) {
    try {
      const address = playerAddress || await this.getAddress();
      const info = await this.contract.getPlayerInfo(roomId, address);

      return {
        wallet: info.wallet,
        score: Number(info.score),
        roundsWon: Number(info.roundsWon),
        isActive: info.isActive,
        hasGuessed: info.hasGuessed,
        isCorrect: info.isCorrect,
        attemptsUsed: Number(info.attemptsUsed),
        displayName: info.displayName
      };
    } catch (error) {
      console.error('Failed to get player info:', error);
      throw error;
    }
  }

  /**
   * Get game information
   * @param {number|string} gameId - Game ID
   */
  async getGameInfo(gameId) {
    try {
      const info = await this.contract.getGameInfo(gameId);

      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(info.roundEndTime);
      const timeLeft = Math.max(0, endTime - now);

      return {
        id: info.id.toString(),
        roomId: info.roomId.toString(),
        wordLength: Number(info.wordLength),
        currentStage: Number(info.currentStage),
        roundStartTime: Number(info.roundStartTime),
        roundEndTime: endTime,
        timeLeft: timeLeft,
        qualifiedPlayerCount: Number(info.qualifiedPlayerCount),
        isComplete: info.isComplete
      };
    } catch (error) {
      console.error('Failed to get game info:', error);
      throw error;
    }
  }

  /**
   * Get qualified players for a game
   * @param {number|string} gameId - Game ID
   */
  async getQualifiedPlayers(gameId) {
    try {
      const players = await this.contract.getQualifiedPlayers(gameId);
      return players;
    } catch (error) {
      console.error('Failed to get qualified players:', error);
      throw error;
    }
  }

  /**
   * Get player XP
   * @param {string} playerAddress - Player address (optional)
   */
  async getPlayerXP(playerAddress = null) {
    try {
      const address = playerAddress || await this.getAddress();
      const xp = await this.contract.getPlayerXP(address);
      return Number(xp);
    } catch (error) {
      console.error('Failed to get player XP:', error);
      throw error;
    }
  }

  /**
   * Listen to contract events
   * @param {string} eventName - Event name
   * @param {function} callback - Callback function
   */
  on(eventName, callback) {
    const listener = (...args) => {
      callback(...args);
    };

    this.contract.on(eventName, listener);
    this.eventListeners.set(eventName, listener);

    return () => this.off(eventName);
  }

  /**
   * Remove event listener
   * @param {string} eventName - Event name
   */
  off(eventName) {
    const listener = this.eventListeners.get(eventName);
    if (listener) {
      this.contract.off(eventName, listener);
      this.eventListeners.delete(eventName);
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this.contract.removeAllListeners();
    this.eventListeners.clear();
  }

  /**
   * Get contract constants
   */
  async getConstants() {
    return {
      maxPlayersPerRoom: Number(await this.contract.MAX_PLAYERS_PER_ROOM()),
      entryFee: ethers.formatEther(await this.contract.ENTRY_FEE()),
      roundTimeLimit: Number(await this.contract.ROUND_TIME_LIMIT()),
      maxAttemptsPerRound: Number(await this.contract.MAX_ATTEMPTS_PER_ROUND()),
      initialWordLength: Number(await this.contract.INITIAL_WORD_LENGTH()),
      maxWordLength: Number(await this.contract.MAX_WORD_LENGTH())
    };
  }

  /**
   * Check if user has balance
   */
  async hasBalance(address = null) {
    const addr = address || await this.getAddress();
    return await this.contract.hasBalance(addr);
  }
}

/**
 * Helper function to create SDK instance from deployed contract
 * @param {string} contractAddress - Contract address
 * @param {string} abiPath - Path to ABI JSON file
 */
export async function createWordGameSDK(contractAddress, contractABI) {
  const sdk = new WordGameSDK(contractAddress, contractABI);

  // Auto-initialize if MetaMask is available
  if (typeof window !== 'undefined' && window.ethereum) {
    await sdk.initialize(window.ethereum);
  }

  return sdk;
}

export default WordGameSDK;
