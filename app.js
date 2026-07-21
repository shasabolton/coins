const DEFAULT_SETTINGS = {
  payrate: 1,
  depreciation: 1,
  feedrate: 4,
  start: 3,
  interest: 7,
  presents: 9,
  lifetime: 10,
  staticMode: true,
};

const PARTICLE_MIN_SPEED = 6;
const PARTICLE_MAX_SPEED = 18;
const PARTICLE_DAMPING = 0.996;
const SPLIT_PUSH_SPEED = 30;
const BANK_SPLIT_ANIMATION_MS = 1000;
const INTEGER_SETTING_KEYS = new Set(["payrate", "feedrate", "start", "presents", "lifetime"]);

const PRESETS = {
  easy: {
    payrate: 8,
    depreciation: 1,
    feedrate: 5,
    start: 4,
    interest: 5,
    presents: 7,
    lifetime: 12,
    staticMode: false,
  },
  medium: DEFAULT_SETTINGS,
  hard: {
    payrate: 12,
    depreciation: 0.5,
    feedrate: 3,
    start: 1,
    interest: 6.25,
    presents: 10,
    lifetime: 8,
    staticMode: false,
  },
};

const EMOJIS = [
  "🚀",
  "🧸",
  "🎨",
  "🎧",
  "📚",
  "🦄",
  "🪁",
  "🎲",
  "🛹",
  "🎹",
  "🧩",
  "⚽",
  "🔭",
  "🧪",
  "🎮",
  "🎁",
  "🌈",
  "🐲",
  "🍕",
  "🏆",
  "🪄",
  "🎯",
  "🦖",
  "🌟",
];

