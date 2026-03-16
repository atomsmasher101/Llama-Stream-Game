(function (global) {
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function resolvePlatformLanding(entity, platforms, previousVy) {
    for (const p of platforms) {
      if (!rectsOverlap(entity, p)) continue;
      const fromAbove = previousVy >= 0;
      if (fromAbove && entity.y + entity.h - previousVy <= p.y + 2) {
        entity.y = p.y - entity.h;
        entity.vy = 0;
        return true;
      }
    }
    return false;
  }

  global.LlamaShared = global.LlamaShared || {};
  global.LlamaShared.physics = { rectsOverlap, resolvePlatformLanding };
})(window);
