const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'networks.json');
const MAX_NETWORKS = 100;
const MAX_UNTESTED = 200;
const MAX_SUBMIT = 10;
const MIN_FITNESS = 100;
const INITIAL_POOL_SIZE = 20;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));

let testedNetworks = [];
let untestedNetworks = [];

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
  if (isValidNumber(network.aiScore)) return network.aiScore;
  if (network.producer === 'fast_trainer' && isValidNumber(network.trainerFitness)) return network.trainerFitness;
  return isValidNumber(network.fitness) ? network.fitness : 0;
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

function getTestedScore(network) {
  if (isValidNumber(network?.aiScore)) return network.aiScore;
  if (isValidNumber(network?.fitness)) return network.fitness;
  return -Infinity;
}

function getUntestedScore(network) {
  if (isValidNumber(network?.trainerFitness)) return network.trainerFitness;
  if (isValidNumber(network?.fitness)) return network.fitness;
  return -Infinity;
}

function sortCollections() {
  testedNetworks.sort((a, b) => getTestedScore(b) - getTestedScore(a));
  untestedNetworks.sort((a, b) => getUntestedScore(b) - getUntestedScore(a));
}

function saveNetworks() {
  try {
    const payload = {
      testedNetworks,
      untestedNetworks,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('Error saving networks:', err.message);
  }
}

function splitAndNormalizeNetworks(items) {
  for (const rawNet of items) {
    if (!isValidNetworkObject(rawNet)) continue;

    const net = normalizeNetwork(rawNet);
    if (isValidNumber(net.aiScore) || net.producer === 'ai') {
      testedNetworks.push(net);
    } else {
      untestedNetworks.push(net);
    }
  }
}

function loadNetworks() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    testedNetworks = [];
    untestedNetworks = [];

    if (Array.isArray(parsed)) {
      splitAndNormalizeNetworks(parsed);
    } else {
      splitAndNormalizeNetworks(parsed.testedNetworks || []);
      splitAndNormalizeNetworks(parsed.untestedNetworks || []);
    }

    sortCollections();
    if (testedNetworks.length > MAX_NETWORKS) {
      testedNetworks = testedNetworks.slice(0, MAX_NETWORKS);
    }
    console.log(`Loaded ${testedNetworks.length} tested + ${untestedNetworks.length} untested networks from disk`);
  } catch (err) {
    console.error('Error loading networks:', err.message);
    testedNetworks = [];
    untestedNetworks = [];
  }
}

function addUntestedNetwork(network) {
  const added = normalizeNetwork(network);
  untestedNetworks.push(added);
  sortCollections();
  
  if (untestedNetworks.length > MAX_UNTESTED) {
    untestedNetworks = untestedNetworks.slice(0, MAX_UNTESTED);
  }
  
  saveNetworks();
  return added;
}

function addBattleTestedNetwork(network) {
  const added = normalizeNetwork(network);

  if (testedNetworks.length < MAX_NETWORKS) {
    testedNetworks.push(added);
    sortCollections();
    saveNetworks();
    return { added: true, network: added };
  }

  sortCollections();
  const weakestIndex = testedNetworks.length - 1;
  const weakest = testedNetworks[weakestIndex];
  const addedScore = getTestedScore(added);
  const weakestScore = getTestedScore(weakest);

  if (!weakest || addedScore > weakestScore) {
    testedNetworks[weakestIndex] = added;
    sortCollections();
    saveNetworks();
    return { added: true, network: added, replacedId: weakest?.id || null };
  }

  return { added: false, network: added, reason: 'Outside top battle-tested 100' };
}

function findNetworkById(id) {
  const testedIndex = testedNetworks.findIndex((n) => n.id === id);
  if (testedIndex !== -1) return { collection: 'tested', index: testedIndex, network: testedNetworks[testedIndex] };

  const untestedIndex = untestedNetworks.findIndex((n) => n.id === id);
  if (untestedIndex !== -1) return { collection: 'untested', index: untestedIndex, network: untestedNetworks[untestedIndex] };

  return null;
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
  sortCollections();
  res.json({
    status: 'ok',
    networks: testedNetworks.length + untestedNetworks.length,
    testedNetworks: testedNetworks.length,
    untestedNetworks: untestedNetworks.length,
    bestFitness: testedNetworks.length > 0 ? testedNetworks[0].fitness : 0,
    uptime: process.uptime()
  });
});

app.get('/api/networks', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const producer = req.query.producer;
  const source = req.query.source || 'tested';

  sortCollections();

  let selected = source === 'untested'
    ? untestedNetworks
    : (source === 'all' ? [...testedNetworks, ...untestedNetworks] : testedNetworks);

  if (producer) selected = selected.filter((n) => n.producer === producer);

  const topNetworks = selected.slice(0, limit).map(serializeNetwork);
  res.json({ count: topNetworks.length, networks: topNetworks });
});

app.get('/api/evaluations/pending', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  const pending = [...untestedNetworks]
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
  const count = testedNetworks.length + untestedNetworks.length;
  testedNetworks = [];
  untestedNetworks = [];
  saveNetworks();
  res.json({ success: true, message: `Cleared ${count} networks`, deletedCount: count });
});

