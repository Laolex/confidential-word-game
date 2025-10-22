const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Event Listener for Confidential Word Game
 *
 * Monitors and logs all contract events in real-time
 * - Pretty console output with colors
 * - JSON file logging for analysis
 * - Filtering by room/game/player
 */

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Emojis for different event types
const emojis = {
  room: '🏠',
  player: '👤',
  game: '🎮',
  guess: '🎯',
  prize: '💰',
  balance: '💵',
  xp: '⭐',
  relayer: '🤖',
  error: '❌',
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
};

class EventListener {
  constructor(contractAddress, options = {}) {
    this.contractAddress = contractAddress;
    this.options = {
      logToFile: options.logToFile !== false, // Default true
      logToConsole: options.logToConsole !== false, // Default true
      logFilePath: options.logFilePath || path.join(__dirname, '..', 'logs', 'events.json'),
      filterRoomId: options.filterRoomId || null,
      filterGameId: options.filterGameId || null,
      filterPlayer: options.filterPlayer || null,
    };

    this.contract = null;
    this.provider = null;
    this.startTime = Date.now();
    this.eventCount = 0;

    // Ensure logs directory exists
    if (this.options.logToFile) {
      const logDir = path.dirname(this.options.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  async initialize() {
    this.log('info', 'Initializing event listener...');

    try {
      // Load contract ABI
      const artifactPath = path.join(
        __dirname,
        '..',
        'artifacts',
        'contracts',
        'ConfidentialWordGame.sol',
        'ConfidentialWordGame.json'
      );

      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      // Get provider and contract
      this.provider = ethers.provider;
      this.contract = new ethers.Contract(
        this.contractAddress,
        artifact.abi,
        this.provider
      );

      // Test connection
      const network = await this.provider.getNetwork();
      this.log('success', `Connected to network: ${network.name} (chainId: ${network.chainId})`);
      this.log('success', `Listening to contract: ${this.contractAddress}`);

      // Display filters if any
      if (this.options.filterRoomId) {
        this.log('info', `Filtering by Room ID: ${this.options.filterRoomId}`);
      }
      if (this.options.filterGameId) {
        this.log('info', `Filtering by Game ID: ${this.options.filterGameId}`);
      }
      if (this.options.filterPlayer) {
        this.log('info', `Filtering by Player: ${this.options.filterPlayer}`);
      }

      this.log('info', 'Listening for events... (Press Ctrl+C to stop)\n');

    } catch (error) {
      this.log('error', `Failed to initialize: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start listening to all events
   */
  startListening() {
    // Room events
    this.contract.on('RoomCreated', (roomId, creator, timestamp, event) => {
      this.handleRoomCreated(roomId, creator, timestamp, event);
    });

    this.contract.on('PlayerJoined', (roomId, player, displayName, event) => {
      this.handlePlayerJoined(roomId, player, displayName, event);
    });

    // Game events
    this.contract.on('GameStarted', (roomId, gameId, wordLength, startTime, event) => {
      this.handleGameStarted(roomId, gameId, wordLength, startTime, event);
    });

    this.contract.on('EncryptedWordSet', (gameId, wordLength, event) => {
      this.handleEncryptedWordSet(gameId, wordLength, event);
    });

    // Guess events
    this.contract.on('GuessSubmitted', (gameId, player, gatewayRequestId, attemptNumber, event) => {
      this.handleGuessSubmitted(gameId, player, gatewayRequestId, attemptNumber, event);
    });

    this.contract.on('GuessValidated', (gameId, player, isCorrect, attemptNumber, event) => {
      this.handleGuessValidated(gameId, player, isCorrect, attemptNumber, event);
    });

    // Round/Game completion events
    this.contract.on('RoundCompleted', (gameId, qualifiedPlayerCount, qualifiedPlayers, event) => {
      this.handleRoundCompleted(gameId, qualifiedPlayerCount, qualifiedPlayers, event);
    });

    this.contract.on('GameEnded', (gameId, winner, timestamp, event) => {
      this.handleGameEnded(gameId, winner, timestamp, event);
    });

    // Prize events
    this.contract.on('PrizeDistributed', (gameId, player, position, event) => {
      this.handlePrizeDistributed(gameId, player, position, event);
    });

    // Balance events
    this.contract.on('BalanceDeposited', (player, timestamp, event) => {
      this.handleBalanceDeposited(player, timestamp, event);
    });

    this.contract.on('BalanceWithdrawn', (player, amount, timestamp, event) => {
      this.handleBalanceWithdrawn(player, amount, timestamp, event);
    });

    this.contract.on('BalanceCheckRequested', (player, gatewayRequestId, event) => {
      this.handleBalanceCheckRequested(player, gatewayRequestId, event);
    });

    // XP events
    this.contract.on('XPAwarded', (player, amount, reason, event) => {
      this.handleXPAwarded(player, amount, reason, event);
    });

    // Relayer events
    this.contract.on('RelayerProposed', (currentRelayer, proposedRelayer, effectiveTime, event) => {
      this.handleRelayerProposed(currentRelayer, proposedRelayer, effectiveTime, event);
    });

    this.contract.on('RelayerAccepted', (previousRelayer, newRelayer, event) => {
      this.handleRelayerAccepted(previousRelayer, newRelayer, event);
    });

    this.contract.on('RelayerTransferCanceled', (canceledRelayer, event) => {
      this.handleRelayerTransferCanceled(canceledRelayer, event);
    });
  }

  // Event Handlers

  handleRoomCreated(roomId, creator, timestamp, event) {
    if (this.shouldFilter({ roomId })) return;

    this.logEvent({
      type: 'RoomCreated',
      emoji: emojis.room,
      color: colors.green,
      data: {
        roomId: roomId.toString(),
        creator,
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
      },
      event,
    });
  }

  handlePlayerJoined(roomId, player, displayName, event) {
    if (this.shouldFilter({ roomId })) return;

    this.logEvent({
      type: 'PlayerJoined',
      emoji: emojis.player,
      color: colors.blue,
      data: {
        roomId: roomId.toString(),
        player,
        displayName,
      },
      event,
    });
  }

  handleGameStarted(roomId, gameId, wordLength, startTime, event) {
    if (this.shouldFilter({ roomId, gameId })) return;

    this.logEvent({
      type: 'GameStarted',
      emoji: emojis.game,
      color: colors.magenta,
      data: {
        roomId: roomId.toString(),
        gameId: gameId.toString(),
        wordLength: wordLength.toString(),
        startTime: new Date(startTime.toNumber() * 1000).toISOString(),
      },
      event,
    });
  }

  handleEncryptedWordSet(gameId, wordLength, event) {
    if (this.shouldFilter({ gameId })) return;

    this.logEvent({
      type: 'EncryptedWordSet',
      emoji: '🔐',
      color: colors.cyan,
      data: {
        gameId: gameId.toString(),
        wordLength: wordLength.toString(),
      },
      event,
    });
  }

  handleGuessSubmitted(gameId, player, gatewayRequestId, attemptNumber, event) {
    if (this.shouldFilter({ gameId, player })) return;

    this.logEvent({
      type: 'GuessSubmitted',
      emoji: emojis.guess,
      color: colors.yellow,
      data: {
        gameId: gameId.toString(),
        player,
        gatewayRequestId: gatewayRequestId.toString(),
        attemptNumber: attemptNumber.toString(),
      },
      event,
    });
  }

  handleGuessValidated(gameId, player, isCorrect, attemptNumber, event) {
    if (this.shouldFilter({ gameId, player })) return;

    this.logEvent({
      type: 'GuessValidated',
      emoji: isCorrect ? emojis.success : emojis.error,
      color: isCorrect ? colors.green : colors.red,
      data: {
        gameId: gameId.toString(),
        player,
        isCorrect,
        attemptNumber: attemptNumber.toString(),
      },
      event,
    });
  }

  handleRoundCompleted(gameId, qualifiedPlayerCount, qualifiedPlayers, event) {
    if (this.shouldFilter({ gameId })) return;

    this.logEvent({
      type: 'RoundCompleted',
      emoji: '🏁',
      color: colors.bright + colors.blue,
      data: {
        gameId: gameId.toString(),
        qualifiedPlayerCount: qualifiedPlayerCount.toString(),
        qualifiedPlayers,
      },
      event,
    });
  }

  handleGameEnded(gameId, winner, timestamp, event) {
    if (this.shouldFilter({ gameId })) return;

    this.logEvent({
      type: 'GameEnded',
      emoji: '🎊',
      color: colors.bright + colors.magenta,
      data: {
        gameId: gameId.toString(),
        winner: winner === ethers.ZeroAddress ? 'No winner' : winner,
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
      },
      event,
    });
  }

  handlePrizeDistributed(gameId, player, position, event) {
    if (this.shouldFilter({ gameId, player })) return;

    this.logEvent({
      type: 'PrizeDistributed',
      emoji: emojis.prize,
      color: colors.bright + colors.yellow,
      data: {
        gameId: gameId.toString(),
        player,
        position: position.toString(),
      },
      event,
    });
  }

  handleBalanceDeposited(player, timestamp, event) {
    if (this.shouldFilter({ player })) return;

    this.logEvent({
      type: 'BalanceDeposited',
      emoji: emojis.balance,
      color: colors.green,
      data: {
        player,
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
      },
      event,
    });
  }

  handleBalanceWithdrawn(player, amount, timestamp, event) {
    if (this.shouldFilter({ player })) return;

    this.logEvent({
      type: 'BalanceWithdrawn',
      emoji: '💸',
      color: colors.yellow,
      data: {
        player,
        amount: amount.toString(),
        timestamp: new Date(timestamp.toNumber() * 1000).toISOString(),
      },
      event,
    });
  }

  handleBalanceCheckRequested(player, gatewayRequestId, event) {
    if (this.shouldFilter({ player })) return;

    this.logEvent({
      type: 'BalanceCheckRequested',
      emoji: '🔍',
      color: colors.cyan,
      data: {
        player,
        gatewayRequestId: gatewayRequestId.toString(),
      },
      event,
    });
  }

  handleXPAwarded(player, amount, reason, event) {
    if (this.shouldFilter({ player })) return;

    this.logEvent({
      type: 'XPAwarded',
      emoji: emojis.xp,
      color: colors.bright + colors.yellow,
      data: {
        player,
        amount: amount.toString(),
        reason,
      },
      event,
    });
  }

  handleRelayerProposed(currentRelayer, proposedRelayer, effectiveTime, event) {
    this.logEvent({
      type: 'RelayerProposed',
      emoji: emojis.relayer,
      color: colors.yellow,
      data: {
        currentRelayer,
        proposedRelayer,
        effectiveTime: new Date(effectiveTime.toNumber() * 1000).toISOString(),
      },
      event,
    });
  }

  handleRelayerAccepted(previousRelayer, newRelayer, event) {
    this.logEvent({
      type: 'RelayerAccepted',
      emoji: emojis.success,
      color: colors.green,
      data: {
        previousRelayer,
        newRelayer,
      },
      event,
    });
  }

  handleRelayerTransferCanceled(canceledRelayer, event) {
    this.logEvent({
      type: 'RelayerTransferCanceled',
      emoji: emojis.warning,
      color: colors.red,
      data: {
        canceledRelayer,
      },
      event,
    });
  }

  // Utility Methods

  shouldFilter({ roomId, gameId, player }) {
    if (this.options.filterRoomId && roomId) {
      if (roomId.toString() !== this.options.filterRoomId.toString()) {
        return true;
      }
    }

    if (this.options.filterGameId && gameId) {
      if (gameId.toString() !== this.options.filterGameId.toString()) {
        return true;
      }
    }

    if (this.options.filterPlayer && player) {
      if (player.toLowerCase() !== this.options.filterPlayer.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  logEvent({ type, emoji, color, data, event }) {
    this.eventCount++;

    const timestamp = new Date().toISOString();
    const blockNumber = event.blockNumber;
    const txHash = event.transactionHash;

    const eventData = {
      timestamp,
      blockNumber,
      txHash,
      type,
      data,
    };

    // Log to console
    if (this.options.logToConsole) {
      console.log(`\n${color}${emoji} ${type}${colors.reset} ${colors.dim}(Block ${blockNumber})${colors.reset}`);

      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && Array.isArray(value)) {
          console.log(`  ${key}: [${value.length} items]`);
          value.forEach((item, index) => {
            console.log(`    ${index + 1}. ${this.formatAddress(item)}`);
          });
        } else {
          console.log(`  ${key}: ${this.formatValue(key, value)}`);
        }
      });

      console.log(`  ${colors.dim}TX: ${txHash}${colors.reset}`);
    }

    // Log to file
    if (this.options.logToFile) {
      const logLine = JSON.stringify(eventData) + '\n';
      fs.appendFileSync(this.options.logFilePath, logLine);
    }
  }

  formatValue(key, value) {
    if (key.toLowerCase().includes('address') || key === 'player' || key === 'creator' || key === 'winner') {
      return this.formatAddress(value);
    }
    return value;
  }

  formatAddress(address) {
    if (address === ethers.ZeroAddress) {
      return '0x0 (zero address)';
    }
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  }

  log(type, message) {
    const emoji = emojis[type] || emojis.info;
    const color = type === 'error' ? colors.red :
                  type === 'success' ? colors.green :
                  type === 'warning' ? colors.yellow :
                  colors.cyan;

    console.log(`${color}${emoji} ${message}${colors.reset}`);
  }

  printStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    console.log(`\n${colors.bright}=== Event Listener Statistics ===${colors.reset}`);
    console.log(`${emojis.info} Events captured: ${this.eventCount}`);
    console.log(`${emojis.info} Uptime: ${uptime}s`);
    console.log(`${emojis.info} Log file: ${this.options.logFilePath}`);
  }

  stop() {
    this.printStats();
    this.contract.removeAllListeners();
    this.log('info', 'Event listener stopped');
  }
}

// Main execution
async function main() {
  const contractAddress = process.env.GAME_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error(`${colors.red}${emojis.error} Error: GAME_CONTRACT_ADDRESS environment variable not set${colors.reset}`);
    console.log(`${emojis.info} Usage: export GAME_CONTRACT_ADDRESS=0x... && npm run events:listen`);
    process.exit(1);
  }

  const options = {
    filterRoomId: process.env.FILTER_ROOM_ID || null,
    filterGameId: process.env.FILTER_GAME_ID || null,
    filterPlayer: process.env.FILTER_PLAYER || null,
  };

  const listener = new EventListener(contractAddress, options);

  try {
    await listener.initialize();
    listener.startListening();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n');
      listener.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error(`${colors.red}${emojis.error} Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { EventListener };
