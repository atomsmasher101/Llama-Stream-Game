const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'networks.json');
const MAX_NETWORKS = 100;
const MAX_SUBMIT = 5;
const MIN_FITNESS = 100;
const INITIAL_POOL_SIZE = 20;  // Accept all submissions until we have this many

// Middleware - CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    networks: networks.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    uptime: process.uptime()
  });
});

// Get top networks
app.get('/api/networks', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const topNetworks = networks.slice(0, limit).map(n => ({
    id: n.id,
    fitness: n.fitness,
    hiddenSize: n.hiddenSize,
    w1: n.w1,
    w2: n.w2,
    b1: n.b1,
    b2: n.b2,
    producer: n.producer,
    actionProfile: n.actionProfile,
    trainingStats: n.trainingStats
  }));

  res.json({
    count: topNetworks.length,
    networks: topNetworks
  });
});

// Clear all networks (reset training) - must be before /:id route
app.delete('/api/networks/clear', (req, res) => {
  const count = networks.length;
  networks = [];
  saveNetworks();
  
  console.log(`Cleared all ${count} networks`);
  
  res.json({ 
    success: true, 
    message: `Cleared ${count} networks`,
    deletedCount: count 
  });
});

// Delete a specific network
app.delete('/api/networks/:id', (req, res) => {
  const networkId = req.params.id;
  
  const index = networks.findIndex(n => n.id === networkId);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Network not found' });
  }
  
  const deleted = networks.splice(index, 1)[0];
  saveNetworks();
  
  console.log(`Deleted network: ${deleted.id} (fitness: ${deleted.fitness})`);
  
  res.json({ 
    success: true, 
    message: 'Network deleted',
    deletedId: deleted.id 
  });
});

// Submit networks
app.post('/api/networks', (req, res) => {
  const { networks: submittedNetworks } = req.body;

  if (!submittedNetworks || !Array.isArray(submittedNetworks)) {
    return res.status(400).json({ error: 'Invalid request: expected { networks: [...] }' });
  }

  if (submittedNetworks.length > MAX_SUBMIT) {
    return res.status(400).json({ error: `Maximum ${MAX_SUBMIT} networks per submit` });
  }

  const added = [];
  const rejected = [];

  for (const net of submittedNetworks) {
    // Validate required fields
    if (!net.w1 || !net.w2 || !net.b1 || !net.b2 || !net.fitness) {
      rejected.push({ error: 'Missing required fields', network: net });
      continue;
    }

    // Validate fitness is a valid number
    if (!isValidNumber(net.fitness)) {
      rejected.push({ error: 'Invalid fitness value', fitness: net.fitness });
      continue;
    }

    // Validate weight arrays
    if (!isValidNumberArray(net.w1) || !isValidNumberArray(net.w2) || 
        !isValidNumberArray(net.b1) || !isValidNumberArray(net.b2) ||
        net.w1.length < 10 || net.w2.length < 6) {
      rejected.push({ error: 'Invalid weight arrays' });
      continue;
    }

    // Quality gate - accept all submissions until we have enough high-quality networks
    const highQualityCount = networks.filter(n => n.fitness >= MIN_FITNESS).length;
    const needsMoreData = highQualityCount < INITIAL_POOL_SIZE;
    
    // Accept if we need more data OR if fitness is high enough
    if (!needsMoreData && net.fitness < MIN_FITNESS) {
      rejected.push({ error: 'Fitness too low', fitness: net.fitness });
      continue;
    }
    
    // Check for duplicate ID - reject if this ID already exists
    if (net.id) {
      const existingIndex = networks.findIndex(n => n.id === net.id);
      if (existingIndex !== -1) {
        rejected.push({ error: 'Duplicate network ID', id: net.id });
        continue;
      }
    }

    const addedNet = addNetwork(net);
    added.push(addedNet);
  }

  console.log(`Submitted: ${added.length} added, ${rejected.length} rejected`);

  res.json({
    added: added.length,
    rejected: rejected.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0
  });
});

