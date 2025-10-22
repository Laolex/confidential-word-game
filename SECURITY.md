# 🔐 Security Policy

## Overview

The Confidential Word Game implements Fully Homomorphic Encryption (FHE) to ensure player privacy. This document outlines security considerations, threat model, and best practices.

## Threat Model

### What We Protect

1. **Player Balances** (Encrypted)
   - Individual balances never exposed on-chain
   - Only player can decrypt their own balance
   - Homomorphic operations preserve privacy

2. **Game Words** (Encrypted)
   - Words encrypted character-by-character
   - Only relayer knows plaintext (until game end)
   - Players cannot see others' guesses in plaintext

3. **Guess Validation** (Privacy-Preserving)
   - Comparison done homomorphically
   - Only boolean result decrypted via Gateway
   - No intermediate plaintext values

### What We Don't Protect

1. **Public Game Metadata**
   - Room creation (public)
   - Player participation (public addresses)
   - Game outcomes (winners are public)
   - Timestamps and round progression

2. **On-Chain Analysis**
   - Transaction patterns visible
   - Gas usage reveals operation types
   - Event emissions are public

## Security Architecture

### 1. FHE Privacy Guarantees

#### Encryption at Rest
```solidity
mapping(address => euint32) public playerBalances;
```
- Ciphertext stored on-chain
- Decryption requires private key
- TFHE.allow() controls access

#### Homomorphic Operations
```solidity
euint32 newBalance = TFHE.add(currentBalance, deposit);
```
- Operations on encrypted data
- No intermediate decryption
- Result remains encrypted

#### Gateway Decryption Pattern
```solidity
// 1. Compute on encrypted data
ebool isCorrect = TFHE.eq(guess, word);

// 2. Request decryption (off-chain)
Gateway.requestDecryption(isCorrect, callback, ...);

// 3. Callback with plaintext (only boolean)
function callback(uint256 requestId, bool result) {
    // Update state based on result
}
```

**Key Point:** Only the final boolean result is decrypted, not the guess or word.

### 2. Access Control

#### Role-Based Permissions

```solidity
modifier onlyRelayer() {
    require(msg.sender == relayer || msg.sender == owner());
    _;
}

modifier onlyPlayerInRoom(uint256 roomId) {
    require(rooms[roomId].players[msg.sender].isActive);
    _;
}
```

#### Encrypted Data Access
```solidity
// Allow player to decrypt their own balance
TFHE.allow(playerBalances[msg.sender], msg.sender);

// Contract needs access for operations
TFHE.allowThis(playerBalances[player]);
```

**Rules:**
- Never allow arbitrary addresses to decrypt
- Always validate permissions before TFHE.allow()
- Use Gateway for cross-player comparisons

### 3. Input Validation

All user inputs are validated:

```solidity
function submitGuess(
    uint256 gameId,
    einput[] calldata encryptedGuessLetters,
    bytes[] calldata inputProofs
) external {
    // Validate game state
    require(!gameRounds[gameId].isComplete, "Game complete");

    // Validate player state
    require(player.attemptsUsed < MAX_ATTEMPTS, "No attempts");

    // Validate input length
    require(
        encryptedGuessLetters.length == game.wordLength,
        "Wrong length"
    );

    // Validate proofs (done by TFHE.asEuint8)
    for (uint i = 0; i < game.wordLength; i++) {
        guessLetters[i] = TFHE.asEuint8(
            encryptedGuessLetters[i],
            inputProofs[i]
        );
    }
}
```

### 4. Reentrancy Protection

```solidity
contract ConfidentialWordGame is ReentrancyGuard {
    function submitGuess(...)
        external
        nonReentrant  // ✅ Protected
    {
        // ...
    }
}
```

All state-changing functions that could be exploited use `nonReentrant`.

## Known Limitations

### 1. Relayer Trust Assumption

**Issue:** Relayer knows plaintext words before encryption.

**Mitigation:**
- Use trusted relayer (multisig in production)
- Implement verifiable random word generation (VRF)
- Potential future: ZK proofs of correct encryption

**Recommendation:** For production, use:
- Hardware Security Module (HSM) for relayer key
- Multisig relayer (3-of-5)
- Public audit log of relayer actions

### 2. Gateway Decryption

**Issue:** Gateway sees decrypted values during callback.

**Mitigation:**
- Gateway is operated by Zama (trusted party)
- Only boolean results decrypted (not sensitive data)
- Threshold decryption in future versions

**Note:** This is inherent to current fhEVM architecture.

### 3. Gas-Based Timing Attacks

**Issue:** Different operations consume different gas.

**Example:**
```solidity
// Different gas for correct vs incorrect
if (isCorrect) {
    // More operations = more gas
    awardPrize();
    updateLeaderboard();
}
```

**Mitigation:**
- Normalize gas usage where possible
- Use constant-time operations
- Consider gas obfuscation techniques

**Status:** Acceptable risk for this application.

### 4. Front-Running

**Issue:** Transactions visible in mempool before inclusion.

**Attack Vector:**
```
1. Player A submits guess transaction
2. Attacker sees transaction in mempool
3. Attacker submits same guess with higher gas
4. Attacker's transaction mined first
```

**Mitigation:**
- Encrypted guesses prevent plaintext copying
- First-guess timestamp prevents simple replay
- Consider private mempools (Flashbots) for production

**Current Protection:** ✅ FHE encryption prevents guess copying

## Audit Recommendations

Before mainnet deployment, we recommend auditing:

