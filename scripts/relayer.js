const { ethers } = require("hardhat");
const { createInstance } = require("fhevmjs");
const fs = require("fs");
const path = require("path");

/**
 * Relayer Service for Confidential Word Game
 *
 * Responsibilities:
 * 1. Generate random words for each round
 * 2. Encrypt words using FHE
 * 3. Submit encrypted words to contract
 * 4. Monitor game state and trigger round progression
 */

class WordGameRelayer {
  constructor(contractAddress, signer, provider) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this.provider = provider;
    this.fhevmInstance = null;
    this.contract = null;

    // Word pools for different lengths
    this.wordPools = {
      3: ["CAT", "DOG", "BAT", "RAT", "HAT", "MAT", "SUN", "RUN", "FUN", "BUN",
          "CAR", "BAR", "JAR", "TAR", "BOX", "FOX", "MAN", "CAN", "FAN", "PAN"],
      4: ["WORD", "GAME", "PLAY", "CASH", "WINS", "LUCK", "COIN", "BURN", "MOON",
          "STAR", "FIRE", "WIND", "RAIN", "SNOW", "LEAF", "TREE", "BIRD", "FISH"],
      5: ["HOUSE", "MOUSE", "LIGHT", "FIGHT", "RIGHT", "MIGHT", "PLANT", "BRAIN",
          "TRAIN", "CHAIN", "GLASS", "GRASS", "BLOOD", "FLOOD", "BREAD", "DREAM"]
    };
  }

  async initialize() {
    console.log("🔧 Initializing relayer...");

    // Load contract ABI
    const artifactPath = path.join(
      __dirname,
      "..",
      "artifacts",
      "contracts",
      "ConfidentialWordGame.sol",
      "ConfidentialWordGame.json"
    );

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    this.contract = new ethers.Contract(
      this.contractAddress,
      artifact.abi,
      this.signer
    );

    // Initialize FHE instance
    console.log("🔐 Initializing FHE instance...");

    try {
      this.fhevmInstance = await createInstance({
        chainId: await this.provider.getNetwork().then(n => Number(n.chainId)),
        networkUrl: this.provider.connection?.url || "http://localhost:8545",
        gatewayUrl: process.env.GATEWAY_URL || "http://localhost:7077"
      });

      console.log("✅ FHE instance initialized");
    } catch (error) {
      console.error("❌ Failed to initialize FHE instance:", error.message);
      console.log("⚠️  Continuing without FHE (for local testing)");
    }

    console.log("✅ Relayer initialized");
  }

  /**
   * Select random word from pool
   */
  selectRandomWord(length) {
    const pool = this.wordPools[length];
    if (!pool || pool.length === 0) {
      throw new Error(`No words available for length ${length}`);
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  }

  /**
   * Encrypt word letters using FHE
   */
  async encryptWord(word) {
    const letters = word.toUpperCase().split("");
    const encryptedLetters = [];
    const inputProofs = [];

    for (const letter of letters) {
      const letterCode = letter.charCodeAt(0); // 65-90 for A-Z

      if (this.fhevmInstance) {
        // Use real FHE encryption
        const encrypted = this.fhevmInstance.encrypt8(letterCode);
        encryptedLetters.push(encrypted.data);
        inputProofs.push(encrypted.signature || "0x");
      } else {
        // Mock encryption for local testing
        console.log("⚠️  Using mock encryption for letter:", letter);
        encryptedLetters.push(letterCode);
        inputProofs.push("0x");
      }
    }

    return { encryptedLetters, inputProofs };
  }

  /**
   * Start a game with encrypted word
   */
  async startGame(roomId, wordLength = 3) {
    console.log(`\n🎮 Starting game for room ${roomId}...`);

    // Select random word
    const word = this.selectRandomWord(wordLength);
    console.log(`📝 Selected word (length ${wordLength}):`, word);

    // Encrypt word
    console.log("🔐 Encrypting word...");
    const { encryptedLetters, inputProofs } = await this.encryptWord(word);

    // Submit to contract
    console.log("📤 Submitting to contract...");

    try {
      const tx = await this.contract.startGame(
        roomId,
        encryptedLetters,
        inputProofs,
        wordLength,
        {
          gasLimit: 5000000 // High gas limit for FHE operations
        }
      );

      console.log("⏳ Transaction submitted:", tx.hash);
      const receipt = await tx.wait();

      console.log("✅ Game started! Gas used:", receipt.gasUsed.toString());

      // Extract game ID from event
      const gameStartedEvent = receipt.logs.find(
        log => {
          try {
            const parsed = this.contract.interface.parseLog(log);
            return parsed?.name === "GameStarted";
          } catch {
            return false;
          }
        }
      );

      if (gameStartedEvent) {
        const parsed = this.contract.interface.parseLog(gameStartedEvent);
        const gameId = parsed.args.gameId;
        console.log("🎯 Game ID:", gameId.toString());
        return gameId;
      }

    } catch (error) {
      console.error("❌ Failed to start game:", error.message);
      throw error;
    }
  }

  /**
   * Monitor room and auto-start game when ready
   */
  async monitorRoom(roomId) {
    console.log(`\n👀 Monitoring room ${roomId}...`);

    const checkInterval = setInterval(async () => {
      try {
        const roomInfo = await this.contract.getRoomInfo(roomId);

        if (!roomInfo.isActive) {
          console.log("Room is no longer active");
          clearInterval(checkInterval);
          return;
        }

        console.log(`Room ${roomId}: ${roomInfo.playerCount}/5 players`);

        // Auto-start when we have at least 2 players
        if (roomInfo.playerCount >= 2 && roomInfo.currentGameId.toString() === "0") {
          console.log("🚀 Room ready! Starting game...");
          await this.startGame(roomId, 3);
          clearInterval(checkInterval);
        }

      } catch (error) {
        console.error("Error monitoring room:", error.message);
      }
    }, 5000); // Check every 5 seconds

    // Stop monitoring after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log("Monitoring timeout for room", roomId);
    }, 600000);
  }

  /**
   * Monitor game and force complete if timed out
   */
  async monitorGame(gameId) {
    console.log(`\n⏰ Monitoring game ${gameId} for timeout...`);

    const checkInterval = setInterval(async () => {
      try {
        const gameInfo = await this.contract.getGameInfo(gameId);

        if (gameInfo.isComplete) {
          console.log(`Game ${gameId} complete`);
          clearInterval(checkInterval);
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const timeLeft = Number(gameInfo.roundEndTime) - now;

        if (timeLeft <= 0) {
          console.log(`⏱️  Game ${gameId} timed out, forcing completion...`);

          const tx = await this.contract.forceCompleteRound(gameId, {
            gasLimit: 1000000
          });

          await tx.wait();
          console.log("✅ Round completed");
          clearInterval(checkInterval);
        } else {
          console.log(`Game ${gameId}: ${timeLeft}s remaining`);
        }

      } catch (error) {
        console.error("Error monitoring game:", error.message);
      }
    }, 10000); // Check every 10 seconds

    // Stop monitoring after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 300000);
  }

  /**
   * Listen to contract events
   */
  async listenToEvents() {
    console.log("\n👂 Listening to contract events...\n");

    // Room created
    this.contract.on("RoomCreated", (roomId, creator, timestamp) => {
      console.log(`\n🏠 New room created: ${roomId} by ${creator}`);
      this.monitorRoom(roomId);
    });

    // Player joined
    this.contract.on("PlayerJoined", (roomId, player, displayName) => {
      console.log(`👤 Player ${displayName} (${player}) joined room ${roomId}`);
    });

    // Game started
    this.contract.on("GameStarted", (roomId, gameId, wordLength, startTime) => {
      console.log(`🎮 Game ${gameId} started in room ${roomId} (${wordLength} letters)`);
      this.monitorGame(gameId);
    });

    // Guess submitted
    this.contract.on("GuessSubmitted", (gameId, player, requestId, attemptNumber) => {
      console.log(`🎯 Guess submitted for game ${gameId} by ${player} (attempt ${attemptNumber})`);
    });

    // Guess validated
    this.contract.on("GuessValidated", (gameId, player, isCorrect, attemptNumber) => {
      const result = isCorrect ? "✅ CORRECT" : "❌ WRONG";
      console.log(`${result} - Game ${gameId}, Player ${player}, Attempt ${attemptNumber}`);
    });

    // Round completed
    this.contract.on("RoundCompleted", (gameId, qualifiedCount, qualifiedPlayers) => {
      console.log(`🏁 Round complete for game ${gameId}: ${qualifiedCount} qualified`);
    });

    // Game ended
    this.contract.on("GameEnded", (gameId, winner, timestamp) => {
      if (winner !== ethers.ZeroAddress) {
        console.log(`🏆 Game ${gameId} won by ${winner}!`);
      } else {
        console.log(`⚠️  Game ${gameId} ended with no winner`);
      }
    });

    console.log("✅ Event listeners registered\n");
  }

  /**
   * Start relayer service
   */
  async start() {
    await this.initialize();
    await this.listenToEvents();

    console.log("🟢 Relayer service running...\n");
    console.log("Press Ctrl+C to stop\n");

    // Keep process alive
    process.on("SIGINT", () => {
      console.log("\n\n👋 Shutting down relayer...");
      process.exit(0);
    });
  }
}

// Main execution
async function main() {
  const contractAddress = process.env.GAME_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("❌ GAME_CONTRACT_ADDRESS environment variable not set");
    console.log("\nUsage:");
    console.log("  export GAME_CONTRACT_ADDRESS=0x...");
    console.log("  node scripts/relayer.js");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  console.log("🤖 Word Game Relayer");
  console.log("===================");
  console.log("Contract:", contractAddress);
  console.log("Relayer:", signer.address);
  console.log("Network:", (await provider.getNetwork()).name);
  console.log();

  const relayer = new WordGameRelayer(contractAddress, signer, provider);
  await relayer.start();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { WordGameRelayer };
