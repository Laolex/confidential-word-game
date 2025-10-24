# Frontend Setup Guide

Complete guide for setting up and running the Confidential Word Game frontend.

## Quick Start (Recommended)

```bash
# 1. One-command setup (installs everything)
npm run setup

# 2. Start Docker backend
npm run docker:up

# 3. In another terminal, start frontend
npm run frontend:dev
```

Your app will be running at `http://localhost:3000`! 🎉

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Compile Smart Contracts

```bash
npm run compile
```

### 3. Copy Contract ABI to Frontend

```bash
npm run copy-abi
```

This copies the compiled contract ABI to `frontend/src/contracts/`.

### 4. Configure Environment

```bash
# Frontend environment
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```bash
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_GATEWAY_URL=
```

## Running the Application

### Option 1: Docker (Easiest)

```bash
# Terminal 1: Start backend (Hardhat + Gateway + Relayer)
npm run docker:up

# Terminal 2: Start frontend
npm run frontend:dev

# Terminal 3 (optional): Monitor events
export GAME_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
npm run events:monitor
```

### Option 2: Manual (More Control)

```bash
# Terminal 1: Hardhat node
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local
# Copy the contract address output

# Terminal 3: Update frontend .env with contract address
# Then start frontend
npm run frontend:dev

# Terminal 4: Start relayer
export GAME_CONTRACT_ADDRESS=0x...  # From step 2
npm run relayer

# Terminal 5 (optional): Monitor
npm run events:monitor
```

### Option 3: All-in-One (Experimental)

```bash
# Starts everything at once
npm run dev:all
```

## MetaMask Setup

### 1. Install MetaMask

- Download from https://metamask.io
- Create or import wallet
- Save your seed phrase securely

### 2. Add Local Network

If using local Hardhat:

```
Network Name: Hardhat Local
RPC URL: http://localhost:8545
Chain ID: 31337
Currency Symbol: ETH
```

### 3. Import Test Account

Hardhat provides test accounts with ETH:

```
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

⚠️ **NEVER use this key on mainnet or with real funds!**

## Verifying Setup

### Backend Check

```bash
# Check Hardhat is running
curl http://localhost:8545

# Check mock gateway
curl http://localhost:7077/health

# Check contract deployed
npm run compile
```

### Frontend Check

```bash
cd frontend

# Should show no errors
npm run build

# Start dev server
npm run dev
```

Visit `http://localhost:3000` - you should see the home page.

### Full Flow Test

1. **Connect Wallet**: Click "Connect Wallet" button
2. **Create Room**: Go to "Create Room", enter name and deposit
3. **Join Room**: Open in incognito window, connect different account, join room
4. **Play Game**: Game auto-starts with 2+ players
5. **Submit Guess**: Enter 3-letter word, submit

## Troubleshooting

### "Contract ABI not found"

```bash
# Make sure contracts are compiled
npm run compile

# Copy ABI to frontend
npm run copy-abi

# Verify file exists
ls -la frontend/src/contracts/ConfidentialWordGame.json
```

### "Failed to connect wallet"

- Ensure MetaMask is installed
- Check you're on correct network
- Try refreshing page
- Clear MetaMask cache (Settings > Advanced > Reset Account)

### "Contract not deployed at address"

```bash
# Check contract address in frontend/.env
cat frontend/.env

# Should match deployed address
docker-compose logs deployer | grep "deployed to"

# Update if different
echo 'VITE_CONTRACT_ADDRESS=0x...' > frontend/.env
```

### "Transaction failed: insufficient funds"

- Ensure test account has ETH
- For local: Use Hardhat test accounts
- For devnet: Visit https://faucet.zama.ai

### Port already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
cd frontend
VITE_PORT=3001 npm run dev
```

### Docker services not starting

```bash
# Check status
docker-compose ps

# View logs
docker-compose logs

# Restart services
docker-compose restart