const dom = {
  gameState: document.querySelector("#game-state"),
  bankTotal: document.querySelector("#bank-total"),
  bankInterestProgress: document.querySelector("#bank-interest-progress"),
  presentGrid: document.querySelector("#present-grid"),
  purseCoins: document.querySelector("#purse-coins"),
  bankCoins: document.querySelector("#bank-coins"),
  robotStack: document.querySelector("#robot-stack"),
  messagePanel: document.querySelector("#message-panel"),
  appMenu: document.querySelector(".app-menu"),
  newGameButton: document.querySelector("#new-game-button"),
  settingsButton: document.querySelector("#settings-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsForm: document.querySelector("#settings-form"),
  resetDefaultsButton: document.querySelector("#reset-defaults-button"),
  closeSettingsButton: document.querySelector(".icon-button"),
  inputs: {
    payrate: document.querySelector("#payrate-input"),
    depreciation: document.querySelector("#depreciation-input"),
    feedrate: document.querySelector("#feedrate-input"),
    start: document.querySelector("#start-input"),
    interest: document.querySelector("#interest-input"),
    presents: document.querySelector("#presents-input"),
    lifetime: document.querySelector("#lifetime-input"),
    staticMode: document.querySelector("#static-input"),
  },
};

let state;
let drag = null;
let lastHighlightedTarget = null;

function depreciationMs() {
  return payrateMs() * state.settings.depreciation;
}

function interestMs() {
  return payrateMs() * state.settings.interest;
}

function payrateMs() {
  return (state.settings.staticMode ? 1 : state.settings.payrate) * 1000;
}

function formatSeconds(ms) {
  return `${Math.max(0, Math.ceil(ms / 1000))}s`;
}

function gameNow() {
  return state?.gameTime ?? performance.now();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomVelocity() {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomBetween(PARTICLE_MIN_SPEED, PARTICLE_MAX_SPEED);

  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function createCoin(location, timestamp) {
  const coin = {
    id: state.nextCoinId,
    location,
    createdAt: timestamp,
    expiresAt: null,
    nextSplitAt: null,
    splitStartedAt: null,
    splitCompletesAt: null,
    splitChildParticle: null,
    splitAngle: 0,
    particle: null,
    remainingMs: depreciationMs(),
  };

  state.nextCoinId += 1;
  state.coins.push(coin);
  return coin;
}

function createPurseCoin(timestamp) {
  if (state.wageCoinsIssued >= state.settings.lifetime) {
    return null;
  }

  const coin = createCoin("purse", timestamp);
  coin.expiresAt = timestamp + depreciationMs();
  state.wageCoinsIssued += 1;
  return coin;
}

function createRobotCoin(timestamp) {
  const coin = createCoin("robot", timestamp);
  coin.remainingMs = depreciationMs();
  state.robotStack.push(coin.id);
  return coin;
}

function createBankCoin(timestamp, particle = null) {
  const coin = createCoin("bank", timestamp);
  coin.particle = particle;
  return coin;
}

function removeCoin(coinId) {
  state.coins = state.coins.filter((coin) => coin.id !== coinId);
  state.robotStack = state.robotStack.filter((id) => id !== coinId);
}

function findCoin(coinId) {
  return state.coins.find((coin) => coin.id === coinId);
}

function particleSize(location) {
  if (location === "bank") {
    return clamp(Math.min(window.innerWidth * 0.07, window.innerHeight * 0.044), 18, 32);
  }

  return clamp(Math.min(window.innerWidth * 0.088, window.innerHeight * 0.057), 24, 42);
}

function particleRadius(location) {
  return particleSize(location) / 2;
}

function robotCoinSize() {
  return clamp(Math.min(window.innerWidth * 0.07, window.innerHeight * 0.042), 16, 30);
}

function robotStackGap() {
  return clamp(window.innerHeight * 0.0045, 1, 3);
}

function robotCoinScale(coin) {
  const bottomCoinId = state.robotStack[0];

  if (coin.id !== bottomCoinId) {
    return 1;
  }

  return clamp(coin.remainingMs / depreciationMs(), 0.18, 1);
}

function particleArea(location) {
  const element = location === "bank" ? dom.bankCoins : dom.purseCoins;
  const radius = particleRadius(location);

  return {
    element,
    radius,
    width: Math.max(radius * 2 + 2, element.clientWidth || radius * 4),
    height: Math.max(radius * 2 + 2, element.clientHeight || radius * 4),
  };
}

function ensureParticle(coin, location) {
  const area = particleArea(location);

  if (!coin.particle) {
    coin.particle = {
      x: randomBetween(area.radius, area.width - area.radius),
      y: randomBetween(area.radius, area.height - area.radius),
      ...randomVelocity(),
    };
  }

  keepParticleInBounds(coin.particle, area);
  return coin.particle;
}

function keepParticleInBounds(particle, area) {
  const minX = area.radius;
  const maxX = area.width - area.radius;
  const minY = area.radius;
  const maxY = area.height - area.radius;

  if (particle.x < minX) {
    particle.x = minX;
    particle.vx = Math.abs(particle.vx);
  } else if (particle.x > maxX) {
    particle.x = maxX;
    particle.vx = -Math.abs(particle.vx);
  }

  if (particle.y < minY) {
    particle.y = minY;
    particle.vy = Math.abs(particle.vy);
  } else if (particle.y > maxY) {
    particle.y = maxY;
    particle.vy = -Math.abs(particle.vy);
  }
}

function limitParticleSpeed(particle) {
  const speed = Math.hypot(particle.vx, particle.vy);

  if (speed > PARTICLE_MAX_SPEED) {
    const ratio = PARTICLE_MAX_SPEED / speed;
    particle.vx *= ratio;
    particle.vy *= ratio;
  } else if (speed < PARTICLE_MIN_SPEED) {
    const angle = speed === 0 ? Math.random() * Math.PI * 2 : Math.atan2(particle.vy, particle.vx);
    particle.vx = Math.cos(angle) * PARTICLE_MIN_SPEED;
    particle.vy = Math.sin(angle) * PARTICLE_MIN_SPEED;
  }
}

function moveParticle(particle, area, dt, timestamp, seed) {
  const drift = timestamp / 1000 + seed * 1.7;
  particle.vx += Math.sin(drift) * dt * 3;
  particle.vy += Math.cos(drift * 0.8) * dt * 3;
  particle.vx *= PARTICLE_DAMPING;
  particle.vy *= PARTICLE_DAMPING;
  limitParticleSpeed(particle);
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  keepParticleInBounds(particle, area);
}

function splitChildId(coin) {
  return `split-${coin.id}`;
}

function particleItemsFor(location) {
  const coins = state.coins.filter((coin) => coin.location === location && drag?.id !== coin.id);
  const items = [];
  const area = particleArea(location);

  for (const coin of coins) {
    items.push({
      id: coin.id,
      kind: "coin",
      coin,
      location,
      particle: ensureParticle(coin, location),
      radius: area.radius,
    });

    if (location === "bank" && coin.splitChildParticle) {
      keepParticleInBounds(coin.splitChildParticle, area);
      items.push({
        id: splitChildId(coin),
        kind: "split-child",
        coin,
        location,
        particle: coin.splitChildParticle,
        radius: area.radius,
        parentId: coin.id,
      });
    }
  }

  return { area, items };
}

function canParticlesOverlap(a, b) {
  return (
    (a.kind === "split-child" && a.parentId === b.id) ||
    (b.kind === "split-child" && b.parentId === a.id)
  );
}

function resolveParticleCollision(a, b, area) {
  if (canParticlesOverlap(a, b)) {
    return;
  }

  const dx = b.particle.x - a.particle.x;
  const dy = b.particle.y - a.particle.y;
  const distance = Math.hypot(dx, dy) || 0.001;
  const minDistance = a.radius + b.radius + 1;

  if (distance >= minDistance) {
    return;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;
  const push = overlap / 2;

  a.particle.x -= nx * push;
  a.particle.y -= ny * push;
  b.particle.x += nx * push;
  b.particle.y += ny * push;

  const relativeVelocity = (b.particle.vx - a.particle.vx) * nx + (b.particle.vy - a.particle.vy) * ny;

  if (relativeVelocity < 0) {
    const impulse = relativeVelocity * -0.72;
    a.particle.vx -= impulse * nx;
    a.particle.vy -= impulse * ny;
    b.particle.vx += impulse * nx;
    b.particle.vy += impulse * ny;
  }

  keepParticleInBounds(a.particle, area);
  keepParticleInBounds(b.particle, area);
}

function updateParticleGroup(location, dt, timestamp, gameTimestamp) {
  const { area, items } = particleItemsFor(location);

  for (const item of items) {
    moveParticle(item.particle, area, dt, timestamp, Number.parseInt(String(item.id).replace(/\D/g, ""), 10) || 1);
  }

  for (const item of items) {
    if (item.kind === "split-child") {
      pushSplitChildFromParent(item.coin, dt, gameTimestamp);
    }
  }

  for (let pass = 0; pass < 3; pass += 1) {
    for (let index = 0; index < items.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < items.length; otherIndex += 1) {
        resolveParticleCollision(items[index], items[otherIndex], area);
      }
    }
  }
}

function updateParticlePhysics(timestamp) {
  if (state.lastParticleTick === null) {
    state.lastParticleTick = timestamp;
    return;
  }

  const dt = clamp((timestamp - state.lastParticleTick) / 1000, 0, 0.05);
  state.lastParticleTick = timestamp;

  const bankSplitTimestamp =
    state.settings.staticMode && state.bankSplitRealStartedAt !== null ? timestamp : gameNow();

  updateParticleGroup("purse", dt, timestamp, gameNow());
  updateParticleGroup("bank", dt, timestamp, bankSplitTimestamp);
}

function advanceGameClock(timestamp) {
  if (state.lastClockTick === null) {
    state.lastClockTick = timestamp;
    return state.gameTime;
  }

  const elapsed = Math.max(0, timestamp - state.lastClockTick);
  state.lastClockTick = timestamp;

  if (state.status !== "playing") {
    return state.gameTime;
  }

  if (!state.settings.staticMode) {
    state.gameTime += elapsed;
    return state.gameTime;
  }

  const advance = Math.min(elapsed, state.staticBudgetMs);
  state.gameTime += advance;
  state.staticBudgetMs -= advance;

  return state.gameTime;
}

function grantStaticStep() {
  if (!state.settings.staticMode || state.status !== "playing") {
    return;
  }

  state.staticBudgetMs += payrateMs();
}

function newGame(settings = state?.settings ?? DEFAULT_SETTINGS) {
  const timestamp = performance.now();
  const emojis = shuffle(EMOJIS);
  const effectiveSettings = {
    ...settings,
    payrate: settings.staticMode ? 1 : settings.payrate,
  };

  state = {
    settings: effectiveSettings,
    coins: [],
    nextCoinId: 1,
    wageCoinsIssued: 0,
    gameTime: timestamp,
    lastClockTick: null,
    staticBudgetMs: 0,
    nextPayAt: timestamp + effectiveSettings.payrate * 1000,
    bankCycleStartedAt: timestamp,
    bankNextSplitAt: timestamp + effectiveSettings.payrate * effectiveSettings.interest * 1000,
    bankSplitStartedAt: null,
    bankSplitCompletesAt: null,
    bankSplitRealStartedAt: null,
    bankSplitRealCompletesAt: null,
    robotStack: [],
    robotLastTick: timestamp,
    robotPauseBudgetMs: 0,
    lastParticleTick: null,
    status: "playing",
    message: "Feed the robot first, then invest coins so they can make more coins.",
    presents: Array.from({ length: settings.presents }, (_, index) => ({
      emoji: emojis[index % emojis.length],
      opened: false,
    })),
    openedCount: 0,
  };

  for (let count = 0; count < settings.start; count += 1) {
    createRobotCoin(timestamp);
  }

  createPurseCoin(timestamp);
  render(timestamp);
}

function setMessage(message) {
  state.message = message;
}

function endGame(status, message) {
  if (state.status !== "playing") {
    return;
  }

  state.status = status;
  state.message = message;
}

function processIncome(timestamp) {
  if (state.wageCoinsIssued >= state.settings.lifetime) {
    state.nextPayAt = null;
    return;
  }

  if (timestamp < state.nextPayAt) {
    return;
  }

  createPurseCoin(timestamp);
  state.nextPayAt = timestamp + payrateMs();
  setMessage("A new wage coin dropped into the purse.");
}

function processPurse(timestamp) {
  state.coins = state.coins.filter((coin) => {
    if (coin.location !== "purse" || drag?.id === coin.id) {
      return true;
    }

    return timestamp < coin.expiresAt;
  });
}

function processRobot(timestamp) {
  let elapsed = timestamp - state.robotLastTick;
  state.robotLastTick = timestamp;

  if (state.robotPauseBudgetMs > 0) {
    const pausedElapsed = Math.min(elapsed, state.robotPauseBudgetMs);
    state.robotPauseBudgetMs -= pausedElapsed;
    elapsed -= pausedElapsed;
  }

  while (elapsed > 0) {
    const bottomCoinId = state.robotStack[0];
    const bottomCoin = findCoin(bottomCoinId);

    if (!bottomCoin) {
      endGame("lost", "The robot ran out of coins and shut down. Game over.");
      return;
    }

    bottomCoin.remainingMs -= elapsed;

    if (bottomCoin.remainingMs > 0) {
      return;
    }

    elapsed = Math.abs(bottomCoin.remainingMs);
    removeCoin(bottomCoin.id);

    if (state.robotStack.length === 0) {
      endGame("lost", "The robot ran out of coins and shut down. Game over.");
      return;
    }
  }
}

function pushNearbyCoinsFromSplit(parentCoin) {
  const { area, items } = particleItemsFor("bank");
  const parent = ensureParticle(parentCoin, "bank");

  for (const item of items) {
    if (item.coin.id === parentCoin.id) {
      continue;
    }

    const dx = item.particle.x - parent.x;
    const dy = item.particle.y - parent.y;
    const distance = Math.hypot(dx, dy) || 1;
    const influence = area.radius * 5;

    if (distance > influence) {
      continue;
    }

    const strength = (1 - distance / influence) * SPLIT_PUSH_SPEED;
    item.particle.vx += (dx / distance) * strength;
    item.particle.vy += (dy / distance) * strength;
    keepParticleInBounds(item.particle, area);
  }
}

function beginSplit(coin, timestamp) {
  const parent = ensureParticle(coin, "bank");
  const angle = Math.random() * Math.PI * 2;
  const pushX = Math.cos(angle);
  const pushY = Math.sin(angle);

  coin.nextSplitAt = null;
  coin.splitStartedAt = timestamp;
  coin.splitCompletesAt = timestamp + BANK_SPLIT_ANIMATION_MS;
  coin.splitAngle = angle;
  coin.splitChildParticle = {
    x: parent.x,
    y: parent.y,
    vx: parent.vx + pushX * (SPLIT_PUSH_SPEED * 0.2),
    vy: parent.vy + pushY * (SPLIT_PUSH_SPEED * 0.2),
  };

  parent.vx -= pushX * (SPLIT_PUSH_SPEED * 0.1);
  parent.vy -= pushY * (SPLIT_PUSH_SPEED * 0.1);
  pushNearbyCoinsFromSplit(coin);
}

function splitProgress(coin, timestamp) {
  if (coin.splitStartedAt === null || coin.splitCompletesAt === null) {
    return 0;
  }

  return clamp((timestamp - coin.splitStartedAt) / (coin.splitCompletesAt - coin.splitStartedAt), 0, 1);
}

function pushSplitChildFromParent(coin, dt, timestamp) {
  if (!coin.splitChildParticle || !coin.particle) {
    return;
  }

  const child = coin.splitChildParticle;
  const parent = coin.particle;
  const progress = splitProgress(coin, timestamp);
  const radius = particleRadius("bank");
  const targetDistance = radius * 2.25 * progress;
  const targetX = parent.x + Math.cos(coin.splitAngle) * targetDistance;
  const targetY = parent.y + Math.sin(coin.splitAngle) * targetDistance;
  const pullX = targetX - child.x;
  const pullY = targetY - child.y;
  const spring = 9 * dt;

  child.vx += pullX * spring;
  child.vy += pullY * spring;
  parent.vx -= pullX * spring * 0.04;
  parent.vy -= pullY * spring * 0.04;
}

function completeSplit(coin, timestamp) {
  const childParticle = {
    ...coin.splitChildParticle,
  };

  createBankCoin(timestamp, childParticle);
  coin.splitStartedAt = null;
  coin.splitCompletesAt = null;
  coin.splitChildParticle = null;
}

function processBank(timestamp, realTimestamp = timestamp) {
  if (state.bankSplitCompletesAt !== null) {
    const splitComplete = state.settings.staticMode
      ? realTimestamp >= state.bankSplitRealCompletesAt
      : timestamp >= state.bankSplitCompletesAt;

    if (!splitComplete) {
      return;
    }

    const splittingCoins = state.coins.filter((coin) => coin.location === "bank" && coin.splitChildParticle);

    if (splittingCoins.some((coin) => drag?.id === coin.id)) {
      return;
    }

    for (const coin of splittingCoins) {
      completeSplit(coin, timestamp);
    }

    state.bankSplitStartedAt = null;
    state.bankSplitCompletesAt = null;
    state.bankSplitRealStartedAt = null;
    state.bankSplitRealCompletesAt = null;
    state.bankCycleStartedAt = timestamp;
    state.bankNextSplitAt = timestamp + interestMs();

    if (splittingCoins.length > 0) {
      setMessage(`${splittingCoins.length} bank coin${splittingCoins.length === 1 ? "" : "s"} finished splitting.`);
    }

    return;
  }

  if (timestamp < state.bankNextSplitAt) {
    return;
  }

  const coinsToSplit = state.coins.filter((coin) => coin.location === "bank" && drag?.id !== coin.id);

  if (coinsToSplit.length === 0) {
    state.bankCycleStartedAt = timestamp;
    state.bankNextSplitAt = timestamp + interestMs();
    return;
  }

  state.bankSplitStartedAt = timestamp;
  state.bankSplitCompletesAt = timestamp + BANK_SPLIT_ANIMATION_MS;
  state.bankSplitRealStartedAt = state.settings.staticMode ? realTimestamp : null;
  state.bankSplitRealCompletesAt = state.settings.staticMode ? realTimestamp + BANK_SPLIT_ANIMATION_MS : null;

  for (const coin of coinsToSplit) {
    beginSplit(coin, state.settings.staticMode ? realTimestamp : timestamp);
  }

  setMessage(`${coinsToSplit.length} bank coin${coinsToSplit.length === 1 ? " is" : "s are"} splitting.`);
}

function checkWinOrLoss() {
  if (state.openedCount === state.presents.length) {
    endGame("won", "You opened every present and kept the robot alive. You win!");
    return;
  }

  const spendableCoins = state.coins.filter((coin) => coin.location === "purse" || coin.location === "bank");

  if (
    state.wageCoinsIssued >= state.settings.lifetime &&
    spendableCoins.length === 0 &&
    state.openedCount < state.presents.length
  ) {
    endGame("lost", "The lifetime wage coins are gone and there are no spendable coins left. Game over.");
  }
}

function tick(timestamp) {
  const gameTimestamp = advanceGameClock(timestamp);

  if (state.status === "playing") {
    processIncome(gameTimestamp);
    processPurse(gameTimestamp);
    processRobot(gameTimestamp);
    processBank(gameTimestamp, timestamp);
    checkWinOrLoss();
  }

  updateParticlePhysics(timestamp);
  render(gameTimestamp);
  requestAnimationFrame(tick);
}

function createCoinElement(coin, timestamp, location) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `coin coin--${location}`;
  element.dataset.coinId = String(coin.id);
  element.setAttribute("aria-label", `${location} coin`);

  if (location === "purse" || location === "bank") {
    const particle = ensureParticle(coin, location);
    element.style.setProperty("--x", `${particle.x}px`);
    element.style.setProperty("--y", `${particle.y}px`);
  }

  if (drag?.id === coin.id) {
    element.classList.add("is-source");
  }

  if (location === "purse") {
    const remaining = (coin.expiresAt - timestamp) / depreciationMs();
    element.style.setProperty("--scale", clamp(remaining, 0.18, 1).toFixed(2));
    element.title = `Disappears in ${formatSeconds(coin.expiresAt - timestamp)}`;
  } else if (location === "robot") {
    const bottomCoinId = state.robotStack[0];
    const scale = robotCoinScale(coin);
    element.style.setProperty("--scale", scale.toFixed(2));
    element.title =
      coin.id === bottomCoinId ? `Robot meal has ${formatSeconds(coin.remainingMs)} left` : "Waiting in robot stack";

    if (coin.id === bottomCoinId) {
      element.classList.add("is-bottom");
    }
  } else {
    if (coin.splitCompletesAt !== null) {
      const splitTimestamp =
        state.settings.staticMode && state.bankSplitRealStartedAt !== null ? performance.now() : timestamp;
      element.classList.add("is-splitting");
      element.title =
        splitTimestamp < coin.splitCompletesAt
          ? `Splitting for ${formatSeconds(coin.splitCompletesAt - splitTimestamp)}`
          : "Separating";
    } else {
      element.title = `Bank splits in ${formatSeconds(state.bankNextSplitAt - timestamp)}`;
    }
  }

  return element;
}

function createSplitChildElement(coin) {
  if (!coin.splitChildParticle || drag?.id === coin.id) {
    return null;
  }

  const element = document.createElement("span");
  element.className = "coin coin--bank split-child-particle";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--x", `${coin.splitChildParticle.x}px`);
  element.style.setProperty("--y", `${coin.splitChildParticle.y}px`);
  return element;
}

function renderCoins(timestamp) {
  const purseFragment = document.createDocumentFragment();
  const bankFragment = document.createDocumentFragment();
  const robotFragment = document.createDocumentFragment();
  let robotOffset = 0;

  for (const coin of state.coins) {
    if (coin.location === "purse") {
      purseFragment.append(createCoinElement(coin, timestamp, "purse"));
    } else if (coin.location === "bank") {
      const splitChild = createSplitChildElement(coin);

      if (splitChild) {
        bankFragment.append(splitChild);
      }

      bankFragment.append(createCoinElement(coin, timestamp, "bank"));
    }
  }

  for (const coinId of state.robotStack) {
    const coin = findCoin(coinId);

    if (coin) {
      const scale = robotCoinScale(coin);
      const element = createCoinElement(coin, timestamp, "robot");
      element.style.setProperty("--robot-bottom", `${robotOffset}px`);
      robotOffset += robotCoinSize() * scale + robotStackGap();
      robotFragment.append(element);
    }
  }

  dom.purseCoins.replaceChildren(purseFragment);
  dom.bankCoins.replaceChildren(bankFragment);
  dom.robotStack.replaceChildren(robotFragment);
}

function renderPresents() {
  const fragment = document.createDocumentFragment();

  state.presents.forEach((present, index) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `present${present.opened ? " is-open" : ""}`;
    element.dataset.presentIndex = String(index);
    element.setAttribute("aria-label", present.opened ? `Opened present with ${present.emoji}` : "Wrapped present");
    element.textContent = present.opened ? present.emoji : "🎁";
    fragment.append(element);
  });

  dom.presentGrid.replaceChildren(fragment);
}

function renderStats(timestamp) {
  const bankCoins = state.coins.filter((coin) => coin.location === "bank");
  let progress;

  if (state.bankSplitCompletesAt !== null) {
    progress = 1;
  } else {
    const cycleLength = Math.max(1, state.bankNextSplitAt - state.bankCycleStartedAt);
    progress = clamp((timestamp - state.bankCycleStartedAt) / cycleLength, 0, 1);
  }

  dom.bankTotal.textContent = `$${bankCoins.length}`;
  dom.bankInterestProgress.style.setProperty("--progress", progress.toFixed(3));
}

function renderStatus() {
  dom.gameState.classList.toggle("is-over", state.status === "lost");
  dom.gameState.classList.toggle("is-won", state.status === "won");
  dom.messagePanel.classList.toggle("is-over", state.status === "lost");
  dom.messagePanel.classList.toggle("is-won", state.status === "won");

  if (state.status === "won") {
    dom.gameState.textContent = "Won";
  } else if (state.status === "lost") {
    dom.gameState.textContent = "Game over";
  } else if (state.settings.staticMode && state.staticBudgetMs <= 0) {
    dom.gameState.textContent = "Static pause";
  } else {
    dom.gameState.textContent = "Playing";
  }

  dom.messagePanel.textContent = state.message;
}

function render(timestamp = performance.now()) {
  renderStats(timestamp);
  renderStatus();
  renderPresents();
  renderCoins(timestamp);
}

function updateGhostPosition(event) {
  if (!drag) {
    return;
  }

  drag.ghost.style.left = `${event.clientX}px`;
  drag.ghost.style.top = `${event.clientY}px`;
}

function clearHighlightedTarget() {
  if (!lastHighlightedTarget) {
    return;
  }

  lastHighlightedTarget.classList.remove("is-drop-target", "is-targeted");
  lastHighlightedTarget = null;
}

function highlightTarget(event) {
  clearHighlightedTarget();

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const present = target?.closest(".present:not(.is-open)");
  const dropZone = target?.closest("[data-drop]");
  const highlight = present ?? dropZone;

  if (highlight) {
    highlight.classList.add(present ? "is-targeted" : "is-drop-target");
    lastHighlightedTarget = highlight;
  }
}

function startDrag(event, coin) {
  const ghost = document.createElement("div");
  ghost.className = "coin coin-ghost";
  ghost.setAttribute("aria-hidden", "true");

  if (coin.splitChildParticle && coin.particle) {
    const child = document.createElement("span");
    child.className = "coin drag-split-child";
    child.style.setProperty("--drag-child-x", `${coin.splitChildParticle.x - coin.particle.x}px`);
    child.style.setProperty("--drag-child-y", `${coin.splitChildParticle.y - coin.particle.y}px`);
    ghost.append(child);
  }

  document.body.append(ghost);

  drag = {
    id: coin.id,
    ghost,
  };

  updateGhostPosition(event);
  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp, { once: true });
  document.addEventListener("pointercancel", cancelDrag, { once: true });
  render();
}

