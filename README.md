# 🎮 Confidential Word Game

A fully homomorphic encrypted (FHE) word guessing game built on Zama's fhEVM. Players compete in word-guessing rounds while keeping their balances, guesses, and game state completely confidential through end-to-end encryption.

## ✨ Features

### Privacy-Preserving Gameplay
- **Encrypted Balances**: Player funds are encrypted on-chain using FHE
- **Confidential Guesses**: Word guesses are encrypted character-by-character
- **Secure Validation**: Gateway-based decryption ensures privacy
- **Hidden Game State**: Word content remains encrypted until revelation

### Game Mechanics
- **Multi-Round Competition**: Progress through 3, 4, and 5-letter word rounds
- **Entry Fee System**: Players stake encrypted tokens to join
- **Prize Distribution**: Winners receive encrypted payouts
- **XP & Progression**: Track player experience and achievements
- **Time-Limited Rounds**: 60-second rounds with 2 attempts per player

### Technical Architecture
- **Smart Contract**: Solidity 0.8.24 with fhEVM integration
- **Gateway Integration**: Async decryption callbacks for game logic
- **Event-Driven**: Comprehensive event emissions for frontend
- **Gas Optimized**: Efficient FHE operations with reasonable gas costs
- **Security Hardened**: Reentrancy protection, access control, input validation

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MetaMask or compatible Web3 wallet
- Access to fhEVM network (Zama devnet/testnet)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd confidential-word-game

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run coverage
npm run coverage
```

### 4. Deploy

```bash
# Deploy to local network
npm run deploy:local

# Deploy to Zama devnet
npm run deploy:zama

# Deploy to Sepolia (for testing without FHE)
npm run deploy:sepolia
```

After deployment, copy the contract address to your `.env`:

```bash
export GAME_CONTRACT_ADDRESS=0x...
```

### 5. Start Relayer Service

The relayer monitors rooms and starts games automatically:

```bash
npm run relayer
```

## 🏗️ Project Structure

```
confidential-word-game/
├── contracts/
│   ├── ConfidentialWordGame.sol      # Main game contract
│   └── libraries/
│       └── WordEncoding.sol           # Word encoding utilities
├── scripts/
│   ├── deploy.js                      # Deployment script
│   └── relayer.js                     # Relayer service
├── test/
│   └── ConfidentialWordGame.test.js   # Comprehensive tests
├── frontend/
│   ├── WordGameSDK.js                 # JavaScript SDK
│   └── example-react/
│       └── GameRoom.jsx               # React example
├── deployments/                       # Deployment artifacts
├── hardhat.config.js                  # Hardhat configuration
├── package.json                       # Dependencies
└── README.md                          # This file
```

## 📖 How to Play

### For Players

1. **Deposit Balance**
   ```javascript
   await sdk.depositBalance(100); // Deposit 100 ETH (encrypted)
   ```

2. **Create or Join Room**
   ```javascript
   const { roomId } = await sdk.createRoom("PlayerName");
   // OR
   await sdk.joinRoom(roomId, "PlayerName");
   ```

3. **Wait for Game Start**
   - Relayer automatically starts game when 2+ players join
   - Listen to `GameStarted` event

4. **Submit Guesses**
   ```javascript
   await sdk.submitGuess(gameId, "CAT"); // Encrypted on client-side
   ```

5. **Win Prizes**
   - Correct guesses qualify you for next round
   - Last player standing wins the prize pool

### For Relayers

1. **Start Relayer Service**
   ```bash
   export GAME_CONTRACT_ADDRESS=0x...
   npm run relayer
   ```

2. **Automatic Operations**
   - Monitors room creation
   - Auto-starts games when ready
   - Generates and encrypts words
   - Forces round completion on timeout

## 🔧 SDK Usage

### Initialize SDK

```javascript
import { createWordGameSDK } from './frontend/WordGameSDK.js';

const sdk = await createWordGameSDK(
  contractAddress,
  contractABI
);
```

### Balance Management

```javascript
// Deposit encrypted balance
await sdk.depositBalance(100);

// Check if user has balance
const hasBalance = await sdk.hasBalance();

// Request balance decryption (async via Gateway)
await sdk.requestBalanceDecryption();
```

### Room Operations

```javascript
// Create room
const { roomId } = await sdk.createRoom("MyName");

// Join room
await sdk.joinRoom(roomId, "MyName");

// Get room info
const roomInfo = await sdk.getRoomInfo(roomId);
console.log(roomInfo.playerCount); // Current players
```

### Gameplay

```javascript
// Submit guess (automatically encrypted)
await sdk.submitGuess(gameId, "CAT");

// Get game info
const gameInfo = await sdk.getGameInfo(gameId);
console.log(gameInfo.timeLeft); // Seconds remaining

