# 🚀 Quick Start Guide

## TL;DR - Get Running in 2 Minutes

```bash
# 1. Setup (one time)
npm run setup

# 2. Start everything
npm run docker:up          # Terminal 1: Backend
npm run frontend:dev       # Terminal 2: Frontend

# 3. Open browser
# http://localhost:3000
```

## What Just Happened?

✅ Installed all dependencies
✅ Compiled smart contracts
✅ Started Hardhat local blockchain
✅ Deployed contracts automatically
✅ Started mock FHE Gateway
✅ Started relayer service
✅ Launched React frontend

## First Time Setup

```bash
# Install MetaMask
# Visit: https://metamask.io

# Add Hardhat Network in MetaMask:
Network Name: Hardhat Local
RPC URL: http://localhost:8545
Chain ID: 31337
Currency: ETH

# Import test account (has 10,000 ETH):
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

⚠️ **Never use this key with real money!**

## Play the Game

1. **Open** http://localhost:3000
2. **Connect** MetaMask wallet
3. **Create Room** → Enter name → Deposit 100
4. **Open Incognito** → Connect different account → Join room
5. **Play** → Game auto-starts with 2+ players!

## Common Commands

```bash
# View logs
npm run docker:logs

# Monitor events
npm run events:monitor

# Restart services
npm run docker:restart

# Stop everything
npm run docker:down

# Clean restart
npm run docker:down:volumes
npm run docker:up
```

## Troubleshooting

### Can't connect wallet?
- Install MetaMask
- Add Hardhat network (see above)
- Refresh page

### Contract not found?
```bash
npm run copy-abi
# Restart frontend
```

### Port already in use?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Project Structure

```
📁 Root
  ├── 📄 This file (QUICK_START.md)
  ├── 📄 FRONTEND_SETUP.md      ← Detailed frontend guide
  ├── 📄 README.md               ← Full documentation
  └── 📁 frontend/
      ├── 📄 README.md           ← Frontend API docs
      └── 📁 src/                ← React app code
```

## Next Steps

- 📖 Read [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) for detailed setup
- 🔧 Read [LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) for dev options
- 🤝 Read [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
- 📊 Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for what was built

## Key URLs

- **Frontend**: http://localhost:3000
- **Hardhat**: http://localhost:8545
- **Mock Gateway**: http://localhost:7077/health
- **Gateway Info**: http://localhost:7077/gateway/info

## Test Accounts (Hardhat)

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Use Account #0 for player 1, Account #1 for player 2 (incognito window).

## Full Feature List

✅ Wallet connection (MetaMask)
✅ FHE encryption (fhevmjs)
✅ Create encrypted game rooms
✅ Join existing rooms
✅ Real-time event updates
✅ Encrypted guess submission
✅ Prize distribution
✅ XP system
✅ Event monitoring dashboard
✅ Docker development environment

## Get Help

- 💬 Questions? Check README.md
- 🐛 Issues? See CONTRIBUTING.md
- 📖 Docs? Start with FRONTEND_SETUP.md
- 🔐 Security? Read SECURITY.md

---

**Made with ❤️ using React + Zama fhEVM + FHE 🎮🔐**

Now go build something awesome!