# Force recreate
docker-compose down -v
docker-compose up --build
```

## Development Workflow

### Making Changes

```bash
# 1. Edit contract
vim contracts/ConfidentialWordGame.sol

# 2. Recompile
npm run compile

# 3. Copy new ABI
npm run copy-abi

# 4. Restart Docker (will re-deploy)
npm run docker:restart

# Frontend auto-reloads on file changes
```

### Testing

```bash
# Backend tests
npm test

# Frontend linting
cd frontend
npm run lint

# Build check
npm run build
```

### Adding New Features

1. **Smart Contract**: Edit contracts, compile, test
2. **Frontend**: Add components/pages
3. **Integration**: Update contexts to use new contract functions
4. **Testing**: Test end-to-end flow

## Production Deployment

### Backend

```bash
# Deploy to Zama devnet
npm run deploy:zama

# Start relayer on server
GAME_CONTRACT_ADDRESS=0x... npm run relayer
```

### Frontend

```bash
cd frontend

# Update .env for production
VITE_CONTRACT_ADDRESS=0x...  # From deployment
VITE_GATEWAY_URL=https://gateway.devnet.zama.ai

# Build
npm run build

# Deploy dist/ folder to:
# - Vercel
# - Netlify
# - IPFS
# - Any static hosting
```

## Project Structure

```
confidential-word-game/
├── contracts/              # Smart contracts
├── scripts/                # Backend scripts
│   ├── deploy.js
│   ├── relayer.js
│   ├── event-listener.js
│   └── monitor-game.js
├── test/                   # Contract tests
├── frontend/               # React app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── contexts/       # State management
│   │   ├── pages/          # Page components
│   │   ├── contracts/      # Contract ABIs
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   └── package.json
├── docker-compose.yml
└── package.json
```

## Available Scripts

### Root Level

```bash
npm run setup              # Full setup (install + compile + copy ABI)
npm run compile            # Compile contracts
npm run test               # Run contract tests
npm run deploy:local       # Deploy to local Hardhat
npm run deploy:zama        # Deploy to Zama devnet
npm run relayer            # Start relayer service
npm run docker:up          # Start Docker services
npm run docker:down        # Stop Docker services
npm run events:listen      # Listen to contract events
npm run events:monitor     # Monitor game statistics
npm run copy-abi           # Copy ABI to frontend
npm run frontend:dev       # Start frontend dev server
npm run frontend:build     # Build frontend for production
npm run dev:all            # Start everything at once
```

### Frontend Only

```bash
cd frontend
npm run dev                # Start dev server
npm run build              # Production build
npm run preview            # Preview production build
npm run lint               # Lint code
```

## Environment Variables

### Backend (.env)

```bash
PRIVATE_KEY=0x...
MNEMONIC=test test test...
ZAMA_DEVNET_RPC_URL=https://devnet.zama.ai
GATEWAY_URL=https://gateway.devnet.zama.ai
GAME_CONTRACT_ADDRESS=0x...
```

### Frontend (frontend/.env)

```bash
VITE_CONTRACT_ADDRESS=0x...
VITE_GATEWAY_URL=https://gateway.devnet.zama.ai
```

## Next Steps

1. ✅ Follow this guide to set up
2. ✅ Test locally with Docker
3. ✅ Deploy to devnet
4. 📖 Read `docs/LOCAL_DEVELOPMENT.md` for advanced topics
5. 🤝 Check `CONTRIBUTING.md` to contribute
6. 🔐 Review `SECURITY.md` for security best practices

## Getting Help

- 📖 **Documentation**: Check README.md files
- 🐛 **Issues**: https://github.com/your-org/confidential-word-game/issues
- 💬 **Discord**: Join community (link in main README)
- 📧 **Email**: support@your-domain.com

---

**Happy Building! 🎮🔐**

Made with ❤️ using React, Zama's fhEVM, and Fully Homomorphic Encryption
