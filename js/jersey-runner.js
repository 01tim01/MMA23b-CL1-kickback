/* ============================================================================
   KICKBACK – Jersey Runner (Promo-Game)
   ----------------------------------------------------------------------------
   DOM-basiertes 2D-Runner-Game (kein Canvas): HTML-Elemente werden per
   JavaScript positioniert, CSS macht das Aussehen/Animationen.
   Spielidee: über Verteidiger springen, die Münze einsammeln → schaltet den
   5%-Rabattcode "KICKBACK5" frei.
   Autor: Livio Krummenacher. Hier nur die Bildpfade an unsere Projektstruktur
   (img/game/) angepasst.
   ============================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Game constants and assets ---------------------------------- */

  const DISCOUNT_CODE = "KICKBACK5";
  const STORAGE_KEY = "kickbackJerseyRunnerHighScore";

  const ASSETS = {
    player: "img/game/player.png",
    referee: "img/game/referee.png",
    defenderRed: "img/game/defender_red.png",
    defenderBlue: "img/game/defender_blue.png",
    trainingDummy: "img/game/training_dummy.png",
    coin: "img/game/coin.png",
  };

  const CONFIG = {
    gravity: 2150,
    jumpVelocity: 820,
    initialSpeed: 320,
    maxSpeed: 690,
    speedGainPerSecond: 5.2,
    scorePerSecond: 12,
    maxDelta: 0.034,
    coin: {
      firstSpawnAfter: 12,
      retryDelayMin: 14,
      retryDelayMax: 22,
      width: 82,
      height: 82,
      bottomOffset: 108,
      hitbox: { x: 12, y: 12, width: 58, height: 58 },
    },
  };

  /*
    Obstacle sizes are screen pixels. Hitboxes are intentionally smaller
    than the visible images so collisions feel fair and predictable.
  */
  const OBSTACLE_TYPES = [
    {
      name: "defender-red",
      className: "obstacle--defender-red",
      src: ASSETS.defenderRed,
      width: 106,
      height: 70,
      bottomOffset: 0,
      hitbox: { x: 14, y: 24, width: 78, height: 40 },
    },
    {
      name: "defender-blue",
      className: "obstacle--defender-blue",
      src: ASSETS.defenderBlue,
      width: 106,
      height: 75,
      bottomOffset: 0,
      hitbox: { x: 14, y: 24, width: 78, height: 43 },
    },
    {
      name: "referee",
      className: "obstacle--referee",
      src: ASSETS.referee,
      width: 92,
      height: 112,
      bottomOffset: 0,
      hitbox: { x: 28, y: 14, width: 42, height: 96 },
    },
    {
      name: "training-dummy",
      className: "obstacle--training-dummy",
      src: ASSETS.trainingDummy,
      width: 63,
      height: 100,
      bottomOffset: 0,
      hitbox: { x: 13, y: 5, width: 37, height: 94 },
    },
  ];

  /* ---------- DOM references --------------------------------------------- */

  const gameStage = document.getElementById("gameStage");
  const pitchLines = document.querySelector(".pitch-lines");
  const runner = document.getElementById("runner");
  const objectLayer = document.getElementById("objectLayer");
  const particleLayer = document.getElementById("particleLayer");

  const scoreValue = document.getElementById("scoreValue");
  const highScoreValue = document.getElementById("highScoreValue");
  const finalScoreValue = document.getElementById("finalScoreValue");
  const finalHighScoreValue = document.getElementById("finalHighScoreValue");

  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const gameOverReward = document.getElementById("gameOverReward");
  const coinToast = document.getElementById("coinToast");

  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const copyButton = document.getElementById("copyButton");
  const copyFeedback = document.getElementById("copyFeedback");

  /* ---------- Runtime state ---------------------------------------------- */

  const state = {
    mode: "ready",
    animationFrame: null,
    lastTime: 0,
    stageWidth: 0,
    stageHeight: 0,
    groundY: 0,
    runnerLeft: 0,
    runnerWidth: 0,
    runnerHeight: 0,
    runnerY: 0,
    runnerVelocity: 0,
    grassOffset: 0,
    elapsed: 0,
    score: 0,
    highScore: loadHighScore(),
    speed: CONFIG.initialSpeed,
    obstacleTimer: 0,
    obstacles: [],
    coin: null,
    coinCollected: false,
    discountUnlocked: false,
    nextCoinTime: CONFIG.coin.firstSpawnAfter,
    copyFeedbackTimer: null,
  };

  /* ---------- Initial setup ---------------------------------------------- */

  highScoreValue.textContent = state.highScore;
  bindEvents();
  measureStage();
  renderRunner();
  renderGrass();

  if (!runner.complete) {
    runner.addEventListener("load", measureStage, { once: true });
  }

  window.addEventListener("resize", () => {
    measureStage();
    renderGame();
  });

  function bindEvents() {
    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", startGame);
    copyButton.addEventListener("click", copyDiscountCode);

    document.addEventListener("keydown", (event) => {
      if (event.code !== "Space") {
        return;
      }

      if (state.mode === "playing") {
        event.preventDefault();
        jump();
      }
    });

    /*
      Pointer input supports mouse clicks and mobile taps.
      Overlay buttons are ignored so a button click never triggers a jump.
    */
    gameStage.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) {
        return;
      }

      if (state.mode === "playing") {
        // Auf dem Handy würde der Tap sonst die Seite scrollen statt zu springen.
        event.preventDefault();
        jump();
      }
    }, { passive: false });
  }

  /* ---------- Game state transitions ------------------------------------- */

  function startGame() {
    resetGameState();
    clearDynamicElements();
    measureStage();
    renderGame();

    setOverlayVisible(startOverlay, false);
    setOverlayVisible(gameOverOverlay, false);
    setOverlayVisible(gameOverReward, false);
    copyFeedback.textContent = "";
    hideCoinToast();

    state.mode = "playing";
    state.lastTime = 0;
    gameStage.classList.add("game-stage--playing");
    focusStage();

    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = requestAnimationFrame(gameLoop);
  }

  function resetGameState() {
    state.mode = "ready";
    state.lastTime = 0;
    state.runnerY = 0;
    state.runnerVelocity = 0;
    state.grassOffset = 0;
    state.elapsed = 0;
    state.score = 0;
    state.speed = CONFIG.initialSpeed;
    state.obstacleTimer = 0.9;
    state.obstacles = [];
    state.coin = null;
    state.coinCollected = false;
    state.discountUnlocked = false;
    state.nextCoinTime = CONFIG.coin.firstSpawnAfter;
    runner.classList.remove("runner--jumping");
    gameStage.classList.remove("stage--shake", "game-stage--playing");
    updateScoreboard();
  }

  function endGame() {
    state.mode = "game-over";
    gameStage.classList.remove("game-stage--playing");
    gameStage.classList.add("stage--shake");

    window.setTimeout(() => {
      gameStage.classList.remove("stage--shake");
    }, 420);

    if (state.score > state.highScore) {
      state.highScore = state.score;
      saveHighScore(state.highScore);
    }

    updateScoreboard();
    finalScoreValue.textContent = state.score;
    finalHighScoreValue.textContent = state.highScore;
    setOverlayVisible(gameOverReward, state.discountUnlocked);
    setOverlayVisible(gameOverOverlay, true);
  }

  /* ---------- Main loop --------------------------------------------------- */

  function gameLoop(timestamp) {
    if (state.mode !== "playing") {
      state.animationFrame = null;
      return;
    }

    if (!state.lastTime) {
      state.lastTime = timestamp;
    }

    const delta = Math.min(
      (timestamp - state.lastTime) / 1000,
      CONFIG.maxDelta
    );

    state.lastTime = timestamp;

    updateGame(delta);
    renderGame();

    if (state.mode === "playing") {
      state.animationFrame = requestAnimationFrame(gameLoop);
    } else {
      state.animationFrame = null;
    }
  }

  function updateGame(delta) {
    state.elapsed += delta;
    state.score = Math.floor(state.elapsed * CONFIG.scorePerSecond);
    state.speed = Math.min(
      CONFIG.maxSpeed,
      CONFIG.initialSpeed + state.elapsed * CONFIG.speedGainPerSecond
    );

    updateGrass(delta);
    updateRunnerPhysics(delta);
    updateObstacles(delta);
    updateCoin(delta);
    updateObstacleSpawning(delta);
    checkCollisions();
    updateScoreboard();
  }

  /* ---------- Runner physics --------------------------------------------- */

  function jump() {
    const isInAir = state.runnerY > 0 || state.runnerVelocity !== 0;

    if (isInAir) {
      return;
    }

    state.runnerVelocity = CONFIG.jumpVelocity;
    state.runnerY = 0.1;

    /*
      Restart the short jump highlight by removing and re-adding the class.
      The actual jump position is still controlled by JavaScript.
    */
    runner.classList.remove("runner--jumping");
    void runner.offsetWidth;
    runner.classList.add("runner--jumping");
  }

  function updateRunnerPhysics(delta) {
    if (state.runnerY <= 0 && state.runnerVelocity === 0) {
      return;
    }

    state.runnerVelocity -= CONFIG.gravity * delta;
    state.runnerY += state.runnerVelocity * delta;

    if (state.runnerY <= 0) {
      state.runnerY = 0;
      state.runnerVelocity = 0;
      runner.classList.remove("runner--jumping");
    }
  }

  /* ---------- Ground particle movement ----------------------------------- */

  function updateGrass(delta) {
    state.grassOffset -= state.speed * delta;

    if (state.grassOffset <= -128) {
      state.grassOffset %= 128;
    }
  }

  /* ---------- Obstacles --------------------------------------------------- */

  function updateObstacleSpawning(delta) {
    state.obstacleTimer -= delta;

    if (state.obstacleTimer > 0) {
      return;
    }

    if (shouldSpawnCoin()) {
      spawnCoin();
    } else {
      spawnObstacle();
    }

    state.obstacleTimer = getNextObstacleDelay();
  }

  function shouldSpawnCoin() {
    return (
      !state.coinCollected &&
      !state.coin &&
      state.elapsed >= state.nextCoinTime
    );
  }

  function spawnObstacle() {
    const type = OBSTACLE_TYPES[randomInt(0, OBSTACLE_TYPES.length - 1)];
    const element = document.createElement("div");
    const image = document.createElement("img");

    element.className = `obstacle ${type.className}`;
    element.dataset.obstacle = type.name;
    element.style.setProperty("--sprite-width", `${type.width}px`);
    element.style.setProperty("--sprite-height", `${type.height}px`);
    element.style.bottom = `calc(var(--ground-height) + ${type.bottomOffset}px)`;

    image.className = "obstacle__sprite";
    image.src = type.src;
    image.alt = "";
    image.draggable = false;

    element.appendChild(image);
    objectLayer.appendChild(element);

    state.obstacles.push({
      element,
      name: type.name,
      x: state.stageWidth + randomRange(80, 170),
      width: type.width,
      height: type.height,
      bottomOffset: type.bottomOffset,
      hitbox: type.hitbox,
    });
  }

  function updateObstacles(delta) {
    for (let index = state.obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = state.obstacles[index];
      obstacle.x -= state.speed * delta;

      if (obstacle.x < -obstacle.width - 60) {
        obstacle.element.remove();
        state.obstacles.splice(index, 1);
      }
    }
  }

  function getNextObstacleDelay() {
    const speedProgress =
      (state.speed - CONFIG.initialSpeed) /
      (CONFIG.maxSpeed - CONFIG.initialSpeed);
    const baseDelay = randomRange(0.98, 1.62);
    return Math.max(0.72, baseDelay - speedProgress * 0.24);
  }

  /* ---------- Discount coin ---------------------------------------------- */

  function updateCoin(delta) {
    if (!state.coin) {
      return;
    }

    state.coin.x -= state.speed * 0.96 * delta;

    if (state.coin.x < -state.coin.width - 60) {
      state.coin.element.remove();
      state.coin = null;
      state.nextCoinTime =
        state.elapsed +
        randomRange(CONFIG.coin.retryDelayMin, CONFIG.coin.retryDelayMax);
    }
  }

  function spawnCoin() {
    const element = document.createElement("div");
    const image = document.createElement("img");

    element.className = "discount-coin";
    element.style.setProperty("--sprite-width", `${CONFIG.coin.width}px`);
    element.style.setProperty("--sprite-height", `${CONFIG.coin.height}px`);
    element.style.bottom = `calc(var(--ground-height) + ${CONFIG.coin.bottomOffset}px)`;

    image.className = "coin__sprite";
    image.src = ASSETS.coin;
    image.alt = "";
    image.draggable = false;

    element.appendChild(image);
    objectLayer.appendChild(element);

    state.coin = {
      element,
      x: state.stageWidth + randomRange(150, 240),
      width: CONFIG.coin.width,
      height: CONFIG.coin.height,
      bottomOffset: CONFIG.coin.bottomOffset,
      hitbox: CONFIG.coin.hitbox,
    };

    /* Give the player a fair lane around the reward coin. */
    state.obstacleTimer = Math.max(state.obstacleTimer, 1.15);
  }

  function collectDiscountCoin() {
    if (!state.coin) {
      return;
    }

    const coinCenter = {
      x: state.coin.x + state.coin.width / 2,
      y:
        state.groundY -
        state.coin.bottomOffset -
        state.coin.height / 2,
    };

    createCoinParticles(coinCenter.x, coinCenter.y);
    state.coin.element.remove();
    state.coin = null;
    state.coinCollected = true;
    state.discountUnlocked = true;
    state.nextCoinTime = Number.POSITIVE_INFINITY;
    showCoinToast();
  }

  /* ---------- Collision detection ---------------------------------------- */

  function checkCollisions() {
    const runnerBox = getRunnerHitbox();

    for (const obstacle of state.obstacles) {
      if (rectanglesOverlap(runnerBox, getObjectHitbox(obstacle))) {
        endGame();
        return;
      }
    }

    if (state.coin && rectanglesOverlap(runnerBox, getObjectHitbox(state.coin))) {
      collectDiscountCoin();
    }
  }

  function getRunnerHitbox() {
    const width = state.runnerWidth || state.runnerHeight * 0.42;
    const height = state.runnerHeight;
    const horizontalInset = width * 0.18;

    return {
      x: state.runnerLeft + horizontalInset,
      y: state.groundY - height - state.runnerY + height * 0.07,
      width: width - horizontalInset * 2,
      height: height * 0.86,
    };
  }

  function getObjectHitbox(object) {
    const top = state.groundY - object.bottomOffset - object.height;

    return {
      x: object.x + object.hitbox.x,
      y: top + object.hitbox.y,
      width: object.hitbox.width,
      height: object.hitbox.height,
    };
  }

  function rectanglesOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /* ---------- Rendering --------------------------------------------------- */

  function renderGame() {
    renderRunner();
    renderGrass();

    for (const obstacle of state.obstacles) {
      obstacle.element.style.transform = `translate3d(${obstacle.x}px, 0, 0)`;
    }

    if (state.coin) {
      state.coin.element.style.transform = `translate3d(${state.coin.x}px, 0, 0)`;
    }
  }

  function renderRunner() {
    runner.style.transform = `translate3d(0, ${-state.runnerY}px, 0)`;
  }

  function renderGrass() {
    pitchLines.style.setProperty("--grass-x", `${state.grassOffset}px`);
  }

  function updateScoreboard() {
    scoreValue.textContent = state.score;
    highScoreValue.textContent = state.highScore;
  }

  /* ---------- Reward popup and copy button ------------------------------- */

  async function copyDiscountCode() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(DISCOUNT_CODE);
      } else {
        fallbackCopy(DISCOUNT_CODE);
      }

      showCopyFeedback();
    } catch (error) {
      fallbackCopy(DISCOUNT_CODE);
      showCopyFeedback();
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement("textarea");

    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";

    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  function showCopyFeedback() {
    copyFeedback.textContent = "Code kopiert";

    window.clearTimeout(state.copyFeedbackTimer);
    state.copyFeedbackTimer = window.setTimeout(() => {
      copyFeedback.textContent = "";
    }, 1600);
  }

  function showCoinToast() {
    coinToast.classList.remove("is-visible");
    void coinToast.offsetWidth;
    coinToast.classList.add("is-visible");

    window.setTimeout(hideCoinToast, 1400);
  }

  function hideCoinToast() {
    coinToast.classList.remove("is-visible");
  }

  function createCoinParticles(x, y) {
    const particleCount = 18;

    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("span");
      const angle = (Math.PI * 2 * index) / particleCount;
      const distance = randomRange(34, 86);

      particle.className = "coin-particle";
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--particle-x", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--particle-y", `${Math.sin(angle) * distance}px`);

      particleLayer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 780);
    }
  }

  /* ---------- Layout and small helpers ----------------------------------- */

  function measureStage() {
    const stageRect = gameStage.getBoundingClientRect();
    const stageStyle = window.getComputedStyle(gameStage);
    const groundHeight =
      Number.parseFloat(stageStyle.getPropertyValue("--ground-height")) || 54;
    const runnerRect = runner.getBoundingClientRect();

    state.stageWidth = stageRect.width;
    state.stageHeight = stageRect.height;
    state.groundY = state.stageHeight - groundHeight;
    state.runnerLeft = runner.offsetLeft;
    state.runnerHeight = runnerRect.height || 110;
    state.runnerWidth = runnerRect.width || state.runnerHeight * 0.42;
  }

  function clearDynamicElements() {
    objectLayer.innerHTML = "";
    particleLayer.innerHTML = "";
  }

  function setOverlayVisible(element, isVisible) {
    element.classList.toggle("is-hidden", !isVisible);
  }

  function focusStage() {
    try {
      gameStage.focus({ preventScroll: true });
    } catch (error) {
      gameStage.focus();
    }
  }

  function loadHighScore() {
    try {
      const storedValue = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10);
      return Number.isFinite(storedValue) ? storedValue : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveHighScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      /* If storage is blocked, the game still runs without saved best score. */
    }
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
  }
});
