const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'networks.json');
const MAX_NETWORKS = 100;
const MAX_SUBMIT = 10;
const MIN_FITNESS = 100;
const INITIAL_POOL_SIZE = 20;

const FAST_TRAINER_WEIGHT = 0.35;
const REAL_GAME_WEIGHT = 0.65;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));

let networks = [];

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidNumberArray(arr) {
  return Array.isArray(arr) && arr.every(isValidNumber);
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

function computeCompositeFitness(network) {
  if (network.producer === 'fast_trainer') {
    const trainerFitness = isValidNumber(network.trainerFitness) ? network.trainerFitness : network.fitness;
    const aiScore = isValidNumber(network.aiScore) ? network.aiScore : null;
    if (aiScore === null) return trainerFitness;
    return trainerFitness * FAST_TRAINER_WEIGHT + aiScore * REAL_GAME_WEIGHT;
  }

  if (isValidNumber(network.aiScore)) return network.aiScore;
  return network.fitness;
}

function normalizeNetwork(net) {
  const meta = inferMetadata(net);
  const trainerFitness = isValidNumber(net.trainerFitness)
    ? net.trainerFitness
    : (meta.producer === 'fast_trainer' ? net.fitness : null);

  const aiScore = isValidNumber(net.aiScore)
    ? net.aiScore
    : (meta.producer === 'ai' ? net.fitness : null);

  const normalized = {
    id: net.id || uuidv4(),
    hiddenSize: net.hiddenSize || 48,
    w1: net.w1,
    w2: net.w2,
    b1: net.b1,
    b2: net.b2,
    producer: meta.producer,
    actionProfile: meta.actionProfile,
    trainingStats: meta.trainingStats,
    trainerFitness,
    aiScore,
    aiEvaluations: Math.max(0, parseInt(net.aiEvaluations, 10) || 0),
    submittedAt: net.submittedAt || new Date().toISOString(),
    lastEvaluatedAt: net.lastEvaluatedAt || null,
  };

  normalized.fitness = isValidNumber(net.fitness) ? net.fitness : 0;
  normalized.fitness = computeCompositeFitness(normalized);
  return normalized;
}

function isValidNetworkObject(net) {
  if (!net || typeof net !== 'object') return false;
  if (!isValidNumber(net.fitness)) return false;
  if (!isValidNumberArray(net.w1)) return false;
  if (!isValidNumberArray(net.w2)) return false;
  if (!isValidNumberArray(net.b1)) return false;
  if (!isValidNumberArray(net.b2)) return false;
  if (net.w1.length < 10 || net.w2.length < 6) return false;
  if (net.hiddenSize !== undefined && !isValidNumber(net.hiddenSize)) return false;
  return true;
}

function sortAndTrim() {
  networks.sort((a, b) => b.fitness - a.fitness);
  if (networks.length > MAX_NETWORKS) networks = networks.slice(0, MAX_NETWORKS);
}

function saveNetworks() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(networks, null, 2));
  } catch (err) {
    console.error('Error saving networks:', err.message);
  }
}

function loadNetworks() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    networks = parsed
      .filter((net) => isValidNetworkObject(net))
      .map((net) => normalizeNetwork(net));

    sortAndTrim();
    console.log(`Loaded ${networks.length} networks from disk`);
  } catch (err) {
    console.error('Error loading networks:', err.message);
    networks = [];
  }
}

function addNetwork(network) {
  const added = normalizeNetwork(network);
  networks.push(added);
  sortAndTrim();
  saveNetworks();
  return added;
}

function serializeNetwork(n) {
  return {
    id: n.id,
    fitness: n.fitness,
    trainerFitness: n.trainerFitness,
    aiScore: n.aiScore,
    aiEvaluations: n.aiEvaluations || 0,
    hiddenSize: n.hiddenSize,
    w1: n.w1,
    w2: n.w2,
    b1: n.b1,
    b2: n.b2,
    producer: n.producer,
    actionProfile: n.actionProfile,
    trainingStats: n.trainingStats,
    submittedAt: n.submittedAt,
    lastEvaluatedAt: n.lastEvaluatedAt,
  };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    networks: networks.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    uptime: process.uptime()
  });
});

app.get('/api/networks', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const producer = req.query.producer;

  let selected = networks;
  if (producer) selected = selected.filter((n) => n.producer === producer);

  const topNetworks = selected.slice(0, limit).map(serializeNetwork);
  res.json({ count: topNetworks.length, networks: topNetworks });
});

