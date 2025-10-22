# 📚 API Reference - Confidential Word Game

Complete reference for smart contract functions and SDK methods.

## Smart Contract API

Contract Address: `0x...` (see deployment info)

### Events

#### RoomCreated
```solidity
event RoomCreated(
    uint256 indexed roomId,
    address indexed creator,
    uint256 timestamp
)
```
Emitted when a new game room is created.

#### PlayerJoined
```solidity
event PlayerJoined(
    uint256 indexed roomId,
    address indexed player,
    string displayName
)
```
Emitted when a player joins a room.

#### GameStarted
```solidity
event GameStarted(
    uint256 indexed roomId,
    uint256 indexed gameId,
    uint8 wordLength,
    uint256 startTime
)
```
Emitted when a game round starts.

#### GuessSubmitted
```solidity
event GuessSubmitted(
    uint256 indexed gameId,
    address indexed player,
    uint256 gatewayRequestId,
    uint8 attemptNumber
)
```
Emitted when a player submits a guess.

#### GuessValidated
```solidity
event GuessValidated(
    uint256 indexed gameId,
    address indexed player,
    bool isCorrect,
    uint8 attemptNumber
)
```
Emitted when Gateway validates a guess (callback).

#### RoundCompleted
```solidity
event RoundCompleted(
    uint256 indexed gameId,
    uint8 qualifiedPlayerCount,
    address[] qualifiedPlayers
)
```
Emitted when a round completes.

#### GameEnded
```solidity
event GameEnded(
    uint256 indexed gameId,
    address indexed winner,
    uint256 timestamp
)
```
Emitted when a game ends.

---

### Public Functions

#### depositBalance
```solidity
function depositBalance(
    einput encryptedAmount,
    bytes calldata inputProof
) external
```
Deposit encrypted balance.

**Parameters:**
- `encryptedAmount`: Encrypted amount (from fhevmjs)
- `inputProof`: Proof of encryption

**Events:** `BalanceDeposited`

**Example:**
```javascript
const encrypted = fhevm.encrypt32(100);
await contract.depositBalance(encrypted.data, encrypted.signature);
```

---

#### getEncryptedBalance
```solidity
function getEncryptedBalance() external view returns (euint32)
```
Get your encrypted balance (ciphertext).

**Returns:** Encrypted balance (euint32)

**Requirements:** Must have deposited balance

---

#### requestBalanceDecryption
```solidity
function requestBalanceDecryption() external returns (uint256)
```
Request balance decryption via Gateway.

**Returns:** Request ID

**Events:** `BalanceCheckRequested`, later `BalanceWithdrawn` (callback)

**Note:** Decryption happens asynchronously via Gateway callback.

---

#### createRoom
```solidity
function createRoom(string memory displayName)
    external
    returns (uint256)
```
Create a new game room.

**Parameters:**
- `displayName`: Your display name (max 20 chars)

**Returns:** Room ID

**Requirements:**
- Must have deposited balance
- Name length > 0 and <= 20

**Events:** `RoomCreated`

---

#### joinRoom
```solidity
function joinRoom(uint256 roomId, string memory displayName)
    external
```
Join an existing room.

**Parameters:**
- `roomId`: Room to join
- `displayName`: Your display name (max 20 chars)

**Requirements:**
- Room must be active
- Room not full (< 5 players)
- Not already in room
- Must have balance

**Events:** `PlayerJoined`

---

#### startGame (Relayer Only)
```solidity
function startGame(
    uint256 roomId,
    einput[] calldata encryptedLetters,
    bytes[] calldata inputProofs,
    uint8 wordLength
) external onlyRelayer returns (uint256)
```
Start a game with encrypted word.

**Parameters:**
- `roomId`: Room to start game in
- `encryptedLetters`: Array of encrypted letter codes
- `inputProofs`: Proofs for each letter
- `wordLength`: Length of word (3-5)

**Returns:** Game ID

**Requirements:**
- Only relayer can call
- Room must have 2+ players
- Valid word length (3-5)

**Events:** `GameStarted`, `EncryptedWordSet`

---

