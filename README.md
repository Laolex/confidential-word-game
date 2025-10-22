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
- Access to fhEVM network (Zama devnet/testnet) OR Docker for local development

## ⚙️ Configuration

### Environment Variables

The project uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Variables:**

- `PRIVATE_KEY` - Your deployer wallet private key (for production)
  - **NEVER commit real private keys to git!**
  - Use a dedicated deployment wallet with minimal funds

- `MNEMONIC` - Alternative to PRIVATE_KEY for local development
  - Default: `test test test test test test test test test test test junk`
  - Safe for local testing, DO NOT use in production

**Network Configuration:**

- `SEPOLIA_RPC_URL` - Ethereum Sepolia testnet RPC endpoint
  - Example: `https://rpc.sepolia.org`
  - Used for non-FHE testing

- `ZAMA_DEVNET_RPC_URL` - Zama fhEVM devnet RPC endpoint
  - Example: `https://devnet.zama.ai`
  - Used for FHE-enabled testing and development

- `GATEWAY_URL` - FHE Gateway decryption service URL
  - Example: `https://gateway.devnet.zama.ai`
  - Required for real FHE operations
  - Omit or leave empty for mock mode (local testing)

**Optional Variables:**

- `GAME_CONTRACT_ADDRESS` - Deployed contract address (set after deployment)
- `ETHERSCAN_API_KEY` - For contract verification on Etherscan
- `COINMARKETCAP_API_KEY` - For gas price reporting in USD
- `REPORT_GAS` - Set to `true` to enable gas reporting in tests

### Mock Mode vs Real fhEVM

The project supports two modes of operation:

#### 🧪 Mock Mode (Local Development)

**When to use:**
- Local development and testing
- Rapid iteration without network delays
- No need for testnet tokens
- Testing game logic without FHE complexity

**How it works:**
- Runs on local Hardhat network
- FHE operations are simulated
- Gateway callbacks are instant
- No real encryption (plaintext operations)

**Setup:**
```bash
# Leave GATEWAY_URL empty in .env or omit it
GATEWAY_URL=

# Start local node
npm run node

# Deploy (in another terminal)
npm run deploy:local

# Start relayer in mock mode
npm run relayer
```

**Advantages:** ✅ Fast, free, no external dependencies
**Limitations:** ⚠️ No real FHE privacy guarantees

#### 🔐 Real fhEVM Mode (Production-like)

**When to use:**
- Testing real FHE encryption
- Devnet/testnet deployment
- Production deployment
- End-to-end integration testing

**How it works:**
- Connects to Zama's fhEVM network
- Real FHE encryption/decryption
- Gateway performs actual decryption
- Full privacy guarantees

**Setup:**
```bash
# Set GATEWAY_URL in .env
GATEWAY_URL=https://gateway.devnet.zama.ai
ZAMA_DEVNET_RPC_URL=https://devnet.zama.ai

# Get testnet tokens from faucet
# Visit: https://faucet.zama.ai

# Deploy to devnet
npm run deploy:zama

# Start relayer with real FHE
export GAME_CONTRACT_ADDRESS=0x... # from deployment
npm run relayer
```

**Advantages:** ✅ Real privacy, production-ready
**Limitations:** ⚠️ Slower, requires testnet tokens, network dependency

**Quick Comparison:**

| Feature | Mock Mode | Real fhEVM Mode |
|---------|-----------|-----------------|
| Network | Local Hardhat | Zama Devnet/Mainnet |
| FHE Encryption | Simulated | Real |
| Gateway | Not required | Required |
| Speed | Fast (instant) | Slower (async callbacks) |
| Cost | Free | Gas fees |
| Privacy | None | Full FHE privacy |
| Use Case | Development/Testing | Production |

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

## 🤖 Running the Relayer

The relayer is a critical service that manages game operations. It automatically:
- Monitors room creation and player joins
- Starts games when 2+ players are ready
- Generates and encrypts random words
- Forces round completion on timeouts

### Prerequisites

Before running the relayer, ensure you have:

1. **Deployed Contract**
   ```bash
   # Deploy first
   npm run deploy:local  # or deploy:zama

   # Copy the contract address from output
   ```

2. **Environment Variables**
   ```bash
   # Set in .env or export
   export GAME_CONTRACT_ADDRESS=0x...  # From deployment
   export GATEWAY_URL=https://gateway.devnet.zama.ai  # Omit for mock mode
   ```

3. **Private Key**
   - Relayer needs a funded account to submit transactions
   - Set `PRIVATE_KEY` or `MNEMONIC` in `.env`
   - Account needs native tokens for gas fees

### Starting the Relayer

#### Local Development (Mock Mode)

```bash
# Terminal 1: Start Hardhat node
npm run node

# Terminal 2: Deploy contract
npm run deploy:local
# Copy contract address: 0x5FbDB2315678afecb367f032d93F642f64180aa3

# Terminal 3: Start relayer
export GAME_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
npm run relayer
```

