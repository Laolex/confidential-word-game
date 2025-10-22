const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Game Monitor for Confidential Word Game
 *
 * Provides real-time monitoring and statistics for:
 * - Active rooms and player counts
 * - Ongoing games with countdown timers
 * - Recent winners and prize distributions
 * - Game statistics and analytics
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class GameMonitor {
  constructor(contractAddress, refreshInterval = 5000) {
    this.contractAddress = contractAddress;
    this.refreshInterval = refreshInterval;
    this.contract = null;
    this.provider = null;

    this.stats = {
      totalRooms: 0,
      totalGames: 0,
      activeRooms: [],
      activeGames: [],
      recentWinners: [],
      totalPlayersActive: 0,
    };
  }

  async initialize() {
    console.log(`${colors.cyan}🎮 Initializing Game Monitor...${colors.reset}\n`);

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
      console.log(`${colors.green}✅ Connected to network: ${network.name}${colors.reset}`);
      console.log(`${colors.green}✅ Contract: ${this.contractAddress}${colors.reset}\n`);

      // Get initial counters
      this.stats.totalRooms = await this.contract.roomCounter();
      this.stats.totalGames = await this.contract.gameCounter();

    } catch (error) {
      console.error(`${colors.red}❌ Failed to initialize: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  async fetchActiveRooms() {
    const activeRooms = [];

    for (let roomId = 1; roomId <= this.stats.totalRooms; roomId++) {
      try {
        const roomInfo = await this.contract.getRoomInfo(roomId);

        if (roomInfo.isActive) {
          activeRooms.push({
            roomId,
            creator: roomInfo.creator,
            playerCount: roomInfo.playerCount,
            createdAt: new Date(roomInfo.createdAt.toNumber() * 1000),
            currentGameId: roomInfo.currentGameId.toNumber(),
            players: roomInfo.playerAddresses,
          });
        }
      } catch (error) {
        // Room might not exist or error fetching
        continue;
      }
    }

    this.stats.activeRooms = activeRooms;
    this.stats.totalPlayersActive = activeRooms.reduce((sum, room) => sum + room.playerCount, 0);
  }

  async fetchActiveGames() {
    const activeGames = [];

    for (let gameId = 1; gameId <= this.stats.totalGames; gameId++) {
      try {
        const gameInfo = await this.contract.getGameInfo(gameId);

        if (!gameInfo.isComplete) {
          const now = Math.floor(Date.now() / 1000);
          const endTime = gameInfo.roundEndTime.toNumber();
          const timeLeft = Math.max(0, endTime - now);

          const qualifiedPlayers = await this.contract.getQualifiedPlayers(gameId);

          activeGames.push({
            gameId,
            roomId: gameInfo.roomId.toNumber(),
            wordLength: gameInfo.wordLength,
            startTime: new Date(gameInfo.roundStartTime.toNumber() * 1000),
            endTime: new Date(endTime * 1000),
            timeLeft,
            qualifiedPlayerCount: gameInfo.qualifiedPlayerCount,
            qualifiedPlayers,
          });
        }
      } catch (error) {
        continue;
      }
    }

    this.stats.activeGames = activeGames;
  }

  async fetchRecentWinners(limit = 5) {
    const winners = [];

    // Listen to recent GameEnded events
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last ~1000 blocks

    try {
      const filter = this.contract.filters.GameEnded();
      const events = await this.contract.queryFilter(filter, fromBlock, currentBlock);

      for (const event of events.slice(-limit)) {
        const [gameId, winner, timestamp] = event.args;

        if (winner !== ethers.ZeroAddress) {
          winners.push({
            gameId: gameId.toString(),
            winner,
            timestamp: new Date(timestamp.toNumber() * 1000),
            blockNumber: event.blockNumber,
          });
        }
      }
    } catch (error) {
      // Might fail on some networks
    }

    this.stats.recentWinners = winners.reverse(); // Most recent first
  }

  clearScreen() {
    console.clear();
  }

  displayHeader() {
    const now = new Date().toLocaleString();

    console.log(`${colors.bright}${colors.magenta}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║         CONFIDENTIAL WORD GAME - LIVE MONITOR             ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.dim}Last updated: ${now}${colors.reset}`);
    console.log(`${colors.dim}Auto-refresh: every ${this.refreshInterval / 1000}s${colors.reset}\n`);
  }

  displayOverview() {
    console.log(`${colors.bright}${colors.cyan}📊 OVERVIEW${colors.reset}`);
    console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`  Total Rooms Created:  ${colors.bright}${this.stats.totalRooms}${colors.reset}`);
    console.log(`  Total Games Played:   ${colors.bright}${this.stats.totalGames}${colors.reset}`);
    console.log(`  Active Rooms:         ${colors.green}${this.stats.activeRooms.length}${colors.reset}`);
    console.log(`  Active Games:         ${colors.green}${this.stats.activeGames.length}${colors.reset}`);
    console.log(`  Players Online:       ${colors.yellow}${this.stats.totalPlayersActive}${colors.reset}`);
    console.log();
  }

  displayActiveRooms() {
    console.log(`${colors.bright}${colors.blue}🏠 ACTIVE ROOMS${colors.reset}`);
    console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    if (this.stats.activeRooms.length === 0) {
      console.log(`  ${colors.dim}No active rooms${colors.reset}`);
    } else {
      this.stats.activeRooms.forEach(room => {
        const gameStatus = room.currentGameId > 0 ?
          `${colors.green}In Game (ID: ${room.currentGameId})${colors.reset}` :
          `${colors.yellow}Waiting${colors.reset}`;

        console.log(`  ${colors.bright}Room #${room.roomId}${colors.reset}`);
        console.log(`    Players: ${room.playerCount}/5`);
        console.log(`    Status: ${gameStatus}`);
        console.log(`    Creator: ${this.formatAddress(room.creator)}`);
        console.log(`    Age: ${this.getAge(room.createdAt)}`);
        console.log();
      });
    }
  }

  displayActiveGames() {
    console.log(`${colors.bright}${colors.magenta}🎮 ACTIVE GAMES${colors.reset}`);
    console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    if (this.stats.activeGames.length === 0) {
      console.log(`  ${colors.dim}No active games${colors.reset}`);
    } else {
      this.stats.activeGames.forEach(game => {
        const timeLeftStr = this.formatTimeLeft(game.timeLeft);
        const timeColor = game.timeLeft < 20 ? colors.red :
                          game.timeLeft < 40 ? colors.yellow :
                          colors.green;

        console.log(`  ${colors.bright}Game #${game.gameId}${colors.reset} ${colors.dim}(Room #${game.roomId})${colors.reset}`);
        console.log(`    Word Length: ${game.wordLength} letters`);
        console.log(`    Time Left: ${timeColor}${timeLeftStr}${colors.reset}`);
        console.log(`    Qualified: ${game.qualifiedPlayerCount} players`);

        if (game.qualifiedPlayers.length > 0) {
          console.log(`    Leaders:`);
          game.qualifiedPlayers.slice(0, 3).forEach((player, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
            console.log(`      ${medal} ${this.formatAddress(player)}`);
          });
        }
        console.log();
      });
    }
  }

  displayRecentWinners() {
    console.log(`${colors.bright}${colors.yellow}🏆 RECENT WINNERS${colors.reset}`);
    console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

    if (this.stats.recentWinners.length === 0) {
      console.log(`  ${colors.dim}No recent winners${colors.reset}`);
    } else {
      this.stats.recentWinners.forEach((winner, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  ';
        console.log(`  ${medal} Game #${winner.gameId}`);
        console.log(`    Winner: ${this.formatAddress(winner.winner)}`);
        console.log(`    Time: ${this.getAge(winner.timestamp)} ago`);
        console.log();
      });
    }
  }

  displayFooter() {
    console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.dim}Press Ctrl+C to exit${colors.reset}\n`);
  }

  async refresh() {
    try {
      await Promise.all([
        this.fetchActiveRooms(),
        this.fetchActiveGames(),
        this.fetchRecentWinners(),
      ]);

      this.clearScreen();
      this.displayHeader();
      this.displayOverview();
      this.displayActiveRooms();
      this.displayActiveGames();
      this.displayRecentWinners();
      this.displayFooter();

    } catch (error) {
      console.error(`${colors.red}❌ Error refreshing data: ${error.message}${colors.reset}`);
    }
  }

  start() {
    // Initial refresh
    this.refresh();

    // Set up auto-refresh
    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.refreshInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log(`\n${colors.cyan}👋 Monitor stopped${colors.reset}`);
    process.exit(0);
  }

  // Utility Methods

  formatAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  }

  formatTimeLeft(seconds) {
    if (seconds <= 0) return 'EXPIRED';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getAge(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  }
}

// Main execution
async function main() {
  const contractAddress = process.env.GAME_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error(`${colors.red}❌ Error: GAME_CONTRACT_ADDRESS environment variable not set${colors.reset}`);
    console.log(`${colors.cyan}ℹ️  Usage: export GAME_CONTRACT_ADDRESS=0x... && npm run events:monitor${colors.reset}`);
    process.exit(1);
  }

  const refreshInterval = parseInt(process.env.REFRESH_INTERVAL || '5000', 10);

  const monitor = new GameMonitor(contractAddress, refreshInterval);

  try {
    await monitor.initialize();
    monitor.start();
  } catch (error) {
    console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
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

module.exports = { GameMonitor };
