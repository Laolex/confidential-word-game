# Confidential Word Game Frontend

React-based frontend for the Confidential Word Game with FHE encryption support.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- MetaMask browser extension
- Running smart contract (local or devnet)

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Layout.jsx
│   │   └── WalletButton.jsx
│   ├── contexts/       # React contexts for state management
│   │   ├── WalletContext.jsx
│   │   └── GameContext.jsx
│   ├── pages/          # Page components
│   │   ├── Home.jsx
│   │   ├── CreateRoom.jsx
│   │   ├── Room.jsx
│   │   ├── GamePlay.jsx
│   │   ├── Leaderboard.jsx
│   │   └── Profile.jsx
│   ├── contracts/      # Contract ABI files
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Configuration

### Environment Variables

Create `.env` file:

```bash
# Contract address (from deployment)
VITE_CONTRACT_ADDRESS=0x...

# Gateway URL (optional, for real FHE)
VITE_GATEWAY_URL=https://gateway.devnet.zama.ai
```

### Contract ABI

After deploying the smart contract:

```bash
# Copy ABI from hardhat artifacts
cp ../artifacts/contracts/ConfidentialWordGame.sol/ConfidentialWordGame.json \
   src/contracts/ConfidentialWordGame.json
```

Or use the provided script:

```bash
npm run copy-abi
```

## Development

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

### Wallet Integration

- MetaMask connection
- Account management
- Network detection
- Balance display

### FHE Encryption

- Client-side encryption using fhevmjs
- Encrypted balance deposits
- Encrypted guess submissions
- Privacy-preserving gameplay

### Real-time Updates

- Event listeners for contract events
- Automatic room list updates
- Live game state updates
- Toast notifications for actions

### Responsive Design

- Mobile-first approach
- Tailwind CSS styling
- Dark mode support (optional)
- Accessible components

## Usage

### 1. Connect Wallet

Click "Connect Wallet" button in header to connect MetaMask.

### 2. Deposit Balance

Navigate to "Create Room" and deposit encrypted balance.

### 3. Create or Join Room

- Create: Set display name and deposit amount
- Join: Select room from list

### 4. Play Game

- Wait for game to start (2+ players needed)
- Submit encrypted guesses
- View results in real-time

### 5. Win Prizes

Correct guesses qualify you for next rounds. Last player wins!

## Key Components

### WalletContext

Manages wallet connection and FHE instance:

```jsx
import { useWallet } from './contexts/WalletContext';

function MyComponent() {
  const { account, contract, encrypt32 } = useWallet();
  // Use wallet functionality
}
```

### GameContext

Manages game state and events:

```jsx
import { useGame } from './contexts/GameContext';

function MyComponent() {
  const { rooms, currentGame, playerXP } = useGame();
  // Access game data
}
```

## API Reference

### useWallet Hook

```typescript
{
  account: string | null;           // Connected address
  provider: BrowserProvider | null; // Ethers provider
  contract: Contract | null;        // Contract instance
  fhevmInstance: FhevmInstance;     // FHE instance
  isConnected: boolean;             // Connection status
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  encrypt8: (value: number) => EncryptedData;
  encrypt32: (value: number) => EncryptedData;
}
```

### useGame Hook

```typescript
{
  rooms: Room[];                    // All active rooms
  currentRoom: number | null;       // Current room ID
  currentGame: Game | null;         // Current game state
  playerInfo: PlayerInfo | null;    // Player stats
  playerXP: number;                 // Player XP
  fetchRooms: () => Promise<void>;
  fetchGameInfo: (gameId: number) => Promise<Game>;
}
```

## Troubleshooting

### "Please install MetaMask"

Install MetaMask browser extension from https://metamask.io

### "Failed to initialize FHE"

- Check VITE_GATEWAY_URL in .env
- For local dev, leave it empty
- For devnet, use https://gateway.devnet.zama.ai

### "Contract not deployed"

- Ensure contract is deployed
- Check VITE_CONTRACT_ADDRESS matches deployment
- Verify you're on correct network

### "Transaction failed"

- Check you have sufficient ETH for gas
- Verify you have deposited encrypted balance
- Check console for detailed error

## Building for Production

```bash
# Build optimized bundle
npm run build

# Output in dist/ directory
# Deploy dist/ to your hosting service
```

### Deployment Options

- **Vercel**: Connect GitHub repo, auto-deploy
- **Netlify**: Drag-and-drop dist/ folder
- **IPFS**: `npx ipfs-deploy dist/`
- **Traditional**: Upload dist/ to web server

## Performance

- Code splitting with React.lazy()
- Optimized bundle size
- Tree shaking enabled
- Asset optimization
- Gzip compression

## Security Considerations

- Never commit private keys or sensitive env vars
- Use HTTPS in production
- Validate all user inputs
- Handle errors gracefully
- Implement rate limiting for API calls

## Browser Support

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

Requires MetaMask extension.

## Contributing

See main project CONTRIBUTING.md for guidelines.

## License

MIT License - see main project LICENSE file.

---

**Built with React, Vite, Tailwind CSS, and Zama's fhEVM** 🎮🔐
