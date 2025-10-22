// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialWordGame
 * @notice A fully homomorphic encrypted word guessing game using Zama's fhEVM
 * @dev Implements Gateway-based decryption for game logic validation
 *
 * Game Flow:
 * 1. Players deposit encrypted balances
 * 2. Room creator starts a game with encrypted word
 * 3. Players submit encrypted guesses (character-by-character)
 * 4. Contract computes homomorphic equality
 * 5. Gateway decrypts result and calls back
 * 6. Winners receive encrypted prize distribution
 *
 * Security Features:
 * - All sensitive data encrypted (balances, words, guesses)
 * - Gateway-only decryption (no on-chain decryption)
 * - Access control via TFHE.allow()
 * - Reentrancy protection
 * - Time-based round management
 */
contract ConfidentialWordGame is GatewayCaller, Ownable, ReentrancyGuard {

    // ============ Constants ============

    uint8 public constant MAX_PLAYERS_PER_ROOM = 5;
    uint8 public constant MAX_QUALIFIED_PLAYERS = 10; // Prevent DOS via unbounded array growth
    uint8 public constant INITIAL_WORD_LENGTH = 3;
    uint8 public constant MAX_WORD_LENGTH = 5;
    uint8 public constant MAX_ATTEMPTS_PER_ROUND = 2;
    uint8 public constant LETTER_ENCODING_BASE = 65; // ASCII 'A' = 65

    uint256 public constant ENTRY_FEE = 10 ether;
    uint256 public constant ROUND_TIME_LIMIT = 60; // seconds
    uint256 public constant GATEWAY_CALLBACK_TIMEOUT = 100; // blocks
    uint256 public constant RELAYER_TRANSFER_DELAY = 24 hours; // Delay for relayer transfer

    // Prize distribution percentages (basis points, 10000 = 100%)
    uint256 public constant WINNER_SHARE = 7000; // 70%
    uint256 public constant RUNNER_UP_SHARE = 2000; // 20%
    uint256 public constant THIRD_PLACE_SHARE = 1000; // 10%

    // ============ State Variables ============

    uint256 public roomCounter;
    uint256 public gameCounter;
    address public relayer; // Trusted relayer for word generation
    address public pendingRelayer; // Pending relayer for two-step transfer
    uint256 public relayerProposalTime; // Timestamp of relayer proposal

    // ============ Structs ============

    struct Player {
        address wallet;
        euint32 encryptedBalance;
        uint8 score;
        uint8 roundsWon;
        bool isActive;
        bool hasGuessed;
        bool isCorrect; // Set by Gateway callback
        uint256 lastGuessTime;
        uint8 attemptsUsed;
        string displayName;
    }

    struct Room {
        uint256 roomId;
        address creator;
        address[] playerAddresses;
        mapping(address => Player) players;
        uint8 playerCount;
        euint32 encryptedPrizePool;
        bool isActive;
        uint256 createdAt;
        uint256 currentGameId;
    }

    struct GameRound {
        uint256 gameId;
        uint256 roomId;
        euint8[] encryptedWordLetters; // Each letter as euint8 (65-90 for A-Z)
        uint8 wordLength;
        uint8 currentStage; // 3, 4, or 5 letter words
        uint256 roundStartTime;
        uint256 roundEndTime;
        uint8 qualifiedPlayerCount;
        address[] qualifiedPlayers;
        bool isComplete;
        bool prizeDistributed;
    }

    struct GuessRequest {
        uint256 gameId;
        address player;
        uint256 timestamp;
        uint8 attemptNumber;
    }

    struct BalanceUpdate {
        address player;
        euint32 amount;
        bool isAddition; // true = add, false = subtract
    }

    // ============ Mappings ============

    mapping(uint256 => Room) public rooms;
    mapping(uint256 => GameRound) public gameRounds;
    mapping(address => euint32) public playerBalances;
    mapping(address => bool) public hasBalance;
    mapping(address => uint256) public playerXP;

    // Gateway callback tracking
    mapping(uint256 => GuessRequest) public pendingGuessRequests;
    mapping(uint256 => BalanceUpdate) public pendingBalanceChecks;

    // ============ Events ============

    event RoomCreated(
        uint256 indexed roomId,
        address indexed creator,
        uint256 timestamp
    );

    event PlayerJoined(
        uint256 indexed roomId,
        address indexed player,
        string displayName
    );

    event GameStarted(
        uint256 indexed roomId,
        uint256 indexed gameId,
        uint8 wordLength,
        uint256 startTime
    );

    event EncryptedWordSet(
        uint256 indexed gameId,
        uint8 wordLength
    );

    event GuessSubmitted(
        uint256 indexed gameId,
        address indexed player,
        uint256 gatewayRequestId,
        uint8 attemptNumber
    );

    event GuessValidated(
        uint256 indexed gameId,
        address indexed player,
        bool isCorrect,
        uint8 attemptNumber
    );

    event RoundCompleted(
        uint256 indexed gameId,
        uint8 qualifiedPlayerCount,
        address[] qualifiedPlayers
    );

    event GameEnded(
        uint256 indexed gameId,
        address indexed winner,
        uint256 timestamp
    );

    event PrizeDistributed(
        uint256 indexed gameId,
        address indexed player,
        uint256 position
    );

    event BalanceDeposited(
        address indexed player,
        uint256 timestamp
    );

    event BalanceWithdrawn(
        address indexed player,
        uint256 amount,
        uint256 timestamp
    );

    event BalanceCheckRequested(
        address indexed player,
        uint256 gatewayRequestId
    );

    event XPAwarded(
        address indexed player,
        uint256 amount,
        string reason
    );

    event RelayerProposed(
        address indexed currentRelayer,
        address indexed proposedRelayer,
        uint256 effectiveTime
    );

    event RelayerAccepted(
        address indexed previousRelayer,
        address indexed newRelayer
    );

    event RelayerTransferCanceled(
        address indexed canceledRelayer
    );

    // ============ Modifiers ============

    modifier onlyRelayer() {
        require(msg.sender == relayer || msg.sender == owner(), "Not authorized relayer");
        _;
    }

    modifier onlyActiveRoom(uint256 _roomId) {
        require(rooms[_roomId].isActive, "Room not active");
        _;
    }

    modifier onlyPlayerInRoom(uint256 _roomId) {
        require(rooms[_roomId].players[msg.sender].isActive, "Not in room");
        _;
    }

    modifier gameNotComplete(uint256 _gameId) {
        require(!gameRounds[_gameId].isComplete, "Game already complete");
        _;
    }

    modifier withinTimeLimit(uint256 _gameId) {
        GameRound storage game = gameRounds[_gameId];
        require(
            block.timestamp <= game.roundEndTime,
            "Round time expired"
        );
        _;
    }

    // ============ Constructor ============

    constructor(address _relayer) Ownable(msg.sender) {
        relayer = _relayer;
        roomCounter = 0;
        gameCounter = 0;
    }

    // ============ Balance Management ============

    /**
     * @notice Deposit encrypted balance
     * @param encryptedAmount Encrypted amount from client
     * @param inputProof Proof for encrypted input
     */
    function depositBalance(
        einput encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant {
        euint32 amount = TFHE.asEuint32(encryptedAmount, inputProof);

        if (hasBalance[msg.sender]) {
            // Add to existing balance
            playerBalances[msg.sender] = TFHE.add(
                playerBalances[msg.sender],
                amount
            );
        } else {
            // Initialize new balance
            playerBalances[msg.sender] = amount;
            hasBalance[msg.sender] = true;
        }

        // Allow player to view their own balance
        TFHE.allowThis(playerBalances[msg.sender]);
        TFHE.allow(playerBalances[msg.sender], msg.sender);

        emit BalanceDeposited(msg.sender, block.timestamp);
    }

    /**
     * @notice Get encrypted balance (only returns to owner)
     * @return Encrypted balance
     */
    function getEncryptedBalance() external view returns (euint32) {
        require(hasBalance[msg.sender], "No balance");
        return playerBalances[msg.sender];
    }

    /**
     * @notice Request balance decryption via Gateway
     * @dev Player can decrypt their own balance
     */
    function requestBalanceDecryption() external returns (uint256) {
        require(hasBalance[msg.sender], "No balance");

        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(playerBalances[msg.sender]);

        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.callbackBalanceDecryption.selector,
            0,
            block.timestamp + GATEWAY_CALLBACK_TIMEOUT,
            false
        );

        pendingBalanceChecks[requestId] = BalanceUpdate({
            player: msg.sender,
            amount: euint32.wrap(0),
            isAddition: false
        });

        emit BalanceCheckRequested(msg.sender, requestId);

        return requestId;
    }

    /**
     * @notice Gateway callback for balance decryption
     * @param requestId The decryption request ID
     * @param decryptedBalance The decrypted balance value
     */
    function callbackBalanceDecryption(
        uint256 requestId,
        uint32 decryptedBalance
    ) public onlyGateway nonReentrant returns (bool) {
        BalanceUpdate memory update = pendingBalanceChecks[requestId];

        // Emit event with decrypted balance for client
        emit BalanceWithdrawn(
            update.player,
            decryptedBalance,
            block.timestamp
        );

        delete pendingBalanceChecks[requestId];
        return true;
    }

    /**
     * @notice Internal function to deduct entry fee with validation
     * @param player Player address
     */
    function _deductEntryFee(address player) internal {
        euint32 fee = TFHE.asEuint32(ENTRY_FEE);
        euint32 currentBalance = playerBalances[player];

        // Check if player has sufficient balance
        ebool hasSufficientFunds = TFHE.ge(currentBalance, fee);

        // Compute new balance
        euint32 newBalance = TFHE.sub(currentBalance, fee);

        // Conditionally update balance (only if sufficient funds)
        playerBalances[player] = TFHE.select(
            hasSufficientFunds,
            newBalance,
            currentBalance
        );

        TFHE.allowThis(playerBalances[player]);
        TFHE.allow(playerBalances[player], player);
    }

    /**
     * @notice Add encrypted amount to player balance
     * @param player Player address
     * @param amount Amount to add
     */
    function _addToBalance(address player, euint32 amount) internal {
        playerBalances[player] = TFHE.add(
            playerBalances[player],
            amount
        );

        TFHE.allowThis(playerBalances[player]);
        TFHE.allow(playerBalances[player], player);
    }

    // ============ Room Management ============

    /**
     * @notice Create a new game room
     * @param displayName Player's display name
     * @return roomId The created room ID
     */
    function createRoom(string memory displayName)
        external
        returns (uint256)
    {
        require(hasBalance[msg.sender], "Deposit balance first");
        require(bytes(displayName).length > 0, "Name required");
        require(bytes(displayName).length <= 20, "Name too long");

        roomCounter++;
        uint256 roomId = roomCounter;

        Room storage room = rooms[roomId];
        room.roomId = roomId;
        room.creator = msg.sender;
        room.playerCount = 1;
        room.isActive = true;
        room.createdAt = block.timestamp;
        room.encryptedPrizePool = TFHE.asEuint32(0);

        // Add creator as first player
        room.playerAddresses.push(msg.sender);
        room.players[msg.sender] = Player({
            wallet: msg.sender,
            encryptedBalance: playerBalances[msg.sender],
            score: 0,
            roundsWon: 0,
            isActive: true,
            hasGuessed: false,
            isCorrect: false,
            lastGuessTime: 0,
            attemptsUsed: 0,
            displayName: displayName
        });

        emit RoomCreated(roomId, msg.sender, block.timestamp);

        return roomId;
    }

    /**
     * @notice Join an existing room
     * @param roomId Room to join
     * @param displayName Player's display name
     */
    function joinRoom(uint256 roomId, string memory displayName)
        external
        onlyActiveRoom(roomId)
    {
        Room storage room = rooms[roomId];

        require(
            room.playerCount < MAX_PLAYERS_PER_ROOM,
            "Room full"
        );
        require(
            !room.players[msg.sender].isActive,
            "Already in room"
        );
        require(hasBalance[msg.sender], "Deposit balance first");
        require(bytes(displayName).length > 0, "Name required");
        require(bytes(displayName).length <= 20, "Name too long");

        room.playerCount++;
        room.playerAddresses.push(msg.sender);
        room.players[msg.sender] = Player({
            wallet: msg.sender,
            encryptedBalance: playerBalances[msg.sender],
            score: 0,
            roundsWon: 0,
            isActive: true,
            hasGuessed: false,
            isCorrect: false,
            lastGuessTime: 0,
            attemptsUsed: 0,
            displayName: displayName
        });

        emit PlayerJoined(roomId, msg.sender, displayName);
    }

    // ============ Game Management ============

    /**
     * @notice Start a game round (called by relayer with encrypted word)
     * @param roomId Room to start game in
     * @param encryptedLetters Array of encrypted letter codes (65-90 for A-Z)
     * @param wordLength Length of the word
     */
    function startGame(
        uint256 roomId,
        einput[] calldata encryptedLetters,
        bytes[] calldata inputProofs,
        uint8 wordLength
    )
        external
        onlyRelayer
        onlyActiveRoom(roomId)
        returns (uint256)
    {
        Room storage room = rooms[roomId];

        require(room.playerCount >= 2, "Need 2+ players");
        require(
            wordLength >= INITIAL_WORD_LENGTH &&
            wordLength <= MAX_WORD_LENGTH,
            "Invalid word length"
        );
        require(
            encryptedLetters.length == wordLength,
            "Letters count mismatch"
        );

        // Deduct entry fee from all players
        for (uint i = 0; i < room.playerAddresses.length; i++) {
            address playerAddr = room.playerAddresses[i];
            _deductEntryFee(playerAddr);
        }

        // Update prize pool
        euint32 totalFees = TFHE.asEuint32(ENTRY_FEE * room.playerCount);
        room.encryptedPrizePool = TFHE.add(
            room.encryptedPrizePool,
            totalFees
        );
        TFHE.allowThis(room.encryptedPrizePool);

        // Create new game round
        gameCounter++;
        uint256 gameId = gameCounter;

        GameRound storage game = gameRounds[gameId];
        game.gameId = gameId;
        game.roomId = roomId;
        game.wordLength = wordLength;
        game.currentStage = wordLength;
        game.roundStartTime = block.timestamp;
        game.roundEndTime = block.timestamp + ROUND_TIME_LIMIT;
        game.qualifiedPlayerCount = 0;
        game.isComplete = false;
        game.prizeDistributed = false;

        // Store encrypted letters
        for (uint i = 0; i < wordLength; i++) {
            euint8 letter = TFHE.asEuint8(encryptedLetters[i], inputProofs[i]);
            game.encryptedWordLetters.push(letter);
            TFHE.allowThis(letter);
        }

        room.currentGameId = gameId;

        emit GameStarted(roomId, gameId, wordLength, block.timestamp);
        emit EncryptedWordSet(gameId, wordLength);

        return gameId;
    }

    /**
     * @notice Submit encrypted guess
     * @param gameId Game ID
     * @param encryptedGuessLetters Encrypted letter guesses
     * @param inputProofs Proofs for encrypted inputs
     */
    function submitGuess(
        uint256 gameId,
        einput[] calldata encryptedGuessLetters,
        bytes[] calldata inputProofs
    )
        external
        gameNotComplete(gameId)
        withinTimeLimit(gameId)
        nonReentrant
        returns (uint256)
    {
        GameRound storage game = gameRounds[gameId];
        Room storage room = rooms[game.roomId];
        Player storage player = room.players[msg.sender];

        require(player.isActive, "Not in game");
        require(
            player.attemptsUsed < MAX_ATTEMPTS_PER_ROUND,
            "No attempts left"
        );
        require(
            encryptedGuessLetters.length == game.wordLength,
            "Wrong word length"
        );

        player.attemptsUsed++;
        player.hasGuessed = true;
        player.lastGuessTime = block.timestamp;

        // Convert encrypted inputs to euint8 array
        euint8[] memory guessLetters = new euint8[](game.wordLength);
        for (uint i = 0; i < game.wordLength; i++) {
            guessLetters[i] = TFHE.asEuint8(
                encryptedGuessLetters[i],
                inputProofs[i]
            );
        }

        // Compute homomorphic character-by-character equality
        ebool allMatch = TFHE.asEbool(true);

        for (uint i = 0; i < game.wordLength; i++) {
            ebool charMatch = TFHE.eq(
                guessLetters[i],
                game.encryptedWordLetters[i]
            );
            allMatch = TFHE.and(allMatch, charMatch);
        }

        // Request decryption via Gateway
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(allMatch);

        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.callbackGuessResult.selector,
            0,
            block.timestamp + GATEWAY_CALLBACK_TIMEOUT,
            false
        );

        // Store request for callback
        pendingGuessRequests[requestId] = GuessRequest({
            gameId: gameId,
            player: msg.sender,
            timestamp: block.timestamp,
            attemptNumber: player.attemptsUsed
        });

        emit GuessSubmitted(
            gameId,
            msg.sender,
            requestId,
            player.attemptsUsed
        );

        return requestId;
    }

    /**
     * @notice Gateway callback for guess validation
     * @param requestId Decryption request ID
     * @param isCorrect Whether the guess was correct
     */
    function callbackGuessResult(
        uint256 requestId,
        bool isCorrect
    )
        public
        onlyGateway
        nonReentrant
        returns (bool)
    {
        GuessRequest memory request = pendingGuessRequests[requestId];
        GameRound storage game = gameRounds[request.gameId];
        Room storage room = rooms[game.roomId];
        Player storage player = room.players[request.player];

        if (isCorrect && !player.isCorrect) {
            player.isCorrect = true;
            player.score++;
            player.roundsWon++;

            // Prevent DOS via unbounded array growth
            require(
                game.qualifiedPlayerCount < MAX_QUALIFIED_PLAYERS,
                "Max qualified players reached"
            );

            game.qualifiedPlayerCount++;
            game.qualifiedPlayers.push(request.player);

            // Award XP and time bonus
            uint256 xpGained = 100;
            uint256 timeBonus = 0;

            // Time bonus for fast guesses
            uint256 timeTaken = request.timestamp - game.roundStartTime;
            if (timeTaken < 20) {
                timeBonus = 50;
                xpGained += timeBonus;
            }

            // Attempt bonus
            if (request.attemptNumber == 1) {
                xpGained += 25; // First attempt bonus
            }

            playerXP[request.player] += xpGained;

            emit XPAwarded(
                request.player,
                xpGained,
                "Correct guess"
            );
        }

        emit GuessValidated(
            request.gameId,
            request.player,
            isCorrect,
            request.attemptNumber
        );

        delete pendingGuessRequests[requestId];

        // Check if round should complete
        _checkRoundCompletion(request.gameId);

        return true;
    }

    /**
     * @notice Check if round is complete and handle completion
     * @param gameId Game ID to check
     */
    function _checkRoundCompletion(uint256 gameId) internal {
        GameRound storage game = gameRounds[gameId];
        Room storage room = rooms[game.roomId];

        // Count players who have finished (guessed or timed out)
        uint8 finishedCount = 0;
        for (uint i = 0; i < room.playerAddresses.length; i++) {
            address playerAddr = room.playerAddresses[i];
            Player storage p = room.players[playerAddr];

            if (!p.isActive) continue;

            if (p.attemptsUsed >= MAX_ATTEMPTS_PER_ROUND || p.isCorrect) {
                finishedCount++;
            }
        }

        // Round complete if all finished or time expired
        bool timeExpired = block.timestamp > game.roundEndTime;
        bool allFinished = finishedCount >= room.playerCount;

        if (timeExpired || allFinished) {
            _completeRound(gameId);
        }
    }

    /**
     * @notice Complete the round and handle progression
     * @param gameId Game ID
     */
    function _completeRound(uint256 gameId) internal {
        GameRound storage game = gameRounds[gameId];

        if (game.isComplete) return;

        game.isComplete = true;

        emit RoundCompleted(
            gameId,
            game.qualifiedPlayerCount,
            game.qualifiedPlayers
        );

        // Handle end game scenarios
        if (game.qualifiedPlayerCount == 1) {
            // Single winner
            _endGameAndDistributePrizes(gameId);
        } else if (game.qualifiedPlayerCount == 0) {
            // No winners - refund entry fees
            _refundEntryFees(gameId);
        } else if (game.qualifiedPlayerCount > 4) {
            // Too many qualified - keep top 4 by time
            _pruneToTopFour(gameId);
        }
        // If 2-4 qualified, game continues (would need next round)
    }

    /**
     * @notice Prune qualified players to top 4 by guess time
     * @param gameId Game ID
     */
    function _pruneToTopFour(uint256 gameId) internal {
        GameRound storage game = gameRounds[gameId];
        Room storage room = rooms[game.roomId];

        // Simple pruning: keep first 4 who qualified (in production, sort by time)
        for (uint i = 4; i < game.qualifiedPlayers.length; i++) {
            address playerAddr = game.qualifiedPlayers[i];
            room.players[playerAddr].isActive = false;
            room.players[playerAddr].isCorrect = false;
        }

        game.qualifiedPlayerCount = 4;
    }

    /**
     * @notice End game and distribute prizes
     * @param gameId Game ID
     */
    function _endGameAndDistributePrizes(uint256 gameId) internal {
        GameRound storage game = gameRounds[gameId];
        Room storage room = rooms[game.roomId];

        if (game.prizeDistributed) return;
        game.prizeDistributed = true;

        address winner = game.qualifiedPlayers[0];

        // Calculate prize amounts
        euint32 totalPrize = room.encryptedPrizePool;

        // Winner gets full pot (in single winner scenario)
        _addToBalance(winner, totalPrize);

        // Award winner XP bonus
        playerXP[winner] += 500;

        emit PrizeDistributed(gameId, winner, 1);
        emit XPAwarded(winner, 500, "Game winner");
        emit GameEnded(gameId, winner, block.timestamp);

        room.isActive = false;
    }

    /**
     * @notice Refund entry fees to all players
     * @param gameId Game ID
     */
    function _refundEntryFees(uint256 gameId) internal {
        GameRound storage game = gameRounds[gameId];
        Room storage room = rooms[game.roomId];

        euint32 refundAmount = TFHE.asEuint32(ENTRY_FEE);

        for (uint i = 0; i < room.playerAddresses.length; i++) {
            address playerAddr = room.playerAddresses[i];
            _addToBalance(playerAddr, refundAmount);
        }

        emit GameEnded(gameId, address(0), block.timestamp);
        room.isActive = false;
    }

    /**
     * @notice Manual round completion trigger (for timeout handling)
     * @param gameId Game ID
     */
    function forceCompleteRound(uint256 gameId)
        external
        onlyRelayer
        nonReentrant
    {
        GameRound storage game = gameRounds[gameId];
        require(
            block.timestamp > game.roundEndTime,
            "Round not expired"
        );

        _completeRound(gameId);
    }

    // ============ View Functions ============

    /**
     * @notice Get room information
     */
    function getRoomInfo(uint256 roomId)
        external
        view
        returns (
            uint256 id,
            address creator,
            uint8 playerCount,
            bool isActive,
            uint256 createdAt,
            uint256 currentGameId,
            address[] memory playerAddresses
        )
    {
        Room storage room = rooms[roomId];
        return (
            room.roomId,
            room.creator,
            room.playerCount,
            room.isActive,
            room.createdAt,
            room.currentGameId,
            room.playerAddresses
        );
    }

    /**
     * @notice Get player info in a room
     */
    function getPlayerInfo(uint256 roomId, address playerAddr)
        external
        view
        returns (
            address wallet,
            uint8 score,
            uint8 roundsWon,
            bool isActive,
            bool hasGuessed,
            bool isCorrect,
            uint8 attemptsUsed,
            string memory displayName
        )
    {
        Player storage player = rooms[roomId].players[playerAddr];
        return (
            player.wallet,
            player.score,
            player.roundsWon,
            player.isActive,
            player.hasGuessed,
            player.isCorrect,
            player.attemptsUsed,
            player.displayName
        );
    }

    /**
     * @notice Get game round information
     */
    function getGameInfo(uint256 gameId)
        external
        view
        returns (
            uint256 id,
            uint256 roomId,
            uint8 wordLength,
            uint8 currentStage,
            uint256 roundStartTime,
            uint256 roundEndTime,
            uint8 qualifiedPlayerCount,
            bool isComplete
        )
    {
        GameRound storage game = gameRounds[gameId];
        return (
            game.gameId,
            game.roomId,
            game.wordLength,
            game.currentStage,
            game.roundStartTime,
            game.roundEndTime,
            game.qualifiedPlayerCount,
            game.isComplete
        );
    }

    /**
     * @notice Get player XP
     */
    function getPlayerXP(address player) external view returns (uint256) {
        return playerXP[player];
    }

    /**
     * @notice Get qualified players for a game
     */
    function getQualifiedPlayers(uint256 gameId)
        external
        view
        returns (address[] memory)
    {
        return gameRounds[gameId].qualifiedPlayers;
    }

    // ============ Admin Functions ============

    /**
     * @notice Propose a new relayer (step 1 of two-step transfer)
     * @param newRelayer Address of the proposed relayer
     * @dev Initiates a time-delayed transfer to prevent accidental changes
     */
    function proposeRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Invalid address");
        require(newRelayer != relayer, "Already current relayer");

        pendingRelayer = newRelayer;
        relayerProposalTime = block.timestamp;

        emit RelayerProposed(
            relayer,
            newRelayer,
            block.timestamp + RELAYER_TRANSFER_DELAY
        );
    }

    /**
     * @notice Accept relayer role (step 2 of two-step transfer)
     * @dev Can only be called by the pending relayer after the delay period
     */
    function acceptRelayer() external {
        require(msg.sender == pendingRelayer, "Not pending relayer");
        require(pendingRelayer != address(0), "No pending relayer");
        require(
            block.timestamp >= relayerProposalTime + RELAYER_TRANSFER_DELAY,
            "Transfer delay not met"
        );

        address oldRelayer = relayer;
        relayer = pendingRelayer;
        pendingRelayer = address(0);
        relayerProposalTime = 0;

        emit RelayerAccepted(oldRelayer, relayer);
    }

    /**
     * @notice Cancel pending relayer transfer
     * @dev Can be called by owner to cancel a proposed transfer
     */
    function cancelRelayerTransfer() external onlyOwner {
        require(pendingRelayer != address(0), "No pending transfer");

        address canceled = pendingRelayer;
        pendingRelayer = address(0);
        relayerProposalTime = 0;

        emit RelayerTransferCanceled(canceled);
    }

    /**
     * @notice Update relayer address (DEPRECATED - use proposeRelayer/acceptRelayer)
     * @dev Kept for emergency use by owner, but two-step transfer is preferred
     */
    function setRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "Invalid address");
        relayer = newRelayer;
    }

    /**
     * @notice Emergency pause a room
     */
    function emergencyPauseRoom(uint256 roomId) external onlyOwner {
        rooms[roomId].isActive = false;
    }
}