app.delete('/api/networks/:id', (req, res) => {
  const found = findNetworkById(req.params.id);
  if (!found) return res.status(404).json({ error: 'Network not found' });

  const deleted = found.collection === 'tested'
    ? testedNetworks.splice(found.index, 1)[0]
    : untestedNetworks.splice(found.index, 1)[0];
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

    const highQualityCount = [...testedNetworks, ...untestedNetworks].filter((n) => n.fitness >= MIN_FITNESS).length;
    const needsMoreData = highQualityCount < INITIAL_POOL_SIZE;
    if (!needsMoreData && net.fitness < MIN_FITNESS) {
      rejected.push({ error: 'Fitness too low', fitness: net.fitness });
      continue;
    }

    if (net.id && findNetworkById(net.id)) {
      rejected.push({ error: 'Duplicate network ID', id: net.id });
      continue;
    }

    const producer = inferMetadata(net).producer;
    if (isValidNumber(net.aiScore) || producer === 'ai') {
      const result = addBattleTestedNetwork(net);
      if (result.added) added.push(result.network);
      else rejected.push({ error: result.reason, id: result.network.id, aiScore: result.network.aiScore });
      continue;
    }

    added.push(addUntestedNetwork(net));
  }

  console.log(`Submitted: ${added.length} added, ${rejected.length} rejected`);

  res.json({
    added: added.length,
    rejected: rejected.length,
    bestFitness: testedNetworks.length > 0 ? testedNetworks[0].fitness : 0,
    addedNetworks: added.map((n) => ({ id: n.id, fitness: n.fitness, aiEvaluations: n.aiEvaluations || 0 }))
  });
});

app.post('/api/networks/:id/score', (req, res) => {
  const found = findNetworkById(req.params.id);
  if (!found) return res.status(404).json({ error: 'Network not found' });

  const network = found.network;

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

  let promoted = false;
  if (found.collection === 'untested') {
    untestedNetworks.splice(found.index, 1);
    const result = addBattleTestedNetwork(network);
    promoted = result.added;
    if (!promoted) {
      untestedNetworks.push(network);
      sortCollections();
      saveNetworks();
      return res.json({
        success: true,
        id: network.id,
        aiScore: network.aiScore,
        aiEvaluations: network.aiEvaluations,
        fitness: network.fitness,
        promoted: false,
        reason: result.reason,
      });
    }
  } else {
    sortCollections();
    if (testedNetworks.length > MAX_NETWORKS) testedNetworks = testedNetworks.slice(0, MAX_NETWORKS);
    promoted = true;
  }

  saveNetworks();

  res.json({
    success: true,
    id: network.id,
    aiScore: network.aiScore,
    aiEvaluations: network.aiEvaluations,
    fitness: network.fitness,
    promoted,
  });
});

app.get('/api/stats', (req, res) => {
  sortCollections();
  const allNetworks = [...testedNetworks, ...untestedNetworks];
  const fastTrainerNetworks = allNetworks.filter((n) => n.producer === 'fast_trainer');
  const aiNetworks = allNetworks.filter((n) => n.producer === 'ai');
  const unknownNetworks = allNetworks.filter((n) => !n.producer || n.producer === 'unknown');

  const fastTrainerEvaluated = fastTrainerNetworks.filter((n) => (n.aiEvaluations || 0) > 0);
  const pendingFastTrainer = fastTrainerNetworks.length - fastTrainerEvaluated.length;
  const battleTestingProgress = fastTrainerNetworks.length > 0
    ? (fastTrainerEvaluated.length / fastTrainerNetworks.length) * 100
    : 0;

  function avgFitness(items) {
    return items.length > 0 ? items.reduce((sum, n) => sum + n.fitness, 0) / items.length : 0;
  }

  function bestFitness(items) {
    return items.length > 0 ? Math.max(...items.map((n) => n.fitness)) : 0;
  }

  res.json({
    testedNetworks: testedNetworks.length,
    untestedNetworks: untestedNetworks.length,
    totalNetworks: allNetworks.length,
    bestFitness: testedNetworks.length > 0 ? testedNetworks[0].fitness : 0,
    averageFitness: testedNetworks.length > 0 ? testedNetworks.reduce((sum, n) => sum + n.fitness, 0) / testedNetworks.length : 0,
    evaluatedFastTrainer: fastTrainerEvaluated.length,
    pendingFastTrainer,
    battleTestingProgress,
    producers: {
      fastTrainer: {
        count: fastTrainerNetworks.length,
        bestFitness: bestFitness(fastTrainerNetworks),
        averageFitness: avgFitness(fastTrainerNetworks),
        evaluated: fastTrainerEvaluated.length,
        pending: pendingFastTrainer,
      },
      ai: {
        count: aiNetworks.length,
        bestFitness: bestFitness(aiNetworks),
        averageFitness: avgFitness(aiNetworks),
      },
      unknown: {
        count: unknownNetworks.length,
        bestFitness: bestFitness(unknownNetworks),
        averageFitness: avgFitness(unknownNetworks),
      },
    },
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'monitor.html'));
});

app.get('/replay', (req, res) => {
  res.sendFile(path.join(__dirname, 'replay.html'));
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
  console.log(`Loaded ${testedNetworks.length} tested + ${untestedNetworks.length} untested networks`);
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
