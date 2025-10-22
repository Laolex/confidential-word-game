# 🚀 Deployment Guide - Confidential Word Game

Complete guide for deploying the Confidential Word Game to production.

## 📋 Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Node.js 18+ installed
- [ ] Private key with sufficient funds
- [ ] Access to target network RPC
- [ ] Verified Zama Gateway endpoint
- [ ] Domain/hosting for relayer service

### 2. Security Review
- [ ] All contracts audited
- [ ] Private keys secured (hardware wallet recommended)
- [ ] Environment variables properly configured
- [ ] Access control verified
- [ ] Rate limiting implemented on relayer

### 3. Testing Complete
- [ ] All unit tests passing
- [ ] Integration tests completed
- [ ] Gas optimization verified
- [ ] Frontend tested with testnet

## 🔧 Environment Setup

### 1. Configure Environment Variables

Create `.env` file:

```bash
# Network Configuration
PRIVATE_KEY=your_private_key_here
ZAMA_DEVNET_RPC_URL=https://devnet.zama.ai
GATEWAY_URL=https://gateway.devnet.zama.ai

# Post-Deployment (fill after deployment)
GAME_CONTRACT_ADDRESS=

# Optional: Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**🔒 Security:** Never commit `.env` to version control!

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile Contracts

```bash
npm run compile
```

Verify compilation output:
```
Compiled 2 Solidity files successfully
```

## 🏗️ Deployment Process

### Option A: Zama Devnet (Recommended for Testing)

#### Step 1: Get Testnet Funds

Visit the [Zama Faucet](https://faucet.zama.ai) and request test tokens.

Verify balance:
```bash
npx hardhat run scripts/check-balance.js --network zamaDevnet
```

#### Step 2: Deploy Contract

```bash
npm run deploy:zama
```

Expected output:
```
🚀 Deploying ConfidentialWordGame...

Deploying with account: 0x...
Account balance: 100000000000000000000

📝 Contract Parameters:
- Relayer address: 0x...
- Entry fee: 10 ETH
- Max players per room: 5
- Round time limit: 60 seconds

⏳ Deploying contract...
✅ Contract deployed successfully!
📍 Contract address: 0x1234567890abcdef...
```

#### Step 3: Save Deployment Info

The script automatically saves to `deployments/zamaDevnet-deployment.json`:

```json
{
  "network": "zamaDevnet",
  "contractAddress": "0x...",
  "relayerAddress": "0x...",
  "deployer": "0x...",
  "deploymentTime": "2024-01-15T10:30:00.000Z",
  "blockNumber": 123456
}
```

#### Step 4: Set Environment Variable

```bash
export GAME_CONTRACT_ADDRESS=0x...  # From deployment output
```

#### Step 5: Verify Deployment

```bash
npx hardhat run scripts/verify-deployment.js --network zamaDevnet
```

### Option B: Zama Mainnet (Production)

⚠️ **Warning:** Deploying to mainnet requires real funds and thorough testing!

#### Prerequisites
- Full security audit completed
- Comprehensive testing on devnet
- Secure key management (hardware wallet)
- Monitoring infrastructure ready

#### Deployment Steps

1. **Update Hardhat Config**

Add mainnet configuration to `hardhat.config.js`:

```javascript
zamaMainnet: {
  url: "https://mainnet.zama.ai",
  chainId: 8008,  // Verify actual chain ID
  accounts: [process.env.MAINNET_PRIVATE_KEY],
  gasPrice: 1000000000,
}
```

2. **Deploy**

```bash
npm run deploy -- --network zamaMainnet
```

3. **Verify Contract** (if supported)

```bash
npx hardhat verify --network zamaMainnet DEPLOYED_ADDRESS RELAYER_ADDRESS
```

## 🤖 Relayer Service Deployment

The relayer is critical for game operation. Deploy as a persistent service.

### Option A: Cloud VM (Recommended)

#### 1. Setup Server

```bash
# SSH into server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Deploy Code

```bash
# Clone repository
git clone <your-repo-url>
cd confidential-word-game

# Install dependencies
npm install --production

# Configure environment
cp .env.example .env
nano .env  # Edit with production values
```

#### 3. Start Relayer with PM2

```bash
pm2 start scripts/relayer.js --name word-game-relayer

# View logs
pm2 logs word-game-relayer

# Monitor
pm2 monit

# Setup auto-restart on server reboot
pm2 startup
pm2 save
```

#### 4. Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# If exposing API (optional)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
```

### Option B: Docker Container

#### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "scripts/relayer.js"]
```

#### 2. Build and Run

```bash
# Build image
docker build -t word-game-relayer .

# Run container
docker run -d \
  --name relayer \
  --restart unless-stopped \
  -e GAME_CONTRACT_ADDRESS=0x... \
  -e GATEWAY_URL=https://gateway.devnet.zama.ai \
  word-game-relayer

# View logs
docker logs -f relayer
```

### Option C: Kubernetes

See `k8s/` directory for Kubernetes manifests (if applicable).

## 🌐 Frontend Deployment

### Option A: Vercel/Netlify

#### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
```

#### 2. Configure Build Settings

**Vercel/Netlify Configuration:**
- Build command: `npm run build`
- Publish directory: `dist` or `build`
- Node version: 18

#### 3. Environment Variables

Add to hosting platform:
```
VITE_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=8009
VITE_GATEWAY_URL=https://gateway.devnet.zama.ai
```

#### 4. Deploy

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

### Option B: IPFS (Decentralized)

```bash
# Build frontend
npm run build

# Upload to IPFS
ipfs add -r dist/

# Get CID
# QmXxx...

# Access via gateway
https://ipfs.io/ipfs/QmXxx...
```

## 🔍 Post-Deployment Verification

### 1. Contract Verification

```bash
# Test balance deposit
npx hardhat run scripts/test-deposit.js --network zamaDevnet

# Test room creation
npx hardhat run scripts/test-room.js --network zamaDevnet
```

### 2. Relayer Health Check

```bash
# Check if relayer is running
pm2 status

# View recent logs
pm2 logs word-game-relayer --lines 50

# Check for errors
pm2 logs word-game-relayer --err
```

### 3. Frontend Connection Test

Open browser console and verify:

```javascript
// Check MetaMask connection
const accounts = await window.ethereum.request({
  method: 'eth_accounts'
});
console.log('Connected:', accounts[0]);

// Check SDK initialization
// Should see: "✅ SDK initialized"
```

### 4. End-to-End Test

Complete a full game flow:

1. ✅ Deposit balance
2. ✅ Create room
3. ✅ Second player joins
4. ✅ Game starts automatically
5. ✅ Submit guess
6. ✅ Receive validation
7. ✅ Round completes
8. ✅ Prize distributed

## 📊 Monitoring & Maintenance

### 1. Setup Monitoring

**Contract Events:**
```javascript
// scripts/monitor-events.js
contract.on('GameStarted', (roomId, gameId, wordLength) => {
  console.log(`[${new Date().toISOString()}] Game started:`, gameId);
  // Send to monitoring service (e.g., DataDog, Grafana)
});
```

**Relayer Health:**
```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Metrics to Track:**
- Games started per hour
- Average round completion time
- Failed transactions
- Gas consumption
- Player count

### 2. Logging

Configure structured logging:

```javascript
// Add to relayer
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 3. Alerts

Setup alerts for:
- Relayer downtime
- Transaction failures
- Low relayer balance
- Unusual gas spikes
- Contract errors

**Example with PM2:**
```bash
pm2 install pm2-slack
pm2 set pm2-slack:slack_url https://hooks.slack.com/...
```

## 🔐 Security Best Practices

### 1. Key Management

**Development:**
- Use separate keys for dev/test/prod
- Never commit private keys
- Use hardware wallets for mainnet

**Production:**
```bash
# Store in secure vault (HashiCorp Vault, AWS Secrets Manager)
aws secretsmanager create-secret \
  --name prod/game/private-key \
  --secret-string "0x..."

# Retrieve in deployment script
PRIVATE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id prod/game/private-key \
  --query SecretString \
  --output text)
```

### 2. Rate Limiting

Protect relayer endpoints:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Access Control

```solidity
// Ensure proper access control in contract
modifier onlyRelayer() {
    require(msg.sender == relayer, "Not authorized");
    _;
}
```

### 4. Regular Updates

```bash
# Check for security updates
npm audit

# Update dependencies
npm update

# Redeploy if critical fixes
```

## 🆘 Troubleshooting

### Issue: Deployment Fails with "insufficient funds"

**Solution:**
```bash
# Check balance
npx hardhat run scripts/check-balance.js --network zamaDevnet

# Request more from faucet
# Visit: https://faucet.zama.ai
```

### Issue: Relayer not starting games

**Solution:**
1. Check relayer logs: `pm2 logs word-game-relayer`
2. Verify contract address in `.env`
3. Ensure relayer account has gas
4. Check network connectivity

### Issue: Frontend can't connect to contract

**Solution:**
1. Verify contract address in frontend config
2. Check MetaMask network (should be Zama Devnet)
3. Ensure CORS headers if using custom RPC
4. Check browser console for errors

### Issue: High gas costs

**Solution:**
1. Optimize word length (shorter = cheaper)
2. Batch operations where possible
3. Consider L2 deployment
4. Review FHE operation usage

## 📞 Support

For deployment issues:
- GitHub Issues: [your-repo/issues](https://github.com/your-repo/issues)
- Discord: [your-discord-link]
- Email: support@your-domain.com

## 📝 Deployment Checklist

Final checklist before going live:

- [ ] Contracts compiled without errors
- [ ] All tests passing (100% coverage)
- [ ] Security audit completed
- [ ] Contract deployed to target network
- [ ] Deployment info saved
- [ ] Relayer deployed and running
- [ ] Frontend deployed and accessible
- [ ] End-to-end test completed
- [ ] Monitoring configured
- [ ] Alerts setup
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] Backup/recovery plan in place
- [ ] Announcement prepared

---

**✅ Deployment Complete!**

Your Confidential Word Game is now live and ready for players! 🎉
