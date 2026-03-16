(function (global) {
  function makeEnemy(x, y, type, patrolA, patrolB) { return { x, y: y - 28, w: 32, h: 28, vx: type === 'patroller' ? 1.2 : 1.5, type, patrolA: patrolA ?? x - 60, patrolB: patrolB ?? x + 60, dead: false, deadTimer: 0, frame: 0, frameTimer: 0 }; }
  function makeGinger(x, y, random = Math.random) { return { x, y, w: 36, h: 36, type: 'ginger', baseY: y, vx: 1.2 + random() * 0.8, vy: 0, patrolA: x - 140, patrolB: x + 140, floatTimer: random() * Math.PI * 2, dead: false, deadTimer: 0, frame: 0, frameTimer: 0 }; }
  function makeVolanRadooga(x, y, random = Math.random) { return { x, y, w: 40, h: 34, type: 'volanradooga', baseX: x, baseY: y, vx: 0, vy: 0, floatTimer: random() * Math.PI * 2, alertTimer: 0, state: 'patrol', chaseTimer: 0, attackCooldown: 0, tailPhase: random() * Math.PI * 2, dead: false, deadTimer: 0, frame: 0, frameTimer: 0 }; }
  function makeJimmy(x, y, scale = 1) { const w = Math.round(64 * scale), h = Math.round(70 * scale); return { x, y: y - h, w, h, scale, vx: 0, vy: 0, type: 'jimmy', patrolA: x - Math.round(180 * scale), patrolB: x + Math.round(180 * scale), moveDir: 1, dead: false, deadTimer: 0, hp: Math.max(1, Math.round(5 * scale)), maxHp: Math.max(1, Math.round(5 * scale)), frame: 0, frameTimer: 0, twerk: 0, twerkDir: 1, jumpTimer: 0, onGround: false, nameTag: true }; }
  function coinRow(startX, y, count) { const c = []; for (let i = 0; i < count; i++) c.push({ x: startX + i * 24, y, w: 14, h: 14, collected: false }); return c; }

  function createLevel(n, options = {}) {
    const random = options.random || Math.random;
    const platforms = [{ x: 0, y: 390, w: 800, h: 60, type: 'ground' }];
    const hazards = [], enemies = [], coins = [];
    let flagX = 720;
    if (n === 1) {
      platforms.push({ x: 150, y: 310, w: 100, h: 16, type: 'plat' }, { x: 300, y: 250, w: 100, h: 16, type: 'plat' }, { x: 460, y: 300, w: 100, h: 16, type: 'plat' }, { x: 600, y: 240, w: 120, h: 16, type: 'plat' }, { x: 50, y: 220, w: 80, h: 16, type: 'plat' });
      hazards.push({ x: 220, y: 376, w: 24, h: 14, type: 'spike' }, { x: 430, y: 376, w: 24, h: 14, type: 'spike' }, { x: 590, y: 376, w: 24, h: 14, type: 'spike' });
      enemies.push(makeEnemy(350, 340, 'walker'), makeEnemy(550, 280, 'walker'), makeEnemy(200, 290, 'patroller', 150, 250), makeGinger(300, 180, random), makeGinger(500, 150, random));
      coins.push(...coinRow(155, 295, 5), ...coinRow(305, 235, 4), ...coinRow(610, 225, 4));
    } else if (n === 2) {
      platforms.push({ x: 60, y: 320, w: 130, h: 16, type: 'plat' }, { x: 240, y: 280, w: 130, h: 16, type: 'plat' }, { x: 420, y: 240, w: 130, h: 16, type: 'plat' }, { x: 590, y: 280, w: 160, h: 16, type: 'plat' }, { x: 150, y: 190, w: 110, h: 16, type: 'plat' }, { x: 470, y: 160, w: 110, h: 16, type: 'plat' });
      hazards.push({ x: 340, y: 376, w: 24, h: 14, type: 'spike' }, { x: 570, y: 376, w: 24, h: 14, type: 'spike' });
      enemies.push(makeEnemy(280, 264, 'walker'), makeEnemy(460, 224, 'walker'), makeEnemy(620, 264, 'patroller', 590, 740), makeGinger(200, 140, random), makeGinger(450, 110, random), makeGinger(620, 160, random), makeJimmy(400, 390, 0.5), makeVolanRadooga(350, 40, random));
      coins.push(...coinRow(70, 305, 5), ...coinRow(245, 265, 5), ...coinRow(475, 145, 5));
      flagX = 730;
    } else if (n === 3) {
      platforms.push({ x: 80, y: 340, w: 70, h: 16, type: 'plat' }, { x: 210, y: 290, w: 70, h: 16, type: 'plat' }, { x: 340, y: 230, w: 70, h: 16, type: 'plat' }, { x: 470, y: 170, w: 70, h: 16, type: 'plat' }, { x: 570, y: 230, w: 70, h: 16, type: 'plat' }, { x: 650, y: 300, w: 130, h: 16, type: 'plat' }, { x: 200, y: 160, w: 60, h: 16, type: 'plat' }, { x: 350, y: 110, w: 60, h: 16, type: 'plat' });
      for (let sx = 140; sx < 680; sx += 80) hazards.push({ x: sx, y: 376, w: 24, h: 14, type: 'spike' });
      enemies.push(makeEnemy(220, 274, 'walker'), makeEnemy(350, 214, 'walker'), makeEnemy(480, 154, 'walker'), makeEnemy(580, 214, 'walker'), makeEnemy(660, 284, 'patroller', 650, 770), makeEnemy(100, 375, 'patroller', 50, 200), makeGinger(150, 120, random), makeGinger(350, 80, random), makeGinger(520, 100, random), makeGinger(680, 130, random), makeJimmy(250, 390, 0.55), makeJimmy(560, 390, 0.55), makeVolanRadooga(200, 35, random), makeVolanRadooga(560, 35, random));
      coins.push(...coinRow(215, 145, 3), ...coinRow(355, 95, 3), ...coinRow(475, 155, 3));
      flagX = 740;
    } else if (n === 4) {
      platforms.push({ x: 100, y: 330, w: 90, h: 16, type: 'plat' }, { x: 240, y: 270, w: 90, h: 16, type: 'plat' }, { x: 380, y: 210, w: 90, h: 16, type: 'plat' }, { x: 520, y: 260, w: 90, h: 16, type: 'plat' }, { x: 630, y: 310, w: 130, h: 16, type: 'plat' }, { x: 50, y: 210, w: 70, h: 16, type: 'plat' }, { x: 300, y: 150, w: 80, h: 16, type: 'plat' }, { x: 500, y: 130, w: 80, h: 16, type: 'plat' });
      for (let sx = 160; sx < 640; sx += 70) hazards.push({ x: sx, y: 376, w: 24, h: 14, type: 'spike' });
      enemies.push(makeEnemy(260, 254, 'walker'), makeEnemy(400, 194, 'walker'), makeEnemy(540, 244, 'walker'), makeEnemy(660, 294, 'patroller', 630, 755), makeGinger(120, 100, random), makeGinger(320, 80, random), makeGinger(510, 75, random), makeGinger(680, 100, random), makeJimmy(200, 390, 0.65), makeJimmy(420, 390, 0.65), makeJimmy(620, 390, 0.65), makeVolanRadooga(150, 30, random), makeVolanRadooga(400, 30, random), makeVolanRadooga(640, 30, random));
      coins.push(...coinRow(105, 315, 4), ...coinRow(305, 135, 4), ...coinRow(505, 115, 4));
      flagX = 740;
    } else {
      platforms.push({ x: 60, y: 340, w: 80, h: 16, type: 'plat' }, { x: 190, y: 280, w: 80, h: 16, type: 'plat' }, { x: 320, y: 220, w: 80, h: 16, type: 'plat' }, { x: 450, y: 160, w: 80, h: 16, type: 'plat' }, { x: 560, y: 220, w: 80, h: 16, type: 'plat' }, { x: 640, y: 290, w: 120, h: 16, type: 'plat' }, { x: 180, y: 160, w: 60, h: 16, type: 'plat' }, { x: 330, y: 100, w: 60, h: 16, type: 'plat' });
      for (let sx = 120; sx < 700; sx += 65) hazards.push({ x: sx, y: 376, w: 24, h: 14, type: 'spike' });
      enemies.push(makeEnemy(210, 264, 'walker'), makeEnemy(340, 204, 'walker'), makeEnemy(470, 144, 'walker'), makeEnemy(580, 204, 'walker'), makeEnemy(660, 274, 'patroller', 640, 755), makeEnemy(100, 375, 'patroller', 50, 200), makeGinger(150, 100, random), makeGinger(300, 70, random), makeGinger(460, 90, random), makeGinger(580, 80, random), makeGinger(700, 110, random), makeJimmy(380, 390, 1.0), makeVolanRadooga(120, 25, random), makeVolanRadooga(380, 25, random), makeVolanRadooga(620, 25, random));
      coins.push(...coinRow(185, 145, 3), ...coinRow(335, 85, 3), ...coinRow(455, 145, 3));
      flagX = 745;
    }

    const flag = { x: flagX, y: 300, w: 20, h: 90 };
    const guns = [];
    if (n === 1) guns.push({ x: 320, y: 355, w: 28, h: 18, collected: false });
    else if (n === 2) guns.push({ x: 280, y: 245, w: 28, h: 18, collected: false }, { x: 520, y: 355, w: 28, h: 18, collected: false });
    else guns.push({ x: 220, y: 355, w: 28, h: 18, collected: false }, { x: 490, y: 135, w: 28, h: 18, collected: false });

    return {
      platforms, hazards, enemies, coins, flag, spits: [], guns, bullets: [],
      squashies: n === 1 ? [{ x: 480, y: 272, w: 22, h: 22, collected: false }] : n === 2 ? [{ x: 160, y: 162, w: 22, h: 22, collected: false }, { x: 630, y: 252, w: 22, h: 22, collected: false }] : [{ x: 355, y: 82, w: 22, h: 22, collected: false }, { x: 575, y: 202, w: 22, h: 22, collected: false }],
      gingerBabies: n === 1 ? [{ x: 620, y: 358, w: 24, h: 28, collected: false }] : n === 2 ? [{ x: 100, y: 292, w: 24, h: 28, collected: false }, { x: 480, y: 212, w: 24, h: 28, collected: false }] : [{ x: 215, y: 262, w: 24, h: 28, collected: false }, { x: 470, y: 142, w: 24, h: 28, collected: false }],
      bigPots: n === 1 ? [{ x: 55, y: 188, w: 36, h: 40, collected: false }] : n === 2 ? [{ x: 510, y: 128, w: 36, h: 40, collected: false }] : n === 3 ? [{ x: 358, y: 78, w: 36, h: 40, collected: false }] : n === 4 ? [{ x: 308, y: 118, w: 36, h: 40, collected: false }] : [{ x: 338, y: 68, w: 36, h: 40, collected: false }],
      startX: 60,
      startY: 372,
    };
  }

  global.LlamaShared = global.LlamaShared || {};
  global.LlamaShared.createLevel = createLevel;
})(window);
