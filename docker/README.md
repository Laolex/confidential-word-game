# Docker Setup for Confidential Word Game

This directory contains Docker configuration for local development.

## Quick Start

```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up --build
```

## Services

### Hardhat Node
- **Port:** 8545
- **Purpose:** Local Ethereum development network
- **Access:** http://localhost:8545

### Mock Gateway
- **Port:** 7077
- **Purpose:** Simulates FHE Gateway for local testing
- **Health Check:** http://localhost:7077/health
- **Info:** http://localhost:7077/gateway/info

### Deployer
- **Purpose:** Automatically deploys contracts on startup
- **Runs once:** Exits after deployment

### Relayer
- **Purpose:** Manages game operations (start games, complete rounds)
- **Runs continuously:** Monitors contract events

## Usage

### Starting the Environment

```bash
# From project root
docker-compose up -d
```

Wait ~20 seconds for all services to initialize.

### Checking Status

```bash
# View all services
docker-compose ps

# Check specific service logs
docker-compose logs hardhat-node
docker-compose logs mock-gateway
docker-compose logs relayer
```

### Interacting with Contracts

The deployed contract address will be in the deployer logs:

```bash
docker-compose logs deployer | grep "deployed"
```

Use this address to interact via SDK or scripts.

### Stopping the Environment

```bash
# Stop services (preserves data)
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

## Development Workflow

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Make code changes** (hot-reload supported)

3. **Restart specific service:**
   ```bash
   docker-compose restart relayer
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **View events:**
   ```bash
   # In separate terminal
   export GAME_CONTRACT_ADDRESS=<from-deployer-logs>
   npm run events:listen
   ```

## Troubleshooting

### Services won't start

```bash
# Check if ports are in use
lsof -i :8545
lsof -i :7077

# Force remove old containers
docker-compose down -v
docker-compose up --force-recreate
```

### Deployer fails

```bash
# Check Hardhat node is ready
curl http://localhost:8545

# View detailed logs
docker-compose logs deployer
```

### Relayer not working

```bash
# Check contract address is set
docker-compose logs relayer

# Restart relayer
docker-compose restart relayer
```

## Mock Gateway Details

The mock gateway simulates Zama's FHE Gateway:

- **No real encryption:** All FHE operations are mocked
- **Instant responses:** No network delays
- **Random values:** Returns random boolean for guess validation
- **FOR DEVELOPMENT ONLY:** Never use in production

### Testing Mock Gateway

```bash
# Health check
curl http://localhost:7077/health

# Gateway info
curl http://localhost:7077/gateway/info

# List pending requests
curl http://localhost:7077/gateway/requests
```

## Network Architecture

```
┌─────────────────────────────────────────┐
│  Docker Network: game-network           │
│                                          │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ Hardhat Node │◄───┤  Mock Gateway│  │
│  │   :8545      │    │    :7077     │  │
│  └──────▲───────┘    └──────────────┘  │
│         │                                │
│    ┌────┴────┐        ┌──────────────┐  │
│    │ Deployer│        │   Relayer    │  │
│    │  (once) │        │ (continuous) │  │
│    └─────────┘        └──────────────┘  │
└─────────────────────────────────────────┘
```

## Production Considerations

**This Docker setup is for local development only!**

For production:
- Use real fhEVM network (not Hardhat)
- Use real Gateway (not mock)
- Secure relayer private keys
- Implement monitoring and alerts
- Use proper CI/CD pipelines

See `docs/LOCAL_DEVELOPMENT.md` for production deployment guide.