// Get player stats
const playerInfo = await sdk.getPlayerInfo(roomId, playerAddress);
console.log(playerInfo.isCorrect); // Whether last guess was correct
```

### Event Listening

```javascript
// Listen to game events
sdk.on('GameStarted', (roomId, gameId, wordLength) => {
  console.log(`Game ${gameId} started with ${wordLength}-letter word`);
});

sdk.on('GuessValidated', (gameId, player, isCorrect) => {
  console.log(`Guess ${isCorrect ? 'correct' : 'wrong'}`);
});

sdk.on('GameEnded', (gameId, winner) => {
  console.log(`Winner: ${winner}`);
});
```

## 🧪 Testing

### Run Full Test Suite

```bash
npm test
```

### Test Coverage

- ✅ Deployment and initialization
- ✅ Balance deposits and management
- ✅ Room creation and joining
- ✅ Game start with encrypted words
- ✅ Guess submission and validation
- ✅ Gateway callbacks
- ✅ Round completion logic
- ✅ Prize distribution
- ✅ XP system
- ✅ Admin functions
- ✅ Security checks

### Gas Usage

```bash
npm run test:gas
```

Expected gas costs (approximate):
- Balance deposit: ~150k gas
- Create room: ~200k gas
- Join room: ~150k gas
- Start game (3-letter): ~800k gas
- Submit guess: ~1.5M gas (includes FHE operations)

## 🔐 Security Considerations

### FHE Privacy Guarantees

1. **Encrypted Balances**: Player funds are encrypted using euint32
   - Only the player can decrypt their balance
   - Contract operations use homomorphic arithmetic
   - No plaintext balance ever touches the blockchain

2. **Confidential Guesses**: Character-by-character encryption
   - Each letter encrypted as euint8 (65-90 for A-Z)
   - Homomorphic equality comparison on-chain
   - Gateway decrypts only the final boolean result

3. **Access Control**: TFHE.allow() manages decryption permissions
   ```solidity
   TFHE.allow(playerBalances[msg.sender], msg.sender);
   ```

### Security Best Practices

✅ **DO:**
- Use Gateway callbacks for all decision-making
- Encrypt sensitive inputs client-side
- Validate all user inputs
- Use reentrancy guards
- Implement proper access control

❌ **DON'T:**
- Never call TFHE.decrypt() on-chain
- Never expose encrypted values without permission
- Never trust client-provided plaintext for sensitive operations
- Never skip input validation

## 🏛️ Architecture Decisions

### Why Gateway-Based Validation?

FHE allows computation on encrypted data, but **conditional branching** on encrypted values requires decryption. The Gateway pattern solves this:

1. **On-chain**: Compute homomorphic equality
   ```solidity
   ebool allMatch = TFHE.eq(guess, word);
   ```

2. **Gateway**: Decrypt the boolean
   ```solidity
   Gateway.requestDecryption(allMatch, callback, ...);
   ```

3. **Callback**: Update state based on result
   ```solidity
   function callbackGuessResult(uint256 requestId, bool isCorrect) {
       if (isCorrect) { /* update state */ }
   }
   ```

### Character-by-Character Comparison

Words are stored as arrays of encrypted characters (euint8[]):

```solidity
euint8[] encryptedWordLetters;
```

**Benefits:**
- Lower gas cost than full-word encryption
- Enables tile-based gameplay features
- Supports partial reveal mechanics (future feature)

**Trade-offs:**
- Multiple euint8 operations vs single euint256
- ~500k gas for 5-letter comparison

## 🛣️ Roadmap

### Phase 1: Core Game ✅
- [x] Encrypted balance management
- [x] Room creation and joining
- [x] Word encryption and comparison
- [x] Gateway-based validation
- [x] Prize distribution

### Phase 2: Enhanced Features 🚧
- [ ] Power-ups (reveal letter, extra attempt)
- [ ] Leaderboards with encrypted rankings
- [ ] Team mode
- [ ] Tournament brackets

### Phase 3: Advanced Privacy 🔮
- [ ] Zero-knowledge proofs for fairness
- [ ] Verifiable random word generation (VRF)
- [ ] Cross-chain encrypted state
- [ ] Privacy-preserving analytics

## 📚 Resources

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [fhevmjs SDK](https://github.com/zama-ai/fhevmjs)
- [FHE Basics](https://www.zama.ai/introduction-to-homomorphic-encryption)
- [Gateway Pattern](https://docs.zama.ai/fhevm/guides/decrypt)

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Zama's fhEVM](https://www.zama.ai/fhevm)
- Inspired by classic word games
- Special thanks to the Zama team for FHE infrastructure

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)
- Twitter: [@YourHandle](https://twitter.com/yourhandle)

---

**Built with ❤️ and 🔐 using Fully Homomorphic Encryption**