#### submitGuess
```solidity
function submitGuess(
    uint256 gameId,
    einput[] calldata encryptedGuessLetters,
    bytes[] calldata inputProofs
) external returns (uint256)
```
Submit encrypted guess.

**Parameters:**
- `gameId`: Game ID
- `encryptedGuessLetters`: Array of encrypted letters
- `inputProofs`: Proofs for each letter

**Returns:** Gateway request ID

**Requirements:**
- Game not complete
- Within time limit
- Attempts remaining (< 2)
- Correct word length

**Events:** `GuessSubmitted`, later `GuessValidated` (callback)

**Example:**
```javascript
const letters = "CAT".split('').map(l =>
    fhevm.encrypt8(l.charCodeAt(0))
);
const data = letters.map(l => l.data);
const proofs = letters.map(l => l.signature);

await contract.submitGuess(gameId, data, proofs);
```

---

#### forceCompleteRound (Relayer Only)
```solidity
function forceCompleteRound(uint256 gameId)
    external
    onlyRelayer
```
Force round completion (for timeout handling).

**Parameters:**
- `gameId`: Game ID

**Requirements:**
- Only relayer
- Round must be expired

---

### View Functions

#### getRoomInfo
```solidity
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
```
Get room information.

**Returns:**
- `id`: Room ID
- `creator`: Room creator address
- `playerCount`: Number of players
- `isActive`: Whether room is active
- `createdAt`: Creation timestamp
- `currentGameId`: Current game ID (0 if none)
- `playerAddresses`: Array of player addresses

---

#### getPlayerInfo
```solidity
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
```
Get player information in a room.

**Returns:**
- `wallet`: Player address
- `score`: Total score
- `roundsWon`: Rounds won
- `isActive`: Active in current game
- `hasGuessed`: Has submitted guess
- `isCorrect`: Last guess correct
- `attemptsUsed`: Attempts used this round
- `displayName`: Player name

---

#### getGameInfo
```solidity
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
```
Get game information.

**Returns:**
- `id`: Game ID
- `roomId`: Associated room ID
- `wordLength`: Word length (3-5)
- `currentStage`: Current stage
- `roundStartTime`: Start timestamp
- `roundEndTime`: End timestamp
- `qualifiedPlayerCount`: Qualified players
- `isComplete`: Game complete

---

#### getPlayerXP
```solidity
function getPlayerXP(address player)
    external
    view
    returns (uint256)
```
Get player XP.

**Returns:** XP amount

---

#### getQualifiedPlayers
```solidity
function getQualifiedPlayers(uint256 gameId)
    external
    view
    returns (address[] memory)
```
Get qualified players for a game.

**Returns:** Array of qualified player addresses

---

### Admin Functions

#### setRelayer
```solidity
function setRelayer(address newRelayer)
    external
    onlyOwner
```
Update relayer address.

**Parameters:**
- `newRelayer`: New relayer address

**Requirements:** Only owner

---

#### emergencyPauseRoom
```solidity
function emergencyPauseRoom(uint256 roomId)
    external
    onlyOwner
```
Emergency pause a room.

**Parameters:**
- `roomId`: Room to pause

**Requirements:** Only owner

---

## JavaScript SDK API

### Class: WordGameSDK

#### Constructor
```javascript
new WordGameSDK(contractAddress, contractABI)
```

**Parameters:**
- `contractAddress`: Deployed contract address
- `contractABI`: Contract ABI (JSON)

---

#### initialize
```javascript
async initialize(ethereum)
```
Initialize SDK with Web3 provider.

**Parameters:**
- `ethereum`: window.ethereum or provider

**Returns:** `Promise<boolean>`

**Example:**
```javascript
const sdk = new WordGameSDK(address, abi);
await sdk.initialize(window.ethereum);
```

---

#### getAddress
```javascript
async getAddress()
```
Get current user address.

**Returns:** `Promise<string>` - User address

---

#### depositBalance
```javascript
async depositBalance(amountEther)
```
Deposit encrypted balance.

**Parameters:**
- `amountEther`: Amount in ether (number)

**Returns:** `Promise<TransactionReceipt>`