function cancelDrag() {
  clearHighlightedTarget();

  if (drag) {
    drag.ghost.remove();
    drag = null;
  }

  document.removeEventListener("pointermove", handlePointerMove);
  render();
}

function finishDrag(event) {
  if (!drag) {
    return;
  }

  const coinId = drag.id;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const isRobotDrop = target?.closest("[data-drop]")?.dataset.drop === "robot";
  const pausesRobotDepreciation = state.settings.staticMode && isRobotDrop;
  clearHighlightedTarget();
  drag.ghost.remove();
  drag = null;
  document.removeEventListener("pointermove", handlePointerMove);

  const didMoveToDifferentBox = handleDrop(coinId, target, gameNow(), event);

  if (didMoveToDifferentBox && pausesRobotDepreciation) {
    state.robotPauseBudgetMs += payrateMs();
  }

  if (didMoveToDifferentBox) {
    grantStaticStep();
  }

  render();
}

function handlePointerMove(event) {
  updateGhostPosition(event);
  highlightTarget(event);
}

function handlePointerUp(event) {
  finishDrag(event);
}

function handleDrop(coinId, target, timestamp, event) {
  if (state.status !== "playing") {
    return false;
  }

  const coin = findCoin(coinId);

  if (!coin || coin.location === "robot") {
    return false;
  }

  const presentElement = target?.closest(".present");

  if (presentElement) {
    return openPresent(coin, Number(presentElement.dataset.presentIndex));
  }

  const dropZone = target?.closest("[data-drop]");
  const destination = dropZone?.dataset.drop;

  if (destination === "robot") {
    return feedRobot(coin, timestamp);
  }

  if (destination === "bank") {
    return investCoin(coin, timestamp, event);
  }

  return false;
}

