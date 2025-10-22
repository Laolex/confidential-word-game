const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

/**
 * Mock FHE Gateway Server
 *
 * Simulates Zama's Gateway for local development:
 * - Accepts decryption requests
 * - Returns mock decrypted values instantly
 * - Logs requests for debugging
 * - No real FHE operations (plaintext simulation)
 *
 * This allows rapid local development without needing:
 * - Real Gateway infrastructure
 * - Testnet tokens
 * - Network delays
 */

const app = express();
const PORT = process.env.PORT || 7077;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// In-memory storage for pending requests
const pendingRequests = new Map();
let requestIdCounter = 1;

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mock-fhe-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Request decryption endpoint
 * POST /gateway/requestDecryption
 *
 * Accepts encrypted values and returns mock decrypted results
 */
app.post('/gateway/requestDecryption', (req, res) => {
  const { ciphertexts, callbackSelector, callbackGasLimit } = req.body;

  if (!ciphertexts || !Array.isArray(ciphertexts)) {
    return res.status(400).json({
      error: 'Invalid request: ciphertexts array required',
    });
  }

  const requestId = requestIdCounter++;

  // Generate mock decrypted values
  // For boolean (guess validation): randomly return true/false
  // For numbers (balance): return a reasonable mock value
  const decryptedValues = ciphertexts.map((ct, index) => {
    // Guess validation requests typically have 1 ciphertext (boolean)
    // Balance requests also have 1 ciphertext (uint32)

    // Simple heuristic: if it looks like a balance request, return larger number
    // Otherwise assume it's a boolean guess result
    const mockValue = Math.random() > 0.5 ? true : false;

    console.log(`  📥 Decryption request #${requestId}.${index}:`);
    console.log(`     Ciphertext: ${ct.substring(0, 20)}...`);
    console.log(`     Mock result: ${mockValue}`);

    return mockValue;
  });

  // Store request
  pendingRequests.set(requestId, {
    requestId,
    ciphertexts,
    decryptedValues,
    callbackSelector,
    callbackGasLimit,
    timestamp: Date.now(),
    status: 'pending',
  });

  // Simulate instant "decryption" by immediately marking as ready
  setTimeout(() => {
    const request = pendingRequests.get(requestId);
    if (request) {
      request.status = 'ready';
      console.log(`  ✅ Decryption #${requestId} ready for callback`);
    }
  }, 100); // Small delay to simulate processing

  res.json({
    requestId,
    status: 'accepted',
    message: 'Mock decryption request accepted',
  });
});

/**
 * Get decryption result endpoint
 * GET /gateway/getResult/:requestId
 *
 * Returns mock decrypted values for a request
 */
app.get('/gateway/getResult/:requestId', (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);

  if (!pendingRequests.has(requestId)) {
    return res.status(404).json({
      error: 'Request not found',
      requestId,
    });
  }

  const request = pendingRequests.get(requestId);

  if (request.status !== 'ready') {
    return res.status(202).json({
      status: 'pending',
      message: 'Decryption still in progress',
      requestId,
    });
  }

  res.json({
    requestId,
    status: 'completed',
    decryptedValues: request.decryptedValues,
    timestamp: new Date(request.timestamp).toISOString(),
  });
});

/**
 * List all pending requests (for debugging)
 * GET /gateway/requests
 */
app.get('/gateway/requests', (req, res) => {
  const requests = Array.from(pendingRequests.values()).map(req => ({
    requestId: req.requestId,
    status: req.status,
    ciphertextCount: req.ciphertexts.length,
    timestamp: new Date(req.timestamp).toISOString(),
  }));

  res.json({
    count: requests.length,
    requests,
  });
});

/**
 * Clear old requests (cleanup endpoint)
 * DELETE /gateway/requests/cleanup
 */
app.delete('/gateway/requests/cleanup', (req, res) => {
  const maxAge = parseInt(req.query.maxAge || '3600000', 10); // 1 hour default
  const now = Date.now();
  let deletedCount = 0;

  for (const [requestId, request] of pendingRequests.entries()) {
    if (now - request.timestamp > maxAge) {
      pendingRequests.delete(requestId);
      deletedCount++;
    }
  }

  res.json({
    message: `Cleaned up ${deletedCount} old requests`,
    deletedCount,
    remaining: pendingRequests.size,
  });
});

/**
 * Mock Gateway Info endpoint
 * GET /gateway/info
 */
app.get('/gateway/info', (req, res) => {
  res.json({
    name: 'Mock FHE Gateway',
    version: '1.0.0',
    description: 'Local development gateway for Confidential Word Game',
    features: [
      'Instant decryption simulation',
      'No real FHE operations',
      'Request logging and debugging',
      'Compatible with fhevmjs',
    ],
    warnings: [
      'FOR DEVELOPMENT ONLY',
      'No privacy guarantees',
      'Not suitable for production',
      'All values are mock/random',
    ],
    endpoints: {
      health: 'GET /health',
      requestDecryption: 'POST /gateway/requestDecryption',
      getResult: 'GET /gateway/getResult/:requestId',
      listRequests: 'GET /gateway/requests',
      cleanup: 'DELETE /gateway/requests/cleanup',
      info: 'GET /gateway/info',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    hint: 'Try GET /gateway/info for available endpoints',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🔐 Mock FHE Gateway Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Info: http://localhost:${PORT}/gateway/info`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  WARNING: This is a MOCK gateway for development only!');
  console.log('   No real FHE operations - all values are simulated.');
  console.log('   DO NOT use in production!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down mock gateway...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📴 Shutting down mock gateway...');
  process.exit(0);
});