**Example:**
```javascript
await sdk.depositBalance(100); // Deposit 100 ETH
```

---

#### getEncryptedBalance
```javascript
async getEncryptedBalance()
```
Get encrypted balance (ciphertext).

**Returns:** `Promise<object>` - Encrypted balance

---

#### requestBalanceDecryption
```javascript
async requestBalanceDecryption()
```
Request balance decryption.

**Returns:** `Promise<string>` - Request ID

**Note:** Listen to `BalanceWithdrawn` event for result.

---

#### createRoom
```javascript
async createRoom(displayName)
```
Create a new room.

**Parameters:**
- `displayName`: Your display name (string)

**Returns:** `Promise<{roomId: string, receipt: object}>`

**Example:**
```javascript
const { roomId } = await sdk.createRoom("Alice");
console.log("Room created:", roomId);
```

---

#### joinRoom
```javascript
async joinRoom(roomId, displayName)
```
Join an existing room.

**Parameters:**
- `roomId`: Room ID (number or string)
- `displayName`: Your display name (string)

**Returns:** `Promise<TransactionReceipt>`

---

#### submitGuess
```javascript
async submitGuess(gameId, guess)
```
Submit a guess (automatically encrypted).

**Parameters:**
- `gameId`: Game ID (number or string)
- `guess`: Word guess (string, e.g., "CAT")

**Returns:** `Promise<{requestId: string, receipt: object}>`

**Example:**
```javascript
const { requestId } = await sdk.submitGuess(1, "CAT");
// Listen for GuessValidated event
```

---

#### getRoomInfo
```javascript
async getRoomInfo(roomId)
```
Get room information.

**Parameters:**
- `roomId`: Room ID

**Returns:** `Promise<RoomInfo>`

**RoomInfo:**
```typescript
{
  id: string;
  creator: string;
  playerCount: number;
  isActive: boolean;
  createdAt: number;
  currentGameId: string;
  playerAddresses: string[];
}
```

---

#### getPlayerInfo
```javascript
async getPlayerInfo(roomId, playerAddress?)
```
Get player information.

**Parameters:**
- `roomId`: Room ID
- `playerAddress`: Player address (optional, defaults to current user)

**Returns:** `Promise<PlayerInfo>`

**PlayerInfo:**
```typescript
{
  wallet: string;
  score: number;
  roundsWon: number;
  isActive: boolean;
  hasGuessed: boolean;
  isCorrect: boolean;
  attemptsUsed: number;
  displayName: string;
}
```

---

#### getGameInfo
```javascript
async getGameInfo(gameId)
```
Get game information.

**Parameters:**
- `gameId`: Game ID

**Returns:** `Promise<GameInfo>`

**GameInfo:**
```typescript
{
  id: string;
  roomId: string;
  wordLength: number;
  currentStage: number;
  roundStartTime: number;
  roundEndTime: number;
  timeLeft: number;  // Calculated
  qualifiedPlayerCount: number;
  isComplete: boolean;
}
```

---

#### getPlayerXP
```javascript
async getPlayerXP(playerAddress?)
```
Get player XP.

**Parameters:**
- `playerAddress`: Player address (optional)

**Returns:** `Promise<number>`

---

#### getQualifiedPlayers
```javascript
async getQualifiedPlayers(gameId)
```
Get qualified players.

**Parameters:**
- `gameId`: Game ID

**Returns:** `Promise<string[]>` - Array of addresses

---

#### getConstants
```javascript
async getConstants()
```
Get contract constants.

**Returns:** `Promise<Constants>`

**Constants:**
```typescript
{
  maxPlayersPerRoom: number;
  entryFee: string;  // In ether
  roundTimeLimit: number;  // Seconds
  maxAttemptsPerRound: number;
  initialWordLength: number;
  maxWordLength: number;
}
```

---

#### hasBalance
```javascript
async hasBalance(address?)
```
Check if address has balance.

**Parameters:**
- `address`: Address to check (optional)

**Returns:** `Promise<boolean>`

---

### Event Listeners

#### on
```javascript
on(eventName, callback)
```
Listen to contract events.

**Parameters:**
- `eventName`: Event name (string)
- `callback`: Callback function