function feedRobot(coin) {
  if (state.robotStack.length >= state.settings.feedrate) {
    setMessage(`The robot can only hold ${state.settings.feedrate} coins at a time.`);
    return false;
  }

  coin.location = "robot";
  coin.expiresAt = null;
  coin.nextSplitAt = null;
  coin.splitStartedAt = null;
  coin.splitCompletesAt = null;
  coin.splitChildParticle = null;
  coin.remainingMs = depreciationMs();
  state.robotStack.push(coin.id);
  setMessage("The robot ate a coin and stacked it in his tummy.");
  return true;
}

function placeParticleFromEvent(coin, location, event) {
  const area = particleArea(location);
  const rect = area.element.getBoundingClientRect();

  coin.particle = {
    x: clamp(event.clientX - rect.left, area.radius, area.width - area.radius),
    y: clamp(event.clientY - rect.top, area.radius, area.height - area.radius),
    ...randomVelocity(),
  };
}

function investCoin(coin, timestamp, event) {
  if (coin.location !== "purse") {
    setMessage("Only fresh purse coins can be moved into the bank.");
    return false;
  }

  coin.location = "bank";
  coin.expiresAt = null;
  coin.nextSplitAt = null;
  coin.splitStartedAt = null;
  coin.splitCompletesAt = null;
  coin.splitChildParticle = null;
  placeParticleFromEvent(coin, "bank", event);
  setMessage("The coin is now invested in the savings bank.");
  return true;
}