### Smart Contract Audit

1. **Access Control**
   - [ ] Verify all modifiers correct
   - [ ] Check owner/relayer privilege escalation
   - [ ] Validate TFHE.allow() usage

2. **FHE Operations**
   - [ ] Ensure no accidental decryption
   - [ ] Verify homomorphic operations correct
   - [ ] Check Gateway integration

3. **Game Logic**
   - [ ] Test edge cases (0 players, timeout, etc.)
   - [ ] Verify prize distribution math
   - [ ] Check round progression logic

4. **Integer Overflow/Underflow**
   - [ ] Validate all arithmetic operations
   - [ ] Check euint32 limits
   - [ ] Test balance edge cases

### Infrastructure Audit

1. **Relayer Security**
   - [ ] Key management practices
   - [ ] API rate limiting
   - [ ] DDoS protection

2. **Frontend Security**
   - [ ] XSS prevention
   - [ ] CSRF protection
   - [ ] Secure WebSocket connections

## Responsible Disclosure

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: security@your-domain.com
3. Encrypt with PGP key: [link-to-pgp-key]
4. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours:** Acknowledgment of receipt
- **72 hours:** Initial assessment
- **7 days:** Detailed response with timeline
- **30 days:** Fix deployed (or extended timeline communicated)

### Bug Bounty

We offer rewards for critical vulnerabilities:

| Severity | Reward |
|----------|--------|
| Critical | $5,000+ |
| High     | $2,000 |
| Medium   | $500   |
| Low      | $100   |

**Scope:**
- Smart contracts
- Relayer service
- Frontend SDK
- Deployment infrastructure

**Out of Scope:**
- Social engineering
- DDoS attacks
- Issues in third-party dependencies (report upstream)

## Security Best Practices for Users

### For Players

1. **Wallet Security**
   - ✅ Use hardware wallet for large amounts
   - ✅ Verify contract address before interacting
   - ✅ Check transaction details in MetaMask
   - ❌ Never share private keys
   - ❌ Never approve unlimited token allowances

2. **Privacy**
   - ✅ Understand what data is encrypted vs public
   - ✅ Use different addresses for privacy
   - ❌ Don't doxx yourself via transaction patterns

3. **Scam Prevention**
   - ✅ Bookmark official website
   - ✅ Verify smart contract address
   - ❌ Don't click suspicious links
   - ❌ Don't trust random airdrops

### For Developers

1. **Integration Security**
   ```javascript
   // ✅ Good: Validate contract address
   const VERIFIED_CONTRACT = "0x...";
   if (contractAddress !== VERIFIED_CONTRACT) {
       throw new Error("Invalid contract");
   }

   // ❌ Bad: Trust user input
   const sdk = new SDK(userProvidedAddress);
   ```

2. **Key Management**
   ```javascript
   // ✅ Good: Use environment variables
   const key = process.env.PRIVATE_KEY;

   // ❌ Bad: Hardcode keys
   const key = "0x1234...";
   ```

3. **Error Handling**
   ```javascript
   // ✅ Good: Don't leak sensitive info
   catch (error) {
       console.error("Transaction failed");
       // Log full error server-side only
   }

   // ❌ Bad: Expose internal state
   catch (error) {
       alert(error.message); // May contain sensitive data
   }
   ```

## Incident Response Plan

### Detection
- Automated monitoring for anomalous activity
- User reports via security@your-domain.com
- Community Discord monitoring

### Response Steps

1. **Confirm** (within 1 hour)
   - Verify the issue
   - Assess severity
   - Alert core team

2. **Contain** (within 4 hours)
   - Pause affected components if needed
   - Emergency pause contracts (if critical)
   - Preserve evidence

3. **Investigate** (within 24 hours)
   - Root cause analysis
   - Scope of impact
   - Affected users identified

4. **Remediate** (within 72 hours)
   - Deploy fixes
   - Test thoroughly
   - Prepare user communications

5. **Communicate** (ongoing)
   - Notify affected users
   - Public disclosure (after fix)
   - Post-mortem report

### Emergency Contacts

- **Security Lead:** security@your-domain.com
- **On-Call:** [PagerDuty/OpsGenie link]
- **Zama Support:** support@zama.ai (for FHE issues)

## Compliance & Legal

### Data Privacy

**GDPR Considerations:**
- On-chain data is pseudonymous (addresses)
- Encrypted data cannot be "deleted" from blockchain
- Users control their decryption keys

**Privacy Policy:**
- We do not collect PII
- Blockchain data is inherently public (except encrypted values)
- User wallets are pseudonymous

### Smart Contract Risks

**Disclaimer:**
```
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
Users interact at their own risk. No guarantees of:
- Funds safety
- Game fairness
- Privacy guarantees beyond FHE implementation
```

See LICENSE file for full terms.

## Security Checklist

Before deployment:

- [ ] Smart contract audit completed
- [ ] Relayer security review done
- [ ] Frontend security testing passed
- [ ] All tests passing (100% coverage)
- [ ] Key management procedures documented
- [ ] Incident response plan tested
- [ ] Monitoring and alerting configured
- [ ] Rate limiting implemented
- [ ] Emergency pause function tested
- [ ] Backup/recovery procedures documented
- [ ] Security disclosure policy published
- [ ] Bug bounty program launched
- [ ] User security documentation published
- [ ] Team security training completed

---

**Last Updated:** 2024-01-15

**Security Contact:** security@your-domain.com

**PGP Fingerprint:** [Your PGP fingerprint]