// Get server info (no personal info)
app.get('/api/stats', (req, res) => {
  res.json({
    totalNetworks: networks.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    averageFitness: networks.length > 0 
      ? networks.reduce((sum, n) => sum + n.fitness, 0) / networks.length 
      : 0
  });
});

// Serve monitor.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor.html'));
});

// Serve replay monitor at /replay
app.get('/replay', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor_replay.html'));
});

// Serve static files (monitor.html, monitor_replay.html, etc.)
app.use(express.static(__dirname));

// In-memory storage
let networks = [];

// Load networks from file on startup
function loadNetworks() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      // Validate loaded networks and filter out any invalid entries
      networks = parsed.filter(net => isValidNetworkObject(net)).map(net => {
        const meta = inferMetadata(net);
        return {
          ...net,
          hiddenSize: net.hiddenSize || 48,
          producer: meta.producer,
          actionProfile: meta.actionProfile,
          trainingStats: meta.trainingStats,
        };
      });
      
      const skipped = parsed.length - networks.length;
      if (skipped > 0) {
        console.warn(`Skipped ${skipped} invalid networks during load`);
      }
      
      console.log(`Loaded ${networks.length} networks from disk`);
    }
  } catch (err) {
    console.error('Error loading networks:', err.message);
    networks = [];
  }
}

// Helper function to validate a network object
function isValidNetworkObject(net) {
  if (!net || typeof net !== 'object') return false;
  
  // Check required fields
  if (!isValidNumber(net.fitness)) return false;
  if (!isValidNumberArray(net.w1)) return false;
  if (!isValidNumberArray(net.w2)) return false;
  if (!isValidNumberArray(net.b1)) return false;
  if (!isValidNumberArray(net.b2)) return false;
  
  // Check array dimensions
  if (net.w1.length < 10 || net.w2.length < 6) return false;
  
  // Optional fields
  if (net.hiddenSize !== undefined && !isValidNumber(net.hiddenSize)) {
    return false;
  }
  
  return true;
}

function inferMetadata(network) {
  const actionProfile = network.actionProfile ||
    ((network.trainingStats && (network.trainingStats.levelsCleared !== undefined || network.trainingStats.fullClears !== undefined))
      ? 'movement3'
      : 'full6');

  const producer = network.producer ||
    (actionProfile === 'movement3' ? 'fast_trainer' : 'ai');

  return {
    producer,
    actionProfile,
    trainingStats: network.trainingStats || null,
  };
}

// Save networks to file
function saveNetworks() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(networks, null, 2));
  } catch (err) {
    console.error('Error saving networks:', err.message);
  }
}

// Run tournament - compare two networks, return winner
function runTournament(net1, net2) {
  // Simple fitness comparison with randomness
  // Higher fitness always wins, but we add small noise for diversity
  const noise1 = net1.fitness + (Math.random() * 500 - 250);
  const noise2 = net2.fitness + (Math.random() * 500 - 250);
  return noise1 >= noise2 ? net1 : net2;
}

// Perform tournament selection
function runTournamentSelection() {
  if (networks.length < 2) return;

  const tournamentSize = Math.min(8, networks.length);
  const shuffled = [...networks].sort(() => Math.random() - 0.5);

  let winner = shuffled[0];
  for (let i = 1; i < tournamentSize; i++) {
    winner = runTournament(winner, shuffled[i]);
  }

  return winner;
}