function openPresent(coin, presentIndex) {
  const present = state.presents[presentIndex];

  if (!present || present.opened) {
    return false;
  }

  present.opened = true;
  state.openedCount += 1;
  removeCoin(coin.id);
  setMessage(`The present opened and revealed ${present.emoji}.`);
  checkWinOrLoss();
  return true;
}

function fillSettingsForm(settings) {
  Object.entries(settings).forEach(([key, value]) => {
    if (dom.inputs[key].type === "checkbox") {
      dom.inputs[key].checked = Boolean(value);
    } else {
      dom.inputs[key].value = value;
    }
  });
  dom.inputs.start.setCustomValidity("");
  updateStaticPayrateInput();
}

function readSettingsForm() {
  const nextSettings = {};

  for (const [key, input] of Object.entries(dom.inputs)) {
    if (input.type === "checkbox") {
      nextSettings[key] = input.checked;
      continue;
    }

    const value = Number(input.value);

    if (!Number.isFinite(value)) {
      throw new Error(`${key} must be a number.`);
    }

    nextSettings[key] = INTEGER_SETTING_KEYS.has(key) ? Math.round(value) : Number(value.toFixed(2));
  }

  if (nextSettings.staticMode) {
    nextSettings.payrate = 1;
  }

  if (nextSettings.start > nextSettings.feedrate) {
    dom.inputs.start.setCustomValidity("Start S cannot be greater than feedrate F.");
    dom.inputs.start.reportValidity();
    throw new Error("Start S cannot be greater than feedrate F.");
  }

  dom.inputs.start.setCustomValidity("");

  return nextSettings;
}