**Expected Output:**
```
🔧 Initializing relayer...
🔐 Initializing FHE instance...
⚠️  Continuing without FHE (for local testing)
✅ Relayer initialized
🎮 Monitoring rooms for game start...
```

#### Zama Devnet (Real FHE Mode)

```bash
# 1. Ensure environment is configured
cat .env
# Should contain:
# GATEWAY_URL=https://gateway.devnet.zama.ai
# ZAMA_DEVNET_RPC_URL=https://devnet.zama.ai
# PRIVATE_KEY=0x...

# 2. Deploy to devnet
npm run deploy:zama
# Copy contract address

# 3. Start relayer
export GAME_CONTRACT_ADDRESS=0x...
npm run relayer
```

**Expected Output:**
```
🔧 Initializing relayer...
🔐 Initializing FHE instance...
✅ FHE instance initialized
✅ Relayer initialized
🎮 Monitoring rooms for game start...
```

### Relayer Monitoring

The relayer will log events in real-time:

```bash
📥 Event: RoomCreated
   Room ID: 1
   Creator: 0x1234...
   Timestamp: 2024-01-15T10:30:00.000Z

👥 Event: PlayerJoined
   Room ID: 1
   Player: 0x5678...
   Name: Alice

🎮 Starting game for room 1...
   Players: 2
   Word length: 3
   Encrypted word: CAT

✅ Game started!
   Room ID: 1
   Game ID: 1
   TX: 0xabcd...
```

### Troubleshooting

#### Problem: "Failed to initialize FHE instance"

**Solution:**
- Check `GATEWAY_URL` is correct
- For local testing, omit `GATEWAY_URL` (relayer will use mock mode)
- Verify network connectivity to Gateway

#### Problem: "Insufficient funds for gas"

**Solution:**
```bash
# Check relayer account balance
npx hardhat run scripts/check-balance.js --network zamaDevnet

# Get testnet tokens
# Visit: https://faucet.zama.ai
```

#### Problem: "Contract not deployed at address"

**Solution:**
```bash
# Verify contract address
export GAME_CONTRACT_ADDRESS=0x...  # Check this is correct

# Verify on correct network
npm run deploy:zama  # Re-deploy if needed
```

#### Problem: "Relayer not starting games"

**Check:**
1. Are there 2+ players in the room?
2. Have players deposited balances?
3. Is relayer address authorized in contract?

```bash
# Check relayer address
npx hardhat console --network zamaDevnet
> const contract = await ethers.getContractAt("ConfidentialWordGame", "0x...")
> await contract.relayer()
# Should match your relayer account address
```

#### Problem: "Transaction reverted"

**Common causes:**
- Player has insufficient encrypted balance
- Room already has active game
- Word length out of range (must be 3-5)
- Network gas price spike

**Debug:**
```bash
# Enable verbose logging
DEBUG=* npm run relayer

# Check recent transactions
# View on block explorer: https://explorer.zama.ai
```

### Advanced Configuration

#### Custom Word Pools

Edit `scripts/relayer.js` to customize word lists:

```javascript
this.wordPools = {
  3: ["CAT", "DOG", "BAT", ...],  // Add your 3-letter words
  4: ["WORD", "GAME", ...],        // Add your 4-letter words
  5: ["HOUSE", "MOUSE", ...],      // Add your 5-letter words
};
```

#### Adjust Monitoring Interval

```javascript
// In relayer.js
const POLL_INTERVAL = 5000; // ms between checks (default: 5s)
```

#### Multiple Relayers

For high availability, run multiple relayer instances:

```bash
# Relayer 1
PRIVATE_KEY=0x111... npm run relayer

# Relayer 2 (different account)
PRIVATE_KEY=0x222... npm run relayer
```

**Note:** Only one relayer should be authorized in the contract at a time. Use the two-step transfer process to change relayers safely.

### Production Deployment

For production, consider:

1. **Process Manager**
   ```bash
   # Use PM2 for auto-restart
   npm install -g pm2
   pm2 start scripts/relayer.js --name word-game-relayer
   pm2 save
   pm2 startup
   ```

2. **Monitoring & Alerts**
   - Set up health check endpoints
   - Monitor relayer account balance
   - Alert on transaction failures
   - Track game start latency

3. **Security**
   - Use hardware wallet or HSM for relayer key
   - Rotate keys periodically
   - Implement rate limiting
   - Monitor for suspicious activity

4. **Two-Step Relayer Transfer**
   ```solidity
   // Step 1: Propose new relayer (requires owner)
   await contract.proposeRelayer(newRelayerAddress);

   // Step 2: Wait 24 hours, then accept (requires new relayer)
   await contract.connect(newRelayer).acceptRelayer();
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