**Returns:** Function to remove listener

**Example:**
```javascript
const unsubscribe = sdk.on('GameStarted', (roomId, gameId, wordLength) => {
  console.log(`Game ${gameId} started!`);
});

// Later: remove listener
unsubscribe();
```

**Available Events:**
- `RoomCreated`
- `PlayerJoined`
- `GameStarted`
- `GuessSubmitted`
- `GuessValidated`
- `RoundCompleted`
- `GameEnded`
- `PrizeDistributed`
- `XPAwarded`
- `BalanceDeposited`
- `BalanceWithdrawn`

---

#### off
```javascript
off(eventName)
```
Remove event listener.

**Parameters:**
- `eventName`: Event name

---

#### removeAllListeners
```javascript
removeAllListeners()
```
Remove all event listeners.

---

## Helper Function

### createWordGameSDK
```javascript
async createWordGameSDK(contractAddress, contractABI)
```
Factory function to create and initialize SDK.

**Parameters:**
- `contractAddress`: Contract address
- `contractABI`: Contract ABI

**Returns:** `Promise<WordGameSDK>` - Initialized SDK

**Example:**
```javascript
import { createWordGameSDK } from './WordGameSDK.js';

const sdk = await createWordGameSDK(
  "0x123...",
  contractABI
);

// SDK is ready to use
await sdk.createRoom("PlayerName");
```

---

## Error Codes

### Contract Errors

| Error | Meaning |
|-------|---------|
| "Not authorized relayer" | Only relayer can call this function |
| "Deposit balance first" | Must deposit balance before action |
| "Room not active" | Room is closed/inactive |
| "Room full" | Maximum 5 players reached |
| "Already in room" | Already joined this room |
| "Need 2+ players" | Minimum 2 players to start |
| "Game already complete" | Cannot interact with finished game |
| "No attempts left" | Used all 2 attempts |
| "Wrong word length" | Guess length doesn't match word |
| "Round time expired" | Round timeout reached |

### SDK Errors

| Error | Meaning |
|-------|---------|
| "Please install MetaMask" | No Web3 provider detected |
| "Failed to initialize SDK" | Initialization error |
| "No balance" | User hasn't deposited balance |
| "Invalid character in word" | Guess contains non-letters |

---

## Rate Limits

**Blockchain:** Limited by block time and gas

**Relayer API:** (if exposed)
- 100 requests per 15 minutes per IP
- 1000 requests per day per IP

---

## Gas Estimates

| Operation | Estimated Gas |
|-----------|---------------|
| depositBalance | ~150,000 |
| createRoom | ~200,000 |
| joinRoom | ~150,000 |
| startGame (3-letter) | ~800,000 |
| startGame (5-letter) | ~1,200,000 |
| submitGuess (3-letter) | ~1,500,000 |
| submitGuess (5-letter) | ~2,000,000 |

**Note:** FHE operations are significantly more expensive than regular EVM operations.

---

## Examples

### Complete Game Flow

```javascript
// 1. Initialize SDK
const sdk = await createWordGameSDK(contractAddress, contractABI);

// 2. Deposit balance
await sdk.depositBalance(100);

// 3. Create room
const { roomId } = await sdk.createRoom("Alice");

// 4. Listen for game start
sdk.on('GameStarted', async (rId, gameId, wordLength) => {
  console.log(`Game started! Word has ${wordLength} letters`);

  // 5. Submit guess
  const guess = "CAT";
  await sdk.submitGuess(gameId, guess);
});

// 6. Listen for result
sdk.on('GuessValidated', (gameId, player, isCorrect) => {
  if (isCorrect) {
    console.log("✅ Correct!");
  } else {
    console.log("❌ Try again!");
  }
});

// 7. Listen for game end
sdk.on('GameEnded', (gameId, winner) => {
  if (winner === await sdk.getAddress()) {
    console.log("🏆 You won!");
  }
});
```

---

## Versioning

Current API Version: **v1.0.0**

We follow semantic versioning:
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes

---

## Support

For API questions:
- GitHub Issues: [link]
- Discord: [link]
- Email: dev@your-domain.com