// Add a new network
function addNetwork(network) {
  const meta = inferMetadata(network);
  const newNetwork = {
    id: uuidv4(),
    fitness: network.fitness,
    hiddenSize: network.hiddenSize || 48,
    w1: network.w1,
    w2: network.w2,
    b1: network.b1,
    b2: network.b2,
    producer: meta.producer,
    actionProfile: meta.actionProfile,
    trainingStats: meta.trainingStats,
    submittedAt: new Date().toISOString()
  };

  networks.push(newNetwork);

  // Sort by fitness descending
  networks.sort((a, b) => b.fitness - a.fitness);

  // Keep only top MAX_NETWORKS
  if (networks.length > MAX_NETWORKS) {
    networks = networks.slice(0, MAX_NETWORKS);
  }

  // Run tournament occasionally (1 in 3 submissions)
  if (networks.length > 10 && Math.random() < 0.33) {
    const tournamentWinner = runTournamentSelection();
    if (tournamentWinner) {
      console.log(`Tournament winner: fitness ${tournamentWinner.fitness.toFixed(0)}`);
    }
  }

  saveNetworks();
  return newNetwork;
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    networks: networks.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    uptime: process.uptime()
  });
});

// Get top networks
app.get('/api/networks', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const topNetworks = networks.slice(0, limit).map(n => ({
    id: n.id,
    fitness: n.fitness,
    hiddenSize: n.hiddenSize,
    w1: n.w1,
    w2: n.w2,
    b1: n.b1,
    b2: n.b2,
    producer: n.producer,
    actionProfile: n.actionProfile,
    trainingStats: n.trainingStats
  }));

  res.json({
    count: topNetworks.length,
    networks: topNetworks
  });
});

// Helper function to check if a value is a valid finite number
function isValidNumber(value) {
  return typeof value === 'number' && isFinite(value);
}

// Helper function to validate that all elements in an array are valid numbers
function isValidNumberArray(arr) {
  return Array.isArray(arr) && arr.every(isValidNumber);
}

// Submit networks
app.post('/api/networks', (req, res) => {
  const { networks: submittedNetworks } = req.body;

  if (!submittedNetworks || !Array.isArray(submittedNetworks)) {
    return res.status(400).json({ error: 'Invalid request: expected { networks: [...] }' });
  }

  if (submittedNetworks.length > MAX_SUBMIT) {
    return res.status(400).json({ error: `Maximum ${MAX_SUBMIT} networks per submit` });
  }

  const added = [];
  const rejected = [];

  for (const net of submittedNetworks) {
    // Validate required fields
    if (!net.w1 || !net.w2 || !net.b1 || !net.b2 || !net.fitness) {
      rejected.push({ error: 'Missing required fields', network: net });
      continue;
    }

    // Validate fitness is a valid number
    if (!isValidNumber(net.fitness)) {
      rejected.push({ error: 'Invalid fitness value', fitness: net.fitness });
      continue;
    }

    // Validate weight arrays
    if (!isValidNumberArray(net.w1) || !isValidNumberArray(net.w2) || 
        !isValidNumberArray(net.b1) || !isValidNumberArray(net.b2) ||
        net.w1.length < 10 || net.w2.length < 6) {
      rejected.push({ error: 'Invalid weight arrays' });
      continue;
    }

    // Quality gate - accept all submissions until we have enough high-quality networks
    const highQualityCount = networks.filter(n => n.fitness >= MIN_FITNESS).length;
    const needsMoreData = highQualityCount < INITIAL_POOL_SIZE;
    
    // Accept if we need more data OR if fitness is high enough
    if (!needsMoreData && net.fitness < MIN_FITNESS) {
      rejected.push({ error: 'Fitness too low', fitness: net.fitness });
      continue;
    }

    const addedNet = addNetwork(net);
    added.push(addedNet);
  }

  console.log(`Submitted: ${added.length} added, ${rejected.length} rejected`);

  res.json({
    added: added.length,
    rejected: rejected.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0
  });
});

// Get server info (no personal info)
app.get('/api/stats', (req, res) => {
  res.json({
    totalNetworks: networks.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    averageFitness: networks.length > 0 
      ? networks.reduce((sum, n) => sum + n.fitness, 0) / networks.length 
      : 0
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
loadNetworks();

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🦙 Llama AI Training Server');
  console.log('='.repeat(50));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Access from other computers: http://<YOUR-IP>:${PORT}`);
  console.log(`Loaded ${networks.length} networks`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  saveNetworks();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  saveNetworks();
  process.exit(0);
});
