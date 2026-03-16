(function (global) {
  const constants = {
    WIDTH: 800,
    HEIGHT: 450,
    LLAMA_WIDTH: 28,
    LLAMA_HEIGHT: 36,
    GRAVITY: 0.55,
    JUMP_FORCE: -12,
    MOVE_SPEED: 3.5,
    TIMER_START: 60 * 60,
    MAX_SIM_FRAMES: 2400,
  };

  global.LlamaShared = global.LlamaShared || {};
  global.LlamaShared.constants = constants;
})(window);
