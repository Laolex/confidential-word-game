# Contributing to Confidential Word Game

Thank you for your interest in contributing to the Confidential Word Game! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Project Structure](#project-structure)
- [Resources](#resources)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js >= 18.0.0
- npm or yarn package manager
- Git for version control
- A code editor (VS Code recommended)
- Basic understanding of:
  - Solidity smart contracts
  - Ethereum development (Hardhat, ethers.js)
  - Fully Homomorphic Encryption (FHE) concepts

### Setting Up Your Development Environment

1. **Fork the Repository**

   ```bash
   # Visit https://github.com/your-org/confidential-word-game
   # Click "Fork" button
   ```

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/confidential-word-game.git
   cd confidential-word-game
   ```

3. **Add Upstream Remote**

   ```bash
   git remote add upstream https://github.com/original-org/confidential-word-game.git
   ```

4. **Install Dependencies**

   ```bash
   npm install
   ```

5. **Copy Environment File**

   ```bash
   cp .env.example .env
   # Edit .env with your settings (use default values for local dev)
   ```

6. **Compile Contracts**

   ```bash
   npm run compile
   ```

7. **Run Tests**

   ```bash
   npm test
   ```

If all tests pass, you're ready to start contributing!

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch Naming Convention:**
- `feature/` - New features (e.g., `feature/add-power-ups`)
- `fix/` - Bug fixes (e.g., `fix/balance-calculation`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/optimize-gas`)
- `test/` - Test additions/improvements (e.g., `test/add-integration-tests`)

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed
- Test thoroughly locally

### 3. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add power-up system for revealing letters"
```

**Commit Message Convention:**

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
feat: add MAX_QUALIFIED_PLAYERS constant to prevent DOS
fix: add nonReentrant to depositBalance function
docs: update README with mock mode configuration
test: add integration tests for game flow
refactor: optimize gas usage in guess validation
```

### 4. Keep Your Branch Updated

```bash
# Regularly sync with upstream
git fetch upstream
git rebase upstream/main
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out the PR template (see below)
5. Submit the PR

## Coding Standards

### Solidity Contracts

**Style Guide:**
- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- Use 4 spaces for indentation (not tabs)
- Maximum line length: 100 characters
- Use explicit function visibility
- Always add NatSpec documentation

**Example:**

```solidity
/**
 * @notice Submit an encrypted guess for the current game round
 * @param gameId The ID of the game round
 * @param encryptedGuessLetters Array of encrypted letter values
 * @param inputProofs Zero-knowledge proofs for the encrypted inputs
 * @return requestId The Gateway decryption request ID
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
    // Implementation
}
```

**Best Practices:**
- Add reentrancy guards to state-changing functions
- Validate all inputs
- Use `require()` for input validation
- Use `revert()` with custom errors for gas optimization
- Emit events for all state changes
- Check for integer overflow/underflow
- Be mindful of gas costs

**Security Checklist:**
- [ ] All external functions have proper access control
- [ ] Input validation on all user-provided data
- [ ] Reentrancy protection where needed
- [ ] No unchecked external calls
- [ ] Proper use of `TFHE.allow()` for FHE data
- [ ] No accidental on-chain decryption of sensitive data

### JavaScript/TypeScript

**Style Guide:**
- Use ES6+ features
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Use `const` and `let` (not `var`)
- Use async/await (not raw promises)

**Example:**

```javascript
const { ethers } = require('hardhat');

async function deployContract() {
  const ContractFactory = await ethers.getContractFactory('ConfidentialWordGame');
  const contract = await ContractFactory.deploy(relayerAddress);
  await contract.deployed();

  console.log('Contract deployed to:', contract.address);
  return contract;
}
```

### Linting

Run linters before committing:

```bash
# Solidity linting
npm run lint

# Auto-fix issues
npm run lint:fix

# Code formatting
npm run prettier
```

## Testing

### Writing Tests

**All new features must include tests!**

**Test Structure:**

```javascript
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ConfidentialWordGame', function() {
  let game, owner, player1, player2;

  beforeEach(async function() {
    // Setup code
    [owner, player1, player2] = await ethers.getSigners();

    const Game = await ethers.getContractFactory('ConfidentialWordGame');
    game = await Game.deploy(owner.address);
    await game.deployed();
  });

  describe('Room Creation', function() {
    it('should create a room successfully', async function() {
      // Test implementation
    });

    it('should revert if name is empty', async function() {
      await expect(
        game.createRoom('')
      ).to.be.revertedWith('Name required');
    });
  });
});
```

**Test Coverage Requirements:**
- **New features:** 90%+ coverage
- **Bug fixes:** Add test that reproduces the bug
- **Refactoring:** Existing tests must pass

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/ConfidentialWordGame.test.js

# Run with gas reporting
npm run test:gas

# Run with coverage
npm run coverage
```

### Integration Testing

For features involving multiple components:

```bash
# Start local node (Terminal 1)
npm run node

# Deploy contracts (Terminal 2)
npm run deploy:local

# Run integration tests (Terminal 3)
npm run test:integration
```

## Submitting Changes

### Pull Request Process

1. **Ensure Tests Pass**
   ```bash
   npm test
   npm run lint
   ```

2. **Update Documentation**
   - Update README if needed
   - Add/update code comments
   - Update CHANGELOG.md

3. **Fill Out PR Template**

   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] All tests pass
   - [ ] New tests added
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added where needed
   - [ ] Documentation updated
   - [ ] No new warnings generated
   ```

4. **Wait for Review**
   - Maintainers will review within 3-5 business days
   - Address feedback promptly
   - Be open to suggestions

5. **Make Changes if Requested**
   ```bash
   # Make changes
   git add .
   git commit -m "fix: address review feedback"
   git push origin feature/your-feature
   ```

### PR Review Criteria

Your PR will be evaluated on:

- **Functionality:** Does it work as intended?
- **Code Quality:** Is it clean and maintainable?
- **Tests:** Are there sufficient tests?
- **Documentation:** Is it well documented?
- **Security:** Are there any vulnerabilities?
- **Gas Efficiency:** Is it optimized?
- **Breaking Changes:** Are they necessary and documented?

## Project Structure

```
confidential-word-game/
├── contracts/              # Solidity smart contracts
│   ├── ConfidentialWordGame.sol
│   └── libraries/
│       └── WordEncoding.sol
├── scripts/                # Deployment and utility scripts
│   ├── deploy.js
│   ├── relayer.js
│   ├── event-listener.js
│   └── monitor-game.js
├── test/                   # Test files
│   └── ConfidentialWordGame.test.js
├── frontend/               # Frontend SDK and examples
│   ├── WordGameSDK.js
│   └── example-react/
├── docs/                   # Additional documentation
│   └── LOCAL_DEVELOPMENT.md
├── docker/                 # Docker configuration
│   └── mock-gateway/
├── hardhat.config.js       # Hardhat configuration
├── package.json            # Dependencies
├── README.md               # Main documentation
├── CONTRIBUTING.md         # This file
└── SECURITY.md             # Security policy
```

### Key Files

- **contracts/ConfidentialWordGame.sol** - Main game logic
- **scripts/relayer.js** - Relayer service for game management
- **test/** - All test files
- **frontend/WordGameSDK.js** - JavaScript SDK for frontend integration
- **hardhat.config.js** - Network configurations

## Common Contribution Areas

### 🐛 Bug Fixes

Found a bug? Great!

1. Check if it's already reported in Issues
2. If not, create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
3. Fix the bug in a new branch
4. Add a test that reproduces the bug
5. Submit a PR referencing the issue

### ✨ New Features

Have an idea for a feature?

1. **First**, discuss it in an issue or discussion
2. Wait for maintainer approval
3. Design the feature (write a brief spec)
4. Implement in a feature branch
5. Add comprehensive tests
6. Update documentation
7. Submit PR

### 📚 Documentation

Documentation improvements are always welcome!

- Fix typos or unclear sections
- Add examples
- Improve code comments
- Write tutorials or guides

### 🧪 Testing

Help improve test coverage:

- Add edge case tests
- Write integration tests
- Improve test organization
- Add performance tests

## Resources

### Learning Materials

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Getting Help

- 💬 [Discord Community](https://discord.gg/your-server)
- 📖 [Documentation](https://docs.your-project.com)
- 🐛 [Issue Tracker](https://github.com/your-org/confidential-word-game/issues)
- 💡 [Discussions](https://github.com/your-org/confidential-word-game/discussions)

## Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Eligible for contributor NFT/POAP (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Confidential Word Game!** 🎮🔐

Your contributions help make private, decentralized gaming a reality!