app.get('/api/evaluations/pending', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  const pending = [...networks]
    .filter((n) => n.producer === 'fast_trainer')
    .sort((a, b) => {
      if ((a.aiEvaluations || 0) !== (b.aiEvaluations || 0)) return (a.aiEvaluations || 0) - (b.aiEvaluations || 0);
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    })
    .slice(0, limit)
    .map(serializeNetwork);

  res.json({ count: pending.length, networks: pending });
});

app.delete('/api/networks/clear', (req, res) => {
  const count = networks.length;
  networks = [];
  saveNetworks();
  res.json({ success: true, message: `Cleared ${count} networks`, deletedCount: count });
});

app.delete('/api/networks/:id', (req, res) => {
  const index = networks.findIndex((n) => n.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Network not found' });

  const deleted = networks.splice(index, 1)[0];
  saveNetworks();
  res.json({ success: true, message: 'Network deleted', deletedId: deleted.id });
});

app.post('/api/networks', (req, res) => {
  const submittedNetworks = req.body.networks;

  if (!Array.isArray(submittedNetworks)) {
    return res.status(400).json({ error: 'Invalid request: expected { networks: [...] }' });
  }

  if (submittedNetworks.length > MAX_SUBMIT) {
    return res.status(400).json({ error: `Maximum ${MAX_SUBMIT} networks per submit` });
  }

  const added = [];
  const rejected = [];

  for (const net of submittedNetworks) {
    if (!net.w1 || !net.w2 || !net.b1 || !net.b2 || !isValidNumber(net.fitness)) {
      rejected.push({ error: 'Missing required fields or invalid fitness' });
      continue;
    }

    if (!isValidNumberArray(net.w1) || !isValidNumberArray(net.w2) || !isValidNumberArray(net.b1) || !isValidNumberArray(net.b2) ||
        net.w1.length < 10 || net.w2.length < 6) {
      rejected.push({ error: 'Invalid weight arrays' });
      continue;
    }

    const highQualityCount = networks.filter((n) => n.fitness >= MIN_FITNESS).length;
    const needsMoreData = highQualityCount < INITIAL_POOL_SIZE;
    if (!needsMoreData && net.fitness < MIN_FITNESS) {
      rejected.push({ error: 'Fitness too low', fitness: net.fitness });
      continue;
    }

    if (net.id && networks.some((n) => n.id === net.id)) {
      rejected.push({ error: 'Duplicate network ID', id: net.id });
      continue;
    }

    added.push(addNetwork(net));
  }

  console.log(`Submitted: ${added.length} added, ${rejected.length} rejected`);

  res.json({
    added: added.length,
    rejected: rejected.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    addedNetworks: added.map((n) => ({ id: n.id, fitness: n.fitness, aiEvaluations: n.aiEvaluations || 0 }))
  });
});

app.post('/api/networks/:id/score', (req, res) => {
  const network = networks.find((n) => n.id === req.params.id);
  if (!network) return res.status(404).json({ error: 'Network not found' });

  const score = req.body?.score;
  if (!isValidNumber(score)) return res.status(400).json({ error: 'Invalid score' });

  const prevCount = network.aiEvaluations || 0;
  const prevScore = isValidNumber(network.aiScore) ? network.aiScore : null;

  if (prevScore === null) {
    network.aiScore = score;
  } else {
    network.aiScore = ((prevScore * prevCount) + score) / (prevCount + 1);
  }

  network.aiEvaluations = prevCount + 1;
  network.lastEvaluatedAt = new Date().toISOString();
  network.fitness = computeCompositeFitness(network);

  if (network.trainingStats && typeof network.trainingStats === 'object') {
    network.trainingStats.realGameScore = network.aiScore;
  }

  sortAndTrim();
  saveNetworks();

  res.json({
    success: true,
    id: network.id,
    aiScore: network.aiScore,
    aiEvaluations: network.aiEvaluations,
    fitness: network.fitness,
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalNetworks: networks.length,
    bestFitness: networks.length > 0 ? networks[0].fitness : 0,
    averageFitness: networks.length > 0 ? networks.reduce((sum, n) => sum + n.fitness, 0) / networks.length : 0,
    evaluatedFastTrainer: networks.filter((n) => n.producer === 'fast_trainer' && (n.aiEvaluations || 0) > 0).length,
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor.html'));
});

app.get('/replay', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor_replay.html'));
});

app.use(express.static(__dirname));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

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
