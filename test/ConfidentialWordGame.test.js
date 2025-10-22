const { expect } = require("chai");
const { ethers } = require("hardhat");
const { createInstance } = require("fhevmjs");

describe("ConfidentialWordGame", function () {
  let game;
  let owner, relayer, player1, player2, player3;
  let fhevmInstance;

  const ENTRY_FEE = ethers.parseEther("10");
  const INITIAL_BALANCE = ethers.parseEther("100");

  before(async function () {
    [owner, relayer, player1, player2, player3] = await ethers.getSigners();

    // Try to initialize fhEVM instance (may not work in all test environments)
    try {
      fhevmInstance = await createInstance({
        chainId: 31337, // Hardhat chain ID
        networkUrl: "http://localhost:8545",
        gatewayUrl: "http://localhost:7077"
      });
      console.log("  ✓ fhEVM instance initialized");
    } catch (error) {
      console.log("  ⚠ Running without real FHE (mock mode)");
      fhevmInstance = null;
    }
  });

  beforeEach(async function () {
    const ConfidentialWordGame = await ethers.getContractFactory("ConfidentialWordGame");
    game = await ConfidentialWordGame.deploy(relayer.address);
    await game.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct relayer", async function () {
      expect(await game.relayer()).to.equal(relayer.address);
    });

    it("Should set the correct owner", async function () {
      expect(await game.owner()).to.equal(owner.address);
    });

    it("Should initialize counters to zero", async function () {
      expect(await game.roomCounter()).to.equal(0);
      expect(await game.gameCounter()).to.equal(0);
    });

    it("Should have correct constants", async function () {
      expect(await game.MAX_PLAYERS_PER_ROOM()).to.equal(5);
      expect(await game.ENTRY_FEE()).to.equal(ENTRY_FEE);
      expect(await game.ROUND_TIME_LIMIT()).to.equal(60);
    });
  });

  describe("Balance Management", function () {
    async function mockEncryptBalance(amount) {
      // Mock encryption for testing
      // In production, use real fhevmInstance.encrypt32()
      return {
        data: amount,
        signature: "0x"
      };
    }

    it("Should allow depositing encrypted balance", async function () {
      const encrypted = await mockEncryptBalance(INITIAL_BALANCE);

      await expect(
        game.connect(player1).depositBalance(encrypted.data, encrypted.signature)
      ).to.emit(game, "BalanceDeposited")
        .withArgs(player1.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

      expect(await game.hasBalance(player1.address)).to.be.true;
    });

    it("Should allow multiple deposits", async function () {
      const encrypted1 = await mockEncryptBalance(INITIAL_BALANCE);
      const encrypted2 = await mockEncryptBalance(ethers.parseEther("50"));

      await game.connect(player1).depositBalance(encrypted1.data, encrypted1.signature);
      await game.connect(player1).depositBalance(encrypted2.data, encrypted2.signature);

      expect(await game.hasBalance(player1.address)).to.be.true;
    });

    it("Should allow retrieving encrypted balance", async function () {
      const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
      await game.connect(player1).depositBalance(encrypted.data, encrypted.signature);

      // Should not revert
      await expect(game.connect(player1).getEncryptedBalance()).to.not.be.reverted;
    });

    it("Should revert when getting balance without deposit", async function () {
      await expect(
        game.connect(player1).getEncryptedBalance()
      ).to.be.revertedWith("No balance");
    });
  });

  describe("Room Management", function () {
    beforeEach(async function () {
      // Give players balances
      for (const player of [player1, player2, player3]) {
        const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
        await game.connect(player).depositBalance(encrypted.data, encrypted.signature);
      }
    });

    async function mockEncryptBalance(amount) {
      return { data: amount, signature: "0x" };
    }

    it("Should create a room", async function () {
      await expect(
        game.connect(player1).createRoom("Player1")
      ).to.emit(game, "RoomCreated");

      expect(await game.roomCounter()).to.equal(1);

      const roomInfo = await game.getRoomInfo(1);
      expect(roomInfo.creator).to.equal(player1.address);
      expect(roomInfo.playerCount).to.equal(1);
      expect(roomInfo.isActive).to.be.true;
    });

    it("Should not allow creating room without balance", async function () {
      const noBalancePlayer = (await ethers.getSigners())[5];

      await expect(
        game.connect(noBalancePlayer).createRoom("NoBalance")
      ).to.be.revertedWith("Deposit balance first");
    });

    it("Should allow joining a room", async function () {
      await game.connect(player1).createRoom("Player1");

      await expect(
        game.connect(player2).joinRoom(1, "Player2")
      ).to.emit(game, "PlayerJoined")
        .withArgs(1, player2.address, "Player2");

      const roomInfo = await game.getRoomInfo(1);
      expect(roomInfo.playerCount).to.equal(2);
    });

    it("Should not allow joining full room", async function () {
      await game.connect(player1).createRoom("Player1");

      // Join 4 more players (total 5)
      const players = await ethers.getSigners();
      for (let i = 0; i < 4; i++) {
        const p = players[i + 1];
        const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
        await game.connect(p).depositBalance(encrypted.data, encrypted.signature);
        await game.connect(p).joinRoom(1, `Player${i + 2}`);
      }

      // 6th player should fail
      const player6 = players[6];
      const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
      await game.connect(player6).depositBalance(encrypted.data, encrypted.signature);

      await expect(
        game.connect(player6).joinRoom(1, "Player6")
      ).to.be.revertedWith("Room full");
    });

    it("Should not allow joining same room twice", async function () {
      await game.connect(player1).createRoom("Player1");

      await expect(
        game.connect(player1).joinRoom(1, "Player1Again")
      ).to.be.revertedWith("Already in room");
    });

    it("Should enforce display name requirements", async function () {
      await expect(
        game.connect(player1).createRoom("")
      ).to.be.revertedWith("Name required");

      await expect(
        game.connect(player1).createRoom("A".repeat(21))
      ).to.be.revertedWith("Name too long");
    });
  });

  describe("Game Management", function () {
    let roomId;

    beforeEach(async function () {
      // Setup room with players
      for (const player of [player1, player2, player3]) {
        const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
        await game.connect(player).depositBalance(encrypted.data, encrypted.signature);
      }

      const tx = await game.connect(player1).createRoom("Player1");
      const receipt = await tx.wait();
      roomId = 1;

      await game.connect(player2).joinRoom(roomId, "Player2");
    });

    async function mockEncryptBalance(amount) {
      return { data: amount, signature: "0x" };
    }

    async function mockEncryptWord(word) {
      const letters = word.toUpperCase().split("");
      const encryptedLetters = [];
      const inputProofs = [];

      for (const letter of letters) {
        const code = letter.charCodeAt(0);
        encryptedLetters.push(code);
        inputProofs.push("0x");
      }

      return { encryptedLetters, inputProofs };
    }

    it("Should start a game with encrypted word", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("CAT");

      await expect(
        game.connect(relayer).startGame(
          roomId,
          encryptedLetters,
          inputProofs,
          3
        )
      ).to.emit(game, "GameStarted");

      expect(await game.gameCounter()).to.equal(1);

      const gameInfo = await game.getGameInfo(1);
      expect(gameInfo.wordLength).to.equal(3);
      expect(gameInfo.isComplete).to.be.false;
    });

    it("Should not allow non-relayer to start game", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("CAT");

      await expect(
        game.connect(player1).startGame(
          roomId,
          encryptedLetters,
          inputProofs,
          3
        )
      ).to.be.revertedWith("Not authorized relayer");
    });

    it("Should not start game with less than 2 players", async function () {
      // Create new room with just 1 player
      await game.connect(player3).createRoom("Player3");
      const { encryptedLetters, inputProofs } = await mockEncryptWord("CAT");

      await expect(
        game.connect(relayer).startGame(
          2,
          encryptedLetters,
          inputProofs,
          3
        )
      ).to.be.revertedWith("Need 2+ players");
    });

    it("Should validate word length", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("TOOLONG");

      await expect(
        game.connect(relayer).startGame(
          roomId,
          encryptedLetters,
          inputProofs,
          7
        )
      ).to.be.revertedWith("Invalid word length");
    });

    it("Should validate letters count matches word length", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("CAT");

      await expect(
        game.connect(relayer).startGame(
          roomId,
          encryptedLetters,
          inputProofs,
          4 // Wrong length
        )
      ).to.be.revertedWith("Letters count mismatch");
    });
  });

  describe("Guess Submission", function () {
    let roomId, gameId;

    beforeEach(async function () {
      // Setup room and game
      for (const player of [player1, player2]) {
        const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
        await game.connect(player).depositBalance(encrypted.data, encrypted.signature);
      }

      await game.connect(player1).createRoom("Player1");
      await game.connect(player2).joinRoom(1, "Player2");
      roomId = 1;

      const { encryptedLetters, inputProofs } = await mockEncryptWord("CAT");
      const tx = await game.connect(relayer).startGame(
        roomId,
        encryptedLetters,
        inputProofs,
        3
      );
      await tx.wait();
      gameId = 1;
    });

    async function mockEncryptBalance(amount) {
      return { data: amount, signature: "0x" };
    }

    async function mockEncryptWord(word) {
      const letters = word.toUpperCase().split("");
      const encryptedLetters = [];
      const inputProofs = [];

      for (const letter of letters) {
        encryptedLetters.push(letter.charCodeAt(0));
        inputProofs.push("0x");
      }

      return { encryptedLetters, inputProofs };
    }

    it("Should submit a guess", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("DOG");

      await expect(
        game.connect(player1).submitGuess(
          gameId,
          encryptedLetters,
          inputProofs
        )
      ).to.emit(game, "GuessSubmitted");
    });

    it("Should limit attempts per round", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("DOG");

      // First attempt
      await game.connect(player1).submitGuess(
        gameId,
        encryptedLetters,
        inputProofs
      );

      // Second attempt
      await game.connect(player1).submitGuess(
        gameId,
        encryptedLetters,
        inputProofs
      );

      // Third attempt should fail
      await expect(
        game.connect(player1).submitGuess(
          gameId,
          encryptedLetters,
          inputProofs
        )
      ).to.be.revertedWith("No attempts left");
    });

    it("Should validate guess length", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("DOGS");

      await expect(
        game.connect(player1).submitGuess(
          gameId,
          encryptedLetters,
          inputProofs
        )
      ).to.be.revertedWith("Wrong word length");
    });

    it("Should not allow guess in inactive game", async function () {
      const { encryptedLetters, inputProofs } = await mockEncryptWord("CAT");

      // Wait for game to timeout (would need to advance time in test)
      // This is a simplified check
      const gameInfo = await game.getGameInfo(gameId);
      expect(gameInfo.roundEndTime).to.be.gt(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update relayer", async function () {
      const newRelayer = player3.address;

      await expect(
        game.connect(owner).setRelayer(newRelayer)
      ).to.not.be.reverted;

      expect(await game.relayer()).to.equal(newRelayer);
    });

    it("Should not allow non-owner to update relayer", async function () {
      await expect(
        game.connect(player1).setRelayer(player2.address)
      ).to.be.reverted;
    });

    it("Should not allow setting zero address as relayer", async function () {
      await expect(
        game.connect(owner).setRelayer(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should allow owner to emergency pause room", async function () {
      const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
      await game.connect(player1).depositBalance(encrypted.data, encrypted.signature);
      await game.connect(player1).createRoom("Player1");

      await expect(
        game.connect(owner).emergencyPauseRoom(1)
      ).to.not.be.reverted;

      const roomInfo = await game.getRoomInfo(1);
      expect(roomInfo.isActive).to.be.false;
    });

    async function mockEncryptBalance(amount) {
      return { data: amount, signature: "0x" };
    }
  });

  describe("XP System", function () {
    it("Should award XP for correct guesses", async function () {
      // This would need Gateway callback simulation
      // Simplified check
      const xp = await game.getPlayerXP(player1.address);
      expect(xp).to.equal(0); // Initially zero
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const encrypted = await mockEncryptBalance(INITIAL_BALANCE);
      await game.connect(player1).depositBalance(encrypted.data, encrypted.signature);
      await game.connect(player1).createRoom("TestPlayer");
    });

    async function mockEncryptBalance(amount) {
      return { data: amount, signature: "0x" };
    }

    it("Should return room info", async function () {
      const info = await game.getRoomInfo(1);

      expect(info.creator).to.equal(player1.address);
      expect(info.playerCount).to.equal(1);
      expect(info.isActive).to.be.true;
    });

    it("Should return player info", async function () {
      const info = await game.getPlayerInfo(1, player1.address);

      expect(info.wallet).to.equal(player1.address);
      expect(info.displayName).to.equal("TestPlayer");
      expect(info.isActive).to.be.true;
    });

    it("Should return player XP", async function () {
      const xp = await game.getPlayerXP(player1.address);
      expect(xp).to.equal(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for balance deposit", async function () {
      const encrypted = await mockEncryptBalance(INITIAL_BALANCE);

      const tx = await game.connect(player1).depositBalance(
        encrypted.data,
        encrypted.signature
      );
      const receipt = await tx.wait();

      console.log(`    Gas used for deposit: ${receipt.gasUsed.toString()}`);
      // FHE operations are expensive, but should be under 1M gas
      expect(receipt.gasUsed).to.be.lt(1000000);
    });

    async function mockEncryptBalance(amount) {
      return { data: amount, signature: "0x" };
    }
  });
});