function updateStaticPayrateInput(applyDefaults = false) {
  const isStatic = dom.inputs.staticMode.checked;

  if (isStatic) {
    dom.inputs.payrate.value = 1;
    if (applyDefaults) {
      dom.inputs.interest.value = 7;
    }
  } else if (applyDefaults) {
    if (Number(dom.inputs.payrate.value) === 1) {
      dom.inputs.payrate.value = 5;
    }

    if (Number(dom.inputs.interest.value) === 7) {
      dom.inputs.interest.value = 4;
    }
  }

  dom.inputs.payrate.disabled = isStatic;
}

document.addEventListener("pointerdown", (event) => {
  if (state.status !== "playing") {
    return;
  }

  const coinElement = event.target.closest(".coin[data-coin-id]");

  if (!coinElement) {
    return;
  }

  const coin = findCoin(Number(coinElement.dataset.coinId));

  if (!coin || coin.location === "robot") {
    return;
  }

  event.preventDefault();
  startDrag(event, coin);
});

dom.newGameButton.addEventListener("click", () => {
  dom.appMenu.open = false;
  newGame(state.settings);
});

dom.settingsButton.addEventListener("click", () => {
  dom.appMenu.open = false;
  fillSettingsForm(state.settings);
  dom.settingsDialog.showModal();
});

dom.closeSettingsButton.addEventListener("click", () => {
  dom.settingsDialog.close();
});

dom.resetDefaultsButton.addEventListener("click", () => {
  fillSettingsForm(DEFAULT_SETTINGS);
});

dom.settingsForm.addEventListener("click", (event) => {
  const presetButton = event.target.closest("[data-preset]");

  if (!presetButton) {
    return;
  }

  fillSettingsForm(PRESETS[presetButton.dataset.preset]);
});

dom.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  dom.inputs.start.setCustomValidity("");

  if (!dom.settingsForm.reportValidity()) {
    return;
  }

  let settings;

  try {
    settings = readSettingsForm();
  } catch {
    return;
  }

  dom.settingsDialog.close();
  newGame(settings);
});

dom.inputs.start.addEventListener("input", () => dom.inputs.start.setCustomValidity(""));
dom.inputs.feedrate.addEventListener("input", () => dom.inputs.start.setCustomValidity(""));
dom.inputs.staticMode.addEventListener("input", () => updateStaticPayrateInput(true));

fillSettingsForm(DEFAULT_SETTINGS);
newGame(DEFAULT_SETTINGS);
requestAnimationFrame(tick);
