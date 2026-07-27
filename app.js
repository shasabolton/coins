const DEFAULT_SETTINGS = {
  payrate: 1,
  depreciation: 1,
  feedrate: 4,
  start: 3,
  interest: 7,
  presents: 9,
  lifetime: 10,
  staticMode: true,
  bankTheme: "bank",
};

const PARTICLE_MIN_SPEED = 6;
const PARTICLE_MAX_SPEED = 18;
const PARTICLE_DAMPING = 0.996;
const SPLIT_PUSH_SPEED = 30;
const BANK_SPLIT_ANIMATION_MS = 2000;
const PRESENT_REVEAL_MS = 4000;
const PRESENT_CONFETTI_PIECES = 30;
const PURSE_DROP_GRAVITY = 720;
const PURSE_DROP_BOUNCE = 0.52;
const PURSE_DROP_SETTLE_SPEED = 55;
const PURSE_DROP_MAX_MS = 7000;
const CHA_CHING_SRC = "cha-ching.mp3";
const CHA_CHING_FALLBACK_MS = 1600;
const CHA_CHING_STAGGER_MS = 300;
const BANK_CHACHING_TAIL_MS = 2000;
const COIN_DROP_SRC = "coin-drop.mp3";
const COIN_DROP_START_SEC = 0.7;
const COIN_TINK_SRC = "coin tink.mp3";
const COIN_TINK_START_FALLBACK_SEC = 1.46;
const COIN_TINK_PEAK_RATIO = 0.25;
const STRETCH_SRC = "stretch.mp3";
const POP_SRC = "pop.mp3";
const POP_START_FALLBACK_SEC = 0.02;
const DRUMROLL_SRC = "drumroll.mp3";
const DRUMROLL_CRASH_SEC = 3.41;
const PRESENT_EXPLODE_PROGRESS = 0.48;
const DRUMROLL_FADE_IN_MS = 450;
const MITOSIS_SEPARATE_PROGRESS = 0.78;
const INTEGER_SETTING_KEYS = new Set(["payrate", "feedrate", "start", "presents", "lifetime"]);
const BANK_THEME_VALUES = new Set(["bank", "tree"]);
const TREE_GRID_SLOTS = [
  { x: 24, y: 23 },
  { x: 76, y: 23 },
  { x: 24, y: 50 },
  { x: 76, y: 50 },
  { x: 24, y: 77 },
  { x: 76, y: 77 },
];
const TREE_CELL_X_RADIUS = 18;
const TREE_CELL_TOP_OFFSET = 16;
const TREE_ROW_BASE_OFFSETS = [5.5, 9.5, 14];
const TREE_INITIAL_BRANCH_LENGTH = 8.8;
const TREE_BRANCH_SHRINK = 0.72;
const TREE_BRANCH_FORK_ANGLE = Math.PI * 0.28;

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
    bankTheme: "bank",
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
    bankTheme: "bank",
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
  bankTotal: document.querySelector("#bank-total"),
  bankInterestProgress: document.querySelector("#bank-interest-progress"),
  presentGrid: document.querySelector("#present-grid"),
  purseReserve: document.querySelector("#purse-reserve"),
  purseCoins: document.querySelector("#purse-coins"),
  bankCoins: document.querySelector("#bank-coins"),
  bankBricks: document.querySelector("#bank-bricks"),
  bankZone: document.querySelector(".zone--bank"),
  bankWall: document.querySelector(".bank-wall"),
  robot: document.querySelector(".robot"),
  robotStack: document.querySelector("#robot-stack"),
  startOverlay: document.querySelector("#start-overlay"),
  startPlayButton: document.querySelector("#start-play-button"),
  resultOverlay: document.querySelector("#result-overlay"),
  resultCard: document.querySelector(".result-card"),
  resultKicker: document.querySelector("#result-kicker"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  resultDetail: document.querySelector("#result-detail"),
  resultNewGameButton: document.querySelector("#result-new-game-button"),
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
    bankTheme: document.querySelector("#bank-theme-input"),
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

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

function isTreeBankTheme(settings = state?.settings) {
  return settings?.bankTheme === "tree";
}

function treeCoinScale(depth = 0) {
  return clamp(0.9 - depth * 0.12, 0.28, 0.9);
}

function treeBranchWidth(depth = 0) {
  return clamp(4.5 - depth * 0.45, 1.4, 4.5);
}

function treeSlotBaseAngle(slotIndex) {
  const column = slotIndex % 2;
  const columnTilt = column === 0 ? 0.06 : -0.06;

  return -Math.PI / 2 + columnTilt;
}

function treeRootNode(slotIndex, treeId) {
  const slot = TREE_GRID_SLOTS[slotIndex] ?? TREE_GRID_SLOTS[0];
  const row = Math.floor(slotIndex / 2);
  const baseY = slot.y + (TREE_ROW_BASE_OFFSETS[row] ?? TREE_ROW_BASE_OFFSETS[1]);

  return {
    treeId,
    treeSlot: slotIndex,
    treeDepth: 0,
    treeX: slot.x,
    treeY: baseY,
    treeRootX: slot.x,
    treeRootY: baseY,
    treeLeftX: slot.x - TREE_CELL_X_RADIUS,
    treeRightX: slot.x + TREE_CELL_X_RADIUS,
    treeTopY: slot.y - TREE_CELL_TOP_OFFSET,
    treeBaseY: baseY,
    treeAngle: treeSlotBaseAngle(slotIndex),
    treeNextBranchLength: TREE_INITIAL_BRANCH_LENGTH,
  };
}

function fitPointToTreeEnvelope(bounds, x, y) {
  return {
    x: clamp(x, bounds.leftX, bounds.rightX),
    y: clamp(y, bounds.topY, bounds.baseY),
  };
}

function createTreeBranchRecord(childNode, startedAt) {
  const branch = {
    id: state.nextTreeBranchId,
    treeId: childNode.treeId,
    depth: childNode.treeDepth,
    fromX: childNode.treeParentX,
    fromY: childNode.treeParentY,
    toX: childNode.treeX,
    toY: childNode.treeY,
    startedAt,
    completesAt: startedAt + BANK_SPLIT_ANIMATION_MS,
    complete: false,
  };

  state.nextTreeBranchId += 1;
  state.treeBranches.push(branch);
  return branch.id;
}

function finishTreeBranch(branchId) {
  const branch = state.treeBranches.find((item) => item.id === branchId);

  if (branch) {
    branch.complete = true;
  }
}

function removeTreeBranch(branchId) {
  state.treeBranches = state.treeBranches.filter((branch) => branch.id !== branchId);
}

function nextTreeChildNodes(coin, timestamp) {
  const depth = coin.treeDepth ?? 0;
  const childDepth = depth + 1;
  const branchLength = coin.treeNextBranchLength ?? TREE_INITIAL_BRANCH_LENGTH;
  const forkAngle = TREE_BRANCH_FORK_ANGLE * 0.62 ** depth;
  const parentX = coin.treeX ?? 50;
  const parentY = coin.treeY ?? 50;
  const rootX = coin.treeRootX ?? parentX;
  const rootY = coin.treeRootY ?? parentY;
  const parentAngle = coin.treeAngle ?? -Math.PI / 2;
  const centerAngle = parentAngle * 0.45 + (-Math.PI / 2) * 0.55;
  const bounds = {
    leftX: coin.treeLeftX ?? rootX - TREE_CELL_X_RADIUS,
    rightX: coin.treeRightX ?? rootX + TREE_CELL_X_RADIUS,
    topY: coin.treeTopY ?? rootY - TREE_CELL_TOP_OFFSET,
    baseY: coin.treeBaseY ?? rootY,
  };

  return [-1, 1].map((side) => {
    const angle = centerAngle + side * forkAngle;
    const point = fitPointToTreeEnvelope(
      bounds,
      parentX + Math.cos(angle) * branchLength,
      parentY + Math.sin(angle) * branchLength,
    );
    const childNode = {
      treeId: coin.treeId,
      treeSlot: coin.treeSlot,
      treeDepth: childDepth,
      treeX: point.x,
      treeY: point.y,
      treeRootX: rootX,
      treeRootY: rootY,
      treeLeftX: bounds.leftX,
      treeRightX: bounds.rightX,
      treeTopY: bounds.topY,
      treeBaseY: bounds.baseY,
      treeParentX: parentX,
      treeParentY: parentY,
      treeAngle: angle,
      treeNextBranchLength: branchLength * TREE_BRANCH_SHRINK,
    };

    childNode.treeBranchId = createTreeBranchRecord(childNode, timestamp);
    return childNode;
  });
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
    treeSproutChildren: null,
    splitAngle: 0,
    particle: null,
    dropping: false,
    dropStartedAt: null,
    dropStartY: null,
    dropBounces: 0,
    dropSquashUntil: null,
    treeId: null,
    treeSlot: null,
    treeDepth: 0,
    treeX: 50,
    treeY: 50,
    treeRootX: 50,
    treeRootY: 50,
    treeLeftX: 35,
    treeRightX: 65,
    treeTopY: 35,
    treeBaseY: 50,
    treeParentX: null,
    treeParentY: null,
    treeAngle: -Math.PI / 2,
    treeNextBranchLength: TREE_INITIAL_BRANCH_LENGTH,
    remainingMs: depreciationMs(),
  };

  state.nextCoinId += 1;
  state.coins.push(coin);
  return coin;
}

function queuePurseCoinDrop(timestamp) {
  if (state.wageCoinsIssued >= state.settings.lifetime || state.pendingPurseDrop) {
    return null;
  }

  const token = state.nextCoinId;
  state.pendingPurseDrop = { token, gameTimestamp: timestamp };

  playChaChing(() => {
    if (!state?.pendingPurseDrop || state.pendingPurseDrop.token !== token) {
      return;
    }

    state.pendingPurseDrop = null;
    createPurseCoin(gameNow());
  });

  return true;
}

function createPurseCoin(timestamp) {
  if (state.wageCoinsIssued >= state.settings.lifetime) {
    return null;
  }

  const remainingBefore = state.settings.lifetime - state.wageCoinsIssued;
  const dropOrigin = readPurseReserveDropOrigin(remainingBefore - 1);
  const now = performance.now();
  const coin = createCoin("purse", timestamp);
  const area = particleArea("purse");
  const startX = clamp(dropOrigin.x + randomBetween(-6, 6), area.radius, Math.max(area.radius, area.width - area.radius));
  const startY = dropOrigin.y;

  coin.expiresAt = timestamp + depreciationMs();
  coin.dropping = true;
  coin.dropStartedAt = now;
  coin.dropStartY = startY;
  coin.dropBounces = 0;
  coin.dropSquashUntil = null;
  coin.particle = {
    x: startX,
    y: startY,
    vx: randomBetween(-28, 28),
    vy: randomBetween(6, 18),
  };
  state.wageCoinsIssued += 1;
  return coin;
}

function readPurseReserveDropOrigin(index) {
  const area = particleArea("purse");
  const reserveCoins = dom.purseReserve?.querySelectorAll(".purse-reserve-coin");
  const slot = reserveCoins?.[index] ?? reserveCoins?.[reserveCoins.length - 1];

  if (slot && area.element) {
    const slotRect = slot.getBoundingClientRect();
    const trayRect = area.element.getBoundingClientRect();

    return {
      x: slotRect.left + slotRect.width / 2 - trayRect.left,
      y: slotRect.top + slotRect.height / 2 - trayRect.top,
    };
  }

  return {
    x: area.width / 2,
    y: -10,
  };
}

function isPurseCoinDropping(coin) {
  return coin.location === "purse" && coin.dropping;
}

function clearPurseDrop(coin) {
  coin.dropping = false;
  coin.dropStartedAt = null;
  coin.dropStartY = null;
  coin.dropBounces = 0;
  coin.dropSquashUntil = null;
}

function finishPurseDrop(coin) {
  if (!coin.dropping || !coin.particle) {
    return;
  }

  const area = particleArea("purse");
  const particle = coin.particle;
  const floatSpeed = randomBetween(PARTICLE_MIN_SPEED, PARTICLE_MAX_SPEED);

  particle.y = clamp(particle.y, area.radius, area.height - area.radius);
  particle.x = clamp(particle.x, area.radius, area.width - area.radius);
  particle.vx = randomBetween(-floatSpeed, floatSpeed);
  particle.vy = -randomBetween(PARTICLE_MIN_SPEED * 0.8, PARTICLE_MAX_SPEED);
  keepParticleInBounds(particle, area);
  clearPurseDrop(coin);
}

function updatePurseDropCoin(coin, area, dt, now) {
  const particle = coin.particle;

  if (!particle) {
    clearPurseDrop(coin);
    return;
  }

  particle.vy += PURSE_DROP_GRAVITY * dt;
  particle.vx *= 0.997;
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;

  const minX = area.radius;
  const maxX = Math.max(area.radius, area.width - area.radius);
  const floorY = Math.max(area.radius, area.height - area.radius);

  if (particle.x < minX) {
    particle.x = minX;
    particle.vx = Math.abs(particle.vx) * 0.55;
  } else if (particle.x > maxX) {
    particle.x = maxX;
    particle.vx = -Math.abs(particle.vx) * 0.55;
  }

  if (particle.y >= floorY) {
    particle.y = floorY;

    if (coin.dropBounces === 0) {
      playCoinDrop();
    }

    if (Math.abs(particle.vy) > PURSE_DROP_SETTLE_SPEED && coin.dropBounces < 5) {
      particle.vy = -Math.abs(particle.vy) * PURSE_DROP_BOUNCE;
      particle.vx *= 0.82;
      coin.dropBounces += 1;
      coin.dropSquashUntil = now + 140;
    } else {
      finishPurseDrop(coin);
      return;
    }
  }

  if (coin.dropStartedAt !== null && now - coin.dropStartedAt > PURSE_DROP_MAX_MS) {
    finishPurseDrop(coin);
  }
}

function updatePurseDrops(dt, now, paused) {
  if (paused || dt <= 0) {
    return;
  }

  const area = particleArea("purse");

  for (const coin of state.coins) {
    if (!isPurseCoinDropping(coin)) {
      continue;
    }

    updatePurseDropCoin(coin, area, dt, now);
  }
}

function purseDropScale(coin, endScale) {
  if (!isPurseCoinDropping(coin) || !coin.particle) {
    return endScale;
  }

  const area = particleArea("purse");
  const floorY = Math.max(area.radius, area.height - area.radius);
  const startY = coin.dropStartY ?? coin.particle.y;
  const fallRange = Math.max(24, floorY - startY);
  const progress = clamp((coin.particle.y - startY) / fallRange, 0, 1);
  return 0.22 + (endScale - 0.22) * Math.min(1, 0.2 + progress * 0.95);
}

function purseDropSquash(coin, now = performance.now()) {
  if (!coin.dropSquashUntil || now >= coin.dropSquashUntil) {
    return { x: 1, y: 1 };
  }

  const remaining = (coin.dropSquashUntil - now) / 140;
  const amount = remaining * remaining;
  return {
    x: 1 + amount * 0.22,
    y: 1 - amount * 0.28,
  };
}

let chaChingAudio = null;
let coinDropAudio = null;
let coinTinkAudio = null;
let stretchAudio = null;
let popAudio = null;
let drumrollAudio = null;
let mitosisStretchInstance = null;
let presentDrumrollInstance = null;
let presentDrumrollFadeRaf = null;
let coinTinkStartSec = COIN_TINK_START_FALLBACK_SEC;
let coinTinkStartResolved = false;
let popStartSec = POP_START_FALLBACK_SEC;
let popStartResolved = false;

function ensureChaChingAudio() {
  if (!chaChingAudio) {
    chaChingAudio = new Audio(CHA_CHING_SRC);
    chaChingAudio.preload = "auto";
  }

  return chaChingAudio;
}

function ensureCoinDropAudio() {
  if (!coinDropAudio) {
    coinDropAudio = new Audio(COIN_DROP_SRC);
    coinDropAudio.preload = "auto";
  }

  return coinDropAudio;
}

function ensureCoinTinkAudio() {
  if (!coinTinkAudio) {
    coinTinkAudio = new Audio(COIN_TINK_SRC);
    coinTinkAudio.preload = "auto";
    resolveCoinTinkStartSec();
  }

  return coinTinkAudio;
}

function ensureStretchAudio() {
  if (!stretchAudio) {
    stretchAudio = new Audio(STRETCH_SRC);
    stretchAudio.preload = "auto";
  }

  return stretchAudio;
}

function ensurePopAudio() {
  if (!popAudio) {
    popAudio = new Audio(POP_SRC);
    popAudio.preload = "auto";
    resolvePopStartSec();
  }

  return popAudio;
}

function ensureDrumrollAudio() {
  if (!drumrollAudio) {
    drumrollAudio = new Audio(DRUMROLL_SRC);
    drumrollAudio.preload = "auto";
  }

  return drumrollAudio;
}

function drumrollStartSec() {
  const leadInSec = (PRESENT_REVEAL_MS * PRESENT_EXPLODE_PROGRESS) / 1000;
  return Math.max(0, DRUMROLL_CRASH_SEC - leadInSec);
}

function resolveAudioStartSec(src, onResolved, options = {}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    onResolved(null);
    return;
  }

  const ctx = new AudioContextClass();
  const absoluteThreshold = options.threshold ?? 0.02;
  const peakRatio = options.peakRatio ?? null;

  fetch(src)
    .then((response) => response.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      const samples = buffer.getChannelData(0);
      let threshold = absoluteThreshold;

      if (peakRatio !== null) {
        let peak = 0;

        for (let index = 0; index < samples.length; index += 1) {
          peak = Math.max(peak, Math.abs(samples[index]));
        }

        threshold = Math.max(absoluteThreshold, peak * peakRatio);
      }

      let startIndex = 0;

      for (let index = 0; index < samples.length; index += 1) {
        if (Math.abs(samples[index]) >= threshold) {
          startIndex = index;
          break;
        }
      }

      onResolved(Math.max(0, startIndex / buffer.sampleRate - 0.008));
      return ctx.close();
    })
    .catch(() => {
      onResolved(null);

      if (typeof ctx.close === "function") {
        ctx.close();
      }
    });
}

function resolveCoinTinkStartSec() {
  if (coinTinkStartResolved) {
    return;
  }

  resolveAudioStartSec(
    COIN_TINK_SRC,
    (startSec) => {
      if (startSec !== null) {
        coinTinkStartSec = startSec;
      }

      coinTinkStartResolved = true;
    },
    { peakRatio: COIN_TINK_PEAK_RATIO },
  );
}

function resolvePopStartSec() {
  if (popStartResolved) {
    return;
  }

  resolveAudioStartSec(POP_SRC, (startSec) => {
    if (startSec !== null) {
      popStartSec = startSec;
    }

    popStartResolved = true;
  });
}

function unlockAudio() {
  const sounds = [
    ensureChaChingAudio(),
    ensureCoinDropAudio(),
    ensureCoinTinkAudio(),
    ensureStretchAudio(),
    ensurePopAudio(),
    ensureDrumrollAudio(),
  ];

  for (const audio of sounds) {
    if (!audio.paused && !audio.ended) {
      continue;
    }

    const previousMuted = audio.muted;
    audio.muted = true;
    const playPromise = audio.play();

    if (!playPromise) {
      audio.muted = previousMuted;
      continue;
    }

    playPromise
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = previousMuted;
      });
  }
}

function stopPresentDrumroll() {
  if (presentDrumrollFadeRaf !== null) {
    cancelAnimationFrame(presentDrumrollFadeRaf);
    presentDrumrollFadeRaf = null;
  }

  if (!presentDrumrollInstance) {
    return;
  }

  presentDrumrollInstance.pause();
  presentDrumrollInstance.currentTime = 0;
  presentDrumrollInstance = null;
}

function fadeInPresentDrumroll(audio, durationMs) {
  if (presentDrumrollFadeRaf !== null) {
    cancelAnimationFrame(presentDrumrollFadeRaf);
    presentDrumrollFadeRaf = null;
  }

  audio.volume = 0;
  const startedAt = performance.now();

  const tickFade = (now) => {
    if (presentDrumrollInstance !== audio) {
      presentDrumrollFadeRaf = null;
      return;
    }

    const progress = clamp((now - startedAt) / Math.max(1, durationMs), 0, 1);
    audio.volume = progress * progress;

    if (progress < 1) {
      presentDrumrollFadeRaf = requestAnimationFrame(tickFade);
      return;
    }

    audio.volume = 1;
    presentDrumrollFadeRaf = null;
  };

  presentDrumrollFadeRaf = requestAnimationFrame(tickFade);
}

function playPresentDrumroll() {
  stopPresentDrumroll();

  const template = ensureDrumrollAudio();
  const audio = template.cloneNode();
  const startAt = Math.min(
    drumrollStartSec(),
    Number.isFinite(template.duration) && template.duration > 0
      ? Math.max(0, template.duration - 0.05)
      : drumrollStartSec(),
  );

  presentDrumrollInstance = audio;
  audio.volume = 0;

  const startPlayback = () => {
    if (presentDrumrollInstance !== audio) {
      return;
    }

    try {
      audio.currentTime = startAt;
    } catch {
      audio.currentTime = 0;
    }

    const playPromise = audio.play();

    if (!playPromise) {
      fadeInPresentDrumroll(audio, DRUMROLL_FADE_IN_MS);
      return;
    }

    playPromise
      .then(() => {
        if (presentDrumrollInstance === audio) {
          fadeInPresentDrumroll(audio, DRUMROLL_FADE_IN_MS);
        }
      })
      .catch(() => {
        if (presentDrumrollInstance === audio) {
          presentDrumrollInstance = null;
        }
      });
  };

  audio.addEventListener(
    "ended",
    () => {
      if (presentDrumrollInstance === audio) {
        presentDrumrollInstance = null;
      }
    },
    { once: true },
  );

  if (audio.readyState >= 1) {
    startPlayback();
    return;
  }

  audio.addEventListener("loadedmetadata", startPlayback, { once: true });
  audio.load();
}

function stopBankMitosisStretch() {
  if (!mitosisStretchInstance) {
    return;
  }

  mitosisStretchInstance.pause();
  mitosisStretchInstance.currentTime = 0;
  mitosisStretchInstance = null;
}

function startBankMitosisStretch() {
  stopBankMitosisStretch();
  const template = ensureStretchAudio();
  mitosisStretchInstance = template.cloneNode();
  mitosisStretchInstance.loop = true;
  mitosisStretchInstance.currentTime = 0;
  mitosisStretchInstance.play().catch(() => {});
}

function pauseBankMitosisStretch() {
  if (mitosisStretchInstance && !mitosisStretchInstance.paused) {
    mitosisStretchInstance.pause();
  }
}

function resumeBankMitosisStretch() {
  if (
    !mitosisStretchInstance ||
    !state?.bankSplitCompletesAt ||
    state.bankMitosisSeparated ||
    !mitosisStretchInstance.paused
  ) {
    return;
  }

  mitosisStretchInstance.play().catch(() => {});
}

function playBankMitosisPop() {
  const template = ensurePopAudio();
  const audio = template.cloneNode();
  const startAt = Math.min(
    popStartSec,
    Number.isFinite(template.duration) && template.duration > 0 ? Math.max(0, template.duration - 0.05) : popStartSec,
  );

  const startPlayback = () => {
    try {
      audio.currentTime = startAt;
    } catch {
      audio.currentTime = 0;
    }

    audio.play().catch(() => {});
  };

  if (audio.readyState >= 1) {
    startPlayback();
    return;
  }

  audio.addEventListener("loadedmetadata", startPlayback, { once: true });
  audio.load();
}

function countGrowingBankCoins(coins) {
  return coins.reduce((sum, coin) => {
    if (coin.treeSproutChildren) {
      return sum + coin.treeSproutChildren.length;
    }

    return sum + 1;
  }, 0);
}

function bankSplitProgress(timestamp, realTimestamp = timestamp) {
  if (state.bankSplitCompletesAt === null || state.bankSplitStartedAt === null) {
    return 0;
  }

  if (state.settings.staticMode && state.bankSplitRealStartedAt !== null && state.bankSplitRealCompletesAt !== null) {
    return clamp(
      (realTimestamp - state.bankSplitRealStartedAt) / (state.bankSplitRealCompletesAt - state.bankSplitRealStartedAt),
      0,
      1,
    );
  }

  return clamp((timestamp - state.bankSplitStartedAt) / (state.bankSplitCompletesAt - state.bankSplitStartedAt), 0, 1);
}

function triggerBankMitosisSeparation() {
  if (state.bankMitosisSeparated) {
    return;
  }

  state.bankMitosisSeparated = true;
  stopBankMitosisStretch();
  playBankMitosisPop();
  playChaChingStagger(state.bankMitosisGrownCount);
}

function updateBankMitosisAudio(timestamp, realTimestamp) {
  if (state.bankSplitCompletesAt === null || state.bankMitosisSeparated) {
    return;
  }

  if (bankSplitProgress(timestamp, realTimestamp) >= MITOSIS_SEPARATE_PROGRESS) {
    triggerBankMitosisSeparation();
  }
}

function playCoinDrop() {
  const template = ensureCoinDropAudio();
  const audio = template.cloneNode();
  const startAt = Math.min(
    COIN_DROP_START_SEC,
    Number.isFinite(template.duration) && template.duration > 0 ? Math.max(0, template.duration - 0.05) : COIN_DROP_START_SEC,
  );

  const startPlayback = () => {
    try {
      audio.currentTime = startAt;
    } catch {
      audio.currentTime = 0;
    }

    audio.play().catch(() => {});
  };

  if (audio.readyState >= 1) {
    startPlayback();
    return;
  }

  audio.addEventListener("loadedmetadata", startPlayback, { once: true });
  audio.load();
}

function playCoinTink() {
  const template = ensureCoinTinkAudio();
  const audio = template.cloneNode();
  const startAt = Math.min(
    coinTinkStartSec,
    Number.isFinite(template.duration) && template.duration > 0
      ? Math.max(0, template.duration - 0.05)
      : coinTinkStartSec,
  );

  const startPlayback = () => {
    try {
      audio.currentTime = startAt;
    } catch {
      audio.currentTime = 0;
    }

    audio.play().catch(() => {});
  };

  if (audio.readyState >= 1) {
    startPlayback();
    return;
  }

  audio.addEventListener("loadedmetadata", startPlayback, { once: true });
  audio.load();
}

function playChaChingSound() {
  const template = ensureChaChingAudio();
  const audio = template.cloneNode();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playChaChingStagger(count) {
  const plays = Math.max(0, Math.floor(count));

  for (let index = 0; index < plays; index += 1) {
    window.setTimeout(() => playChaChingSound(), index * CHA_CHING_STAGGER_MS);
  }

  if (plays > 0 && state) {
    const lastStartAt = performance.now() + (plays - 1) * CHA_CHING_STAGGER_MS;
    state.bankChaChingBlocksUntil = lastStartAt + BANK_CHACHING_TAIL_MS;
  }
}

function playChaChing(onDropCue) {
  const template = ensureChaChingAudio();
  const audio = template.cloneNode();
  let cued = false;

  const cueDrop = () => {
    if (cued) {
      return;
    }

    cued = true;

    if (typeof onDropCue === "function") {
      onDropCue();
    }
  };

  const fallbackDropMs = CHA_CHING_FALLBACK_MS * 0.5;

  audio.addEventListener("error", cueDrop, { once: true });
  audio.currentTime = 0;

  const playPromise = audio.play();

  if (!playPromise) {
    cueDrop();
    return;
  }

  playPromise
    .then(() => {
      const durationMs =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration * 1000
          : Number.isFinite(template.duration) && template.duration > 0
            ? template.duration * 1000
            : CHA_CHING_FALLBACK_MS;

      // Start the fall after the "cha-ching" hit, during the ring-out.
      window.setTimeout(cueDrop, Math.max(0, durationMs * 0.5 - 300));
    })
    .catch(cueDrop);

  window.setTimeout(cueDrop, Math.max(0, fallbackDropMs - 300));
}

function createRobotCoin(timestamp) {
  const coin = createCoin("robot", timestamp);
  coin.remainingMs = depreciationMs();
  state.robotStack.push(coin.id);
  return coin;
}

function createBankCoin(timestamp, particle = null, treeNode = null) {
  const coin = createCoin("bank", timestamp);
  coin.particle = particle;

  if (treeNode) {
    Object.assign(coin, treeNode);
  }

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

function baseRobotCoinSize() {
  return clamp(Math.min(window.innerWidth * 0.07, window.innerHeight * 0.042), 16, 30);
}

function robotBodyWidth() {
  return clamp(Math.min(window.innerWidth * 0.26, window.innerHeight * 0.17), 68, 112);
}

function robotHeadFontSize() {
  return robotBodyWidth() * 0.78;
}

function robotNeckWidth() {
  return clamp(robotBodyWidth() * 0.26, 18, 30);
}

function robotNeckHeight() {
  return clamp(window.innerHeight * 0.012, 7, 12);
}

function robotBodyPadding() {
  return clamp(window.innerHeight * 0.007, 4, 6);
}

function robotStackGap() {
  return clamp(window.innerHeight * 0.0045, 1, 3);
}

function robotStackCapacity() {
  return Math.max(1, state?.settings.feedrate ?? DEFAULT_SETTINGS.feedrate);
}

function robotAvailableStackHeight() {
  if (!dom.robot?.clientHeight) {
    return Infinity;
  }

  const robotBottomPadding = clamp(window.innerHeight * 0.01, 6, 14);
  const bodyBorderHeight = 6;

  return Math.max(
    0,
    dom.robot.clientHeight - robotBodyWidth() - robotNeckHeight() - robotBodyPadding() * 2 - bodyBorderHeight - robotBottomPadding,
  );
}

function robotCoinSize() {
  const baseSize = baseRobotCoinSize();
  const capacity = robotStackCapacity();
  const totalGaps = robotStackGap() * Math.max(0, capacity - 1);
  const maxSizeForCapacity = (robotAvailableStackHeight() - totalGaps) / capacity;

  if (!Number.isFinite(maxSizeForCapacity) || maxSizeForCapacity <= 0) {
    return baseSize;
  }

  return clamp(Math.min(baseSize, maxSizeForCapacity), 10, baseSize);
}

function robotStackHeight() {
  const capacity = robotStackCapacity();

  return robotCoinSize() * capacity + robotStackGap() * Math.max(0, capacity - 1);
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
  const width = Math.max(radius * 2 + 2, element.clientWidth || radius * 4);
  const height = Math.max(radius * 2 + 2, element.clientHeight || radius * 4);
  const inset =
    location === "bank" && !isTreeBankTheme() && bankBrickMetrics
      ? bankBrickMetrics
      : { left: 0, right: 0, top: 0, bottom: 0 };

  return {
    element,
    radius,
    width,
    height,
    minX: inset.left + radius,
    maxX: Math.max(inset.left + radius, width - inset.right - radius),
    minY: inset.top + radius,
    maxY: Math.max(inset.top + radius, height - inset.bottom - radius),
  };
}

function ensureParticle(coin, location) {
  const area = particleArea(location);

  if (!coin.particle) {
    coin.particle = {
      x: randomBetween(area.minX, area.maxX),
      y: randomBetween(area.minY, area.maxY),
      ...randomVelocity(),
    };
  }

  keepParticleInBounds(coin.particle, area);
  return coin.particle;
}

function keepParticleInBounds(particle, area) {
  const minX = area.minX ?? area.radius;
  const maxX = area.maxX ?? area.width - area.radius;
  const minY = area.minY ?? area.radius;
  const maxY = area.maxY ?? area.height - area.radius;

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

function hasActiveBankSplit(coin) {
  return Boolean(coin.splitChildParticle || coin.treeSproutChildren);
}

function clearBankSplit(coin) {
  coin.nextSplitAt = null;
  coin.splitStartedAt = null;
  coin.splitCompletesAt = null;
  coin.splitChildParticle = null;
  coin.treeSproutChildren = null;
}

function cancelBankSplit(coin) {
  if (coin.treeSproutChildren) {
    for (const childNode of coin.treeSproutChildren) {
      removeTreeBranch(childNode.treeBranchId);
    }
  }

  clearBankSplit(coin);
}

function particleItemsFor(location) {
  const coins = state.coins.filter((coin) => coin.location === location && drag?.id !== coin.id);
  const items = [];
  const area = particleArea(location);

  for (const coin of coins) {
    if (isPurseCoinDropping(coin)) {
      continue;
    }

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
  const presentAnimationActive = hasActivePresentReveal(timestamp);
  const pausePurseDrops = presentAnimationActive || hasActiveBankAnimation();

  updatePurseDrops(dt, timestamp, pausePurseDrops);
  updateParticleGroup("purse", dt, timestamp, gameNow());

  if (!isTreeBankTheme() && !presentAnimationActive) {
    updateParticleGroup("bank", dt, timestamp, bankSplitTimestamp);
  }
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

function clearPresentReveals() {
  stopPresentDrumroll();
  document.querySelectorAll(".present-reveal").forEach((element) => element.remove());
}

function newGame(settings = state?.settings ?? DEFAULT_SETTINGS) {
  const timestamp = performance.now();
  const emojis = shuffle(EMOJIS);
  const effectiveSettings = {
    ...settings,
    bankTheme: BANK_THEME_VALUES.has(settings.bankTheme) ? settings.bankTheme : DEFAULT_SETTINGS.bankTheme,
    payrate: settings.staticMode ? 1 : settings.payrate,
  };

  state = {
    settings: effectiveSettings,
    coins: [],
    nextCoinId: 1,
    nextTreeId: 1,
    nextTreeBranchId: 1,
    treeRoots: [],
    treeBranches: [],
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
    bankRevealPauseLastAt: null,
    bankMitosisSeparated: false,
    bankMitosisGrownCount: 0,
    bankChaChingBlocksUntil: null,
    purseAnimationPauseLastAt: null,
    pendingPurseDrop: null,
    robotStack: [],
    robotLastTick: timestamp,
    robotPauseBudgetMs: 0,
    lastParticleTick: null,
    status: "ready",
    resultReason: null,
    message: "Feed the robot first, then invest coins so they can make more coins.",
    presents: Array.from({ length: settings.presents }, (_, index) => ({
      emoji: emojis[index % emojis.length],
      opened: false,
      revealEndsAt: null,
    })),
    openedCount: 0,
  };

  clearPresentReveals();
  stopBankMitosisStretch();

  for (let count = 0; count < settings.start; count += 1) {
    createRobotCoin(timestamp);
  }

  renderPurseReserve();
  render(timestamp);
}

function beginPlay() {
  if (!state || state.status !== "ready") {
    return;
  }

  const timestamp = performance.now();

  state.status = "playing";
  state.gameTime = timestamp;
  state.lastClockTick = null;
  state.robotLastTick = timestamp;
  state.nextPayAt = timestamp + payrateMs();
  state.bankCycleStartedAt = timestamp;
  state.bankNextSplitAt = timestamp + interestMs();
  state.lastParticleTick = null;

  unlockAudio();
  queuePurseCoinDrop(timestamp);
  render(timestamp);
}

function setMessage(message) {
  state.message = message;
}

function bankCoinCount() {
  return state.coins.filter((coin) => coin.location === "bank").length;
}

function endGame(status, reason) {
  if (state.status !== "playing") {
    return;
  }

  state.status = status;
  state.resultReason = reason;
  state.message = resultMessageForState().message;
}

function processIncome(timestamp) {
  if (state.wageCoinsIssued >= state.settings.lifetime) {
    state.nextPayAt = null;
    return;
  }

  if (
    timestamp < state.nextPayAt ||
    hasActivePresentReveal() ||
    hasActiveBankAnimation() ||
    hasActivePurseDrop()
  ) {
    return;
  }

  queuePurseCoinDrop(timestamp);
  state.nextPayAt = timestamp + payrateMs();
  setMessage("A new wage coin dropped into the purse.");
}

function hasActivePurseDrop() {
  return Boolean(state.pendingPurseDrop) || state.coins.some((coin) => isPurseCoinDropping(coin));
}

function pausePurseAnimations(realTimestamp) {
  if (state.purseAnimationPauseLastAt === null) {
    state.purseAnimationPauseLastAt = realTimestamp;
    return;
  }

  const pauseDelta = Math.max(0, realTimestamp - state.purseAnimationPauseLastAt);
  state.purseAnimationPauseLastAt = realTimestamp;

  for (const coin of state.coins) {
    if (!isPurseCoinDropping(coin)) {
      continue;
    }

    if (coin.dropStartedAt !== null) {
      coin.dropStartedAt += pauseDelta;
    }

    if (coin.dropSquashUntil !== null) {
      coin.dropSquashUntil += pauseDelta;
    }

    coin.expiresAt += pauseDelta;
  }
}

function processPurse(timestamp, realTimestamp = performance.now()) {
  if (hasActivePresentReveal(realTimestamp) || hasActiveBankAnimation()) {
    pausePurseAnimations(realTimestamp);
  } else {
    state.purseAnimationPauseLastAt = null;
  }

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
      endGame("lost", "starved");
      return;
    }

    bottomCoin.remainingMs -= elapsed;

    if (bottomCoin.remainingMs > 0) {
      return;
    }

    elapsed = Math.abs(bottomCoin.remainingMs);
    removeCoin(bottomCoin.id);

    if (state.robotStack.length === 0) {
      endGame("lost", "starved");
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
  if (isTreeBankTheme()) {
    clearBankSplit(coin);
    coin.splitStartedAt = timestamp;
    coin.splitCompletesAt = timestamp + BANK_SPLIT_ANIMATION_MS;
    coin.treeSproutChildren = nextTreeChildNodes(coin, timestamp);
    return;
  }

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

function splitSeparationProgress(progress) {
  const t = clamp(progress, 0, 1);
  // Stay overlapped longer, then stretch and snap apart.
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function splitDeform(progress) {
  const t = clamp(progress, 0, 1);
  const bulge = Math.sin(Math.min(t, 0.92) * Math.PI);
  const pinch = clamp((t - 0.55) / 0.35, 0, 1);

  return {
    along: 1 + bulge * 0.34 - pinch * 0.06,
    across: 1 - bulge * 0.22 + pinch * 0.04,
  };
}

function splitBridgeThickness(progress, radius) {
  const t = clamp(progress, 0, 1);
  const pinch = clamp((t - 0.38) / 0.5, 0, 1);
  const waist = Math.pow(1 - pinch, 1.65);

  return radius * 1.9 * waist;
}

function pushSplitChildFromParent(coin, dt, timestamp) {
  if (!coin.splitChildParticle || !coin.particle) {
    return;
  }

  const child = coin.splitChildParticle;
  const parent = coin.particle;
  const progress = splitProgress(coin, timestamp);
  const radius = particleRadius("bank");
  const targetDistance = radius * 2.55 * splitSeparationProgress(progress);
  const targetX = parent.x + Math.cos(coin.splitAngle) * targetDistance;
  const targetY = parent.y + Math.sin(coin.splitAngle) * targetDistance;
  const pullX = targetX - child.x;
  const pullY = targetY - child.y;
  const spring = 11 * dt;

  child.vx += pullX * spring;
  child.vy += pullY * spring;
  parent.vx -= pullX * spring * 0.04;
  parent.vy -= pullY * spring * 0.04;
}

function completeSplit(coin, timestamp) {
  if (coin.treeSproutChildren) {
    const childNodes = coin.treeSproutChildren;

    for (const childNode of childNodes) {
      finishTreeBranch(childNode.treeBranchId);
      createBankCoin(timestamp, null, childNode);
    }

    removeCoin(coin.id);
    return;
  }

  const childParticle = {
    ...coin.splitChildParticle,
  };

  createBankCoin(timestamp, childParticle);
  clearBankSplit(coin);
}

function shiftTreeBranchTiming(branchId, delta) {
  const branch = state.treeBranches.find((item) => item.id === branchId);

  if (!branch || branch.complete) {
    return;
  }

  branch.startedAt += delta;
  branch.completesAt += delta;
}

function shiftActiveBankSplitTiming(gameDelta, realDelta) {
  if (state.bankSplitCompletesAt === null) {
    return;
  }

  const usesRealSplitTime = state.settings.staticMode && state.bankSplitRealStartedAt !== null;
  const splitDelta = usesRealSplitTime ? realDelta : gameDelta;

  state.bankSplitStartedAt += gameDelta;
  state.bankSplitCompletesAt += gameDelta;

  if (usesRealSplitTime) {
    state.bankSplitRealStartedAt += realDelta;
    state.bankSplitRealCompletesAt += realDelta;
  }

  for (const coin of state.coins) {
    if (coin.location !== "bank" || !hasActiveBankSplit(coin)) {
      continue;
    }

    coin.splitStartedAt += splitDelta;
    coin.splitCompletesAt += splitDelta;

    if (coin.treeSproutChildren) {
      for (const childNode of coin.treeSproutChildren) {
        shiftTreeBranchTiming(childNode.treeBranchId, splitDelta);
      }
    }
  }
}

function pauseBankForPresentReveal(timestamp, realTimestamp) {
  if (state.bankRevealPauseLastAt === null) {
    state.bankRevealPauseLastAt = {
      game: timestamp,
      real: realTimestamp,
    };
    return;
  }

  const gameDelta = Math.max(0, timestamp - state.bankRevealPauseLastAt.game);
  const realDelta = Math.max(0, realTimestamp - state.bankRevealPauseLastAt.real);

  state.bankRevealPauseLastAt = {
    game: timestamp,
    real: realTimestamp,
  };

  shiftActiveBankSplitTiming(gameDelta, realDelta);
}

function processBank(timestamp, realTimestamp = timestamp) {
  if (hasActivePresentReveal(realTimestamp)) {
    pauseBankMitosisStretch();
    pauseBankForPresentReveal(timestamp, realTimestamp);
    return;
  }

  state.bankRevealPauseLastAt = null;
  resumeBankMitosisStretch();

  if (state.bankSplitCompletesAt !== null) {
    updateBankMitosisAudio(timestamp, realTimestamp);

    const splitComplete = state.settings.staticMode
      ? realTimestamp >= state.bankSplitRealCompletesAt
      : timestamp >= state.bankSplitCompletesAt;

    if (!splitComplete) {
      return;
    }

    const splittingCoins = state.coins.filter((coin) => coin.location === "bank" && hasActiveBankSplit(coin));

    if (splittingCoins.some((coin) => drag?.id === coin.id)) {
      return;
    }

    if (!state.bankMitosisSeparated) {
      state.bankMitosisGrownCount = countGrowingBankCoins(splittingCoins);
      triggerBankMitosisSeparation();
    }

    for (const coin of splittingCoins) {
      completeSplit(coin, timestamp);
    }

    state.bankSplitStartedAt = null;
    state.bankSplitCompletesAt = null;
    state.bankSplitRealStartedAt = null;
    state.bankSplitRealCompletesAt = null;
    state.bankMitosisSeparated = false;
    state.bankMitosisGrownCount = 0;
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
  state.bankMitosisSeparated = false;

  for (const coin of coinsToSplit) {
    beginSplit(coin, state.settings.staticMode ? realTimestamp : timestamp);
  }

  state.bankMitosisGrownCount = countGrowingBankCoins(
    state.coins.filter((coin) => coin.location === "bank" && hasActiveBankSplit(coin)),
  );
  startBankMitosisStretch();
  setMessage(`${coinsToSplit.length} bank coin${coinsToSplit.length === 1 ? " is" : "s are"} splitting.`);
}

function hasActiveBankAnimation(realTimestamp = performance.now()) {
  return (
    state.bankSplitCompletesAt !== null ||
    (state.bankChaChingBlocksUntil !== null && realTimestamp < state.bankChaChingBlocksUntil)
  );
}

function checkWinOrLoss() {
  if (state.openedCount === state.presents.length) {
    endGame("won", "presents");
    return;
  }

  const spendableCoins = state.coins.filter((coin) => coin.location === "purse" || coin.location === "bank");

  if (
    state.wageCoinsIssued >= state.settings.lifetime &&
    spendableCoins.length === 0 &&
    state.openedCount < state.presents.length
  ) {
    endGame("lost", "money");
  }
}

function tick(timestamp) {
  const gameTimestamp = advanceGameClock(timestamp);

  if (state.status === "playing") {
    processBank(gameTimestamp, timestamp);
    processPurse(gameTimestamp, timestamp);
    processIncome(gameTimestamp);
    processRobot(gameTimestamp);
    checkWinOrLoss();
  }

  updateParticlePhysics(timestamp);
  render(gameTimestamp);
  requestAnimationFrame(tick);
}

function bankSplitRenderTimestamp(timestamp) {
  return state.settings.staticMode && state.bankSplitRealStartedAt !== null ? performance.now() : timestamp;
}

function createCoinElement(coin, timestamp, location) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `coin coin--${location}${location === "bank" && isTreeBankTheme() ? " coin--tree" : ""}`;
  element.dataset.coinId = String(coin.id);
  element.setAttribute("aria-label", `${location} coin`);

  if (location === "bank" && isTreeBankTheme()) {
    element.style.setProperty("--x", `${coin.treeX ?? 50}%`);
    element.style.setProperty("--y", `${coin.treeY ?? 50}%`);
  } else if (location === "purse" || location === "bank") {
    const particle = ensureParticle(coin, location);

    if (location === "purse" && isPurseCoinDropping(coin)) {
      const squash = purseDropSquash(coin);
      element.classList.add("is-dropping");
      element.style.setProperty("--x", `${particle.x}px`);
      element.style.setProperty("--y", `${particle.y}px`);
      element.style.setProperty("--drop-sx", squash.x.toFixed(3));
      element.style.setProperty("--drop-sy", squash.y.toFixed(3));
    } else {
      element.style.setProperty("--x", `${particle.x}px`);
      element.style.setProperty("--y", `${particle.y}px`);
    }
  }

  if (drag?.id === coin.id) {
    element.classList.add("is-source");
  }

  if (location === "purse") {
    const remaining = (coin.expiresAt - timestamp) / depreciationMs();
    const endScale = clamp(remaining, 0.18, 1);
    const scale = purseDropScale(coin, endScale);
    element.style.setProperty("--scale", scale.toFixed(2));
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
      const splitTimestamp = bankSplitRenderTimestamp(timestamp);
      const progress = splitProgress(coin, splitTimestamp);
      element.classList.add(isTreeBankTheme() ? "is-sprouting" : "is-splitting");

      if (isTreeBankTheme()) {
        element.style.setProperty("--scale", (treeCoinScale(coin.treeDepth) * (1 - progress)).toFixed(2));
      } else {
        const deform = splitDeform(progress);
        element.style.setProperty("--split-angle", `${coin.splitAngle}rad`);
        element.style.setProperty("--split-along", deform.along.toFixed(3));
        element.style.setProperty("--split-across", deform.across.toFixed(3));
      }

      element.title =
        splitTimestamp < coin.splitCompletesAt
          ? isTreeBankTheme()
            ? `Blooming for ${formatSeconds(coin.splitCompletesAt - splitTimestamp)}`
            : `Splitting for ${formatSeconds(coin.splitCompletesAt - splitTimestamp)}`
          : isTreeBankTheme()
            ? "Blooming"
            : "Separating";
    } else {
      if (isTreeBankTheme()) {
        element.style.setProperty("--scale", treeCoinScale(coin.treeDepth).toFixed(2));
      }

      element.title = isTreeBankTheme()
        ? `Money tree blooms in ${formatSeconds(state.bankNextSplitAt - timestamp)}`
        : `Bank splits in ${formatSeconds(state.bankNextSplitAt - timestamp)}`;
    }
  }

  return element;
}

function createTreeBranchElement(fromX, fromY, toX, toY, depth = 0, progress = 1) {
  const width = dom.bankCoins.clientWidth || 1;
  const height = dom.bankCoins.clientHeight || 1;
  const dx = ((toX - fromX) / 100) * width;
  const dy = ((toY - fromY) / 100) * height;
  const element = document.createElement("span");

  element.className = "tree-branch";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--from-x", `${fromX}%`);
  element.style.setProperty("--from-y", `${fromY}%`);
  element.style.setProperty("--branch-length", `${Math.hypot(dx, dy)}px`);
  element.style.setProperty("--branch-angle", `${Math.atan2(dy, dx)}rad`);
  element.style.setProperty("--branch-width", `${treeBranchWidth(depth)}px`);
  element.style.setProperty("--progress", clamp(progress, 0, 1).toFixed(3));

  return element;
}

function createTreeBloomCoinElement(childNode, progress) {
  const element = document.createElement("span");
  const scale = treeCoinScale(childNode.treeDepth) * clamp(progress, 0, 1);

  element.className = "coin coin--bank coin--tree tree-bloom-coin";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--x", `${childNode.treeX}%`);
  element.style.setProperty("--y", `${childNode.treeY}%`);
  element.style.setProperty("--scale", scale.toFixed(2));

  return element;
}

function createTreeBaseElement(root) {
  const element = document.createElement("span");

  element.className = "tree-base";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--x", `${root.x}%`);
  element.style.setProperty("--y", `${root.y}%`);

  return element;
}

function treeBranchProgress(branch, timestamp) {
  if (branch.complete || branch.completesAt === null || branch.startedAt === null) {
    return 1;
  }

  return clamp((timestamp - branch.startedAt) / (branch.completesAt - branch.startedAt), 0, 1);
}

function createSplitChildElement(coin, timestamp) {
  if (!coin.splitChildParticle || drag?.id === coin.id) {
    return null;
  }

  const progress = splitProgress(coin, bankSplitRenderTimestamp(timestamp));
  const deform = splitDeform(progress);
  const grow = 0.7 + 0.3 * clamp(progress / 0.42, 0, 1);
  const element = document.createElement("span");
  element.className = "coin coin--bank split-child-particle is-splitting-child";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--x", `${coin.splitChildParticle.x}px`);
  element.style.setProperty("--y", `${coin.splitChildParticle.y}px`);
  element.style.setProperty("--scale", grow.toFixed(3));
  element.style.setProperty("--split-angle", `${coin.splitAngle}rad`);
  element.style.setProperty("--split-along", deform.along.toFixed(3));
  element.style.setProperty("--split-across", deform.across.toFixed(3));
  return element;
}

function createSplitBridgeElement(coin, timestamp) {
  if (!coin.splitChildParticle || !coin.particle || drag?.id === coin.id) {
    return null;
  }

  const progress = splitProgress(coin, bankSplitRenderTimestamp(timestamp));
  const parent = coin.particle;
  const child = coin.splitChildParticle;
  const dx = child.x - parent.x;
  const dy = child.y - parent.y;
  const distance = Math.hypot(dx, dy);
  const radius = particleRadius("bank");
  const thickness = splitBridgeThickness(progress, radius);

  if (distance < radius * 0.2 || thickness < 1.5 || progress > 0.97) {
    return null;
  }

  const fade = 1 - clamp((progress - 0.78) / 0.19, 0, 1);
  const waist = clamp(thickness / (radius * 1.9), 0, 1);
  const element = document.createElement("span");
  element.className = "split-goo-bridge";
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("--x", `${(parent.x + child.x) / 2}px`);
  element.style.setProperty("--y", `${(parent.y + child.y) / 2}px`);
  element.style.setProperty("--length", `${Math.max(distance, thickness)}px`);
  element.style.setProperty("--thickness", `${thickness}px`);
  element.style.setProperty("--angle", `${Math.atan2(dy, dx)}rad`);
  element.style.setProperty("--waist", waist.toFixed(3));
  element.style.setProperty("--goo-fade", fade.toFixed(3));
  return element;
}

function renderTreeBankCoins(fragment, bankCoins, timestamp) {
  const bases = document.createDocumentFragment();
  const branches = document.createDocumentFragment();
  const bloomCoins = document.createDocumentFragment();
  const coins = document.createDocumentFragment();
  const splitTimestamp = bankSplitRenderTimestamp(timestamp);

  for (const root of state.treeRoots) {
    bases.append(createTreeBaseElement(root));
  }

  for (const branch of state.treeBranches) {
    branches.append(
      createTreeBranchElement(
        branch.fromX,
        branch.fromY,
        branch.toX,
        branch.toY,
        branch.depth,
        treeBranchProgress(branch, splitTimestamp),
      ),
    );
  }

  for (const coin of bankCoins) {
    if (coin.treeSproutChildren) {
      const progress = splitProgress(coin, splitTimestamp);

      for (const childNode of coin.treeSproutChildren) {
        bloomCoins.append(createTreeBloomCoinElement(childNode, progress));
      }
    }

    coins.append(createCoinElement(coin, timestamp, "bank"));
  }

  fragment.append(bases, branches, bloomCoins, coins);
}

function renderPurseReserve() {
  const remaining = Math.max(0, state.settings.lifetime - state.wageCoinsIssued);
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < remaining; index += 1) {
    const element = document.createElement("span");
    element.className = "purse-reserve-coin";
    element.setAttribute("aria-hidden", "true");
    fragment.append(element);
  }

  dom.purseReserve.replaceChildren(fragment);
  dom.purseReserve.setAttribute(
    "aria-label",
    `${remaining} wage coin${remaining === 1 ? "" : "s"} remaining`,
  );
}

function renderCoins(timestamp) {
  const purseFragment = document.createDocumentFragment();
  const bankFragment = document.createDocumentFragment();
  const robotFragment = document.createDocumentFragment();
  let robotOffset = 0;
  const bankCoins = [];

  for (const coin of state.coins) {
    if (coin.location === "purse") {
      purseFragment.append(createCoinElement(coin, timestamp, "purse"));
    } else if (coin.location === "bank") {
      bankCoins.push(coin);
    }
  }

  if (isTreeBankTheme()) {
    renderTreeBankCoins(bankFragment, bankCoins, timestamp);
  } else {
    for (const coin of bankCoins) {
      const splitBridge = createSplitBridgeElement(coin, timestamp);
      const splitChild = createSplitChildElement(coin, timestamp);

      if (splitBridge) {
        bankFragment.append(splitBridge);
      }

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

function renderRobotSizing() {
  dom.robot.style.setProperty("--robot-body-width", `${robotBodyWidth()}px`);
  dom.robot.style.setProperty("--robot-head-font-size", `${robotHeadFontSize()}px`);
  dom.robot.style.setProperty("--robot-neck-width", `${robotNeckWidth()}px`);
  dom.robot.style.setProperty("--robot-neck-height", `${robotNeckHeight()}px`);
  dom.robot.style.setProperty("--robot-coin-size", `${robotCoinSize()}px`);
  dom.robot.style.setProperty("--robot-stack-gap", `${robotStackGap()}px`);
  dom.robot.style.setProperty("--robot-stack-height", `${robotStackHeight()}px`);
}

function renderPresents() {
  const fragment = document.createDocumentFragment();
  const timestamp = performance.now();

  state.presents.forEach((present, index) => {
    const isRevealing = present.opened && present.revealEndsAt !== null && timestamp < present.revealEndsAt;
    const element = document.createElement("button");
    element.type = "button";
    element.className = `present${present.opened ? " is-open" : ""}${isRevealing ? " is-revealing" : ""}`;
    element.dataset.presentIndex = String(index);
    element.setAttribute(
      "aria-label",
      isRevealing
        ? `Opening present with ${present.emoji}`
        : present.opened
          ? `Opened present with ${present.emoji}`
          : "Wrapped present",
    );
    element.textContent = present.opened ? (isRevealing ? "" : present.emoji) : "🎁";
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

let bankBrickLayoutKey = "";
let bankBrickMetrics = null;

function createBrickElement(x, y, width, height) {
  const brick = document.createElement("div");
  brick.className = "brick";
  brick.style.left = `${x}px`;
  brick.style.top = `${y}px`;
  brick.style.width = `${width}px`;
  brick.style.height = `${height}px`;
  return brick;
}

function layoutBankBricks() {
  if (!dom.bankBricks || !dom.bankWall) {
    return;
  }

  if (isTreeBankTheme()) {
    if (bankBrickLayoutKey !== "tree") {
      bankBrickLayoutKey = "tree";
      bankBrickMetrics = null;
      dom.bankBricks.replaceChildren();
    }
    return;
  }

  const width = dom.bankWall.clientWidth;
  const height = dom.bankWall.clientHeight;
  const layoutKey = `${width}x${height}`;

  if (layoutKey === bankBrickLayoutKey) {
    return;
  }

  bankBrickLayoutKey = layoutKey;

  if (width < 8 || height < 8) {
    bankBrickMetrics = null;
    dom.bankBricks.replaceChildren();
    return;
  }

  const brickHeight = Math.max(8, Math.min(12, Math.round(height / 28)));
  const brickWidth = Math.round(brickHeight * 2.1);
  const gap = 2;
  const stepX = brickWidth + gap;
  const stepY = brickHeight + gap;
  const fragment = document.createDocumentFragment();

  bankBrickMetrics = {
    left: brickWidth,
    right: brickWidth,
    top: brickHeight,
    bottom: brickHeight,
  };

  const across = Math.max(1, Math.floor((width + gap) / stepX));
  const usedWidth = across * brickWidth + (across - 1) * gap;
  const offsetX = Math.max(0, (width - usedWidth) / 2);

  for (let i = 0; i < across; i += 1) {
    const x = offsetX + i * stepX;
    fragment.append(createBrickElement(x, 0, brickWidth, brickHeight));
    fragment.append(createBrickElement(x, height - brickHeight, brickWidth, brickHeight));
  }

  const down = Math.max(0, Math.floor((height - 2 * stepY + gap) / stepY));
  const usedHeight = down * brickHeight + Math.max(0, down - 1) * gap;
  const offsetY = stepY + Math.max(0, (height - 2 * stepY - usedHeight) / 2);

  for (let i = 0; i < down; i += 1) {
    const y = offsetY + i * stepY;
    fragment.append(createBrickElement(0, y, brickWidth, brickHeight));
    fragment.append(createBrickElement(width - brickWidth, y, brickWidth, brickHeight));
  }

  dom.bankBricks.replaceChildren(fragment);
}

function renderBankTheme() {
  const isTree = isTreeBankTheme();

  dom.bankZone.classList.toggle("is-theme-tree", isTree);
  dom.bankCoins.classList.toggle("coin-tray--tree", isTree);
  layoutBankBricks();
}

function renderStartOverlay() {
  const showStart = state.status === "ready";
  dom.startOverlay.hidden = !showStart;
}

function resultMessageForState() {
  if (state.status === "won") {
    const bankTotal = bankCoinCount();

    return {
      kicker: "All presents opened",
      title: "Well Done!",
      message: `You opened all the presents and have $${bankTotal} in the bank.`,
      detail: "You kept the robot fed while your invested coins made more coins.",
    };
  }

  if (state.resultReason === "money") {
    return {
      kicker: "Out of money",
      title: "Game Over",
      message: "You ran out of money.",
      detail: "All lifetime wage coins are gone and there are no spendable coins left.",
    };
  }

  return {
    kicker: "Robot starved",
    title: "Game Over",
    message: "The robot starved.",
    detail: "Keep coins stacked in his tummy so he does not run out of food.",
  };
}

function hasActivePresentReveal(timestamp = performance.now()) {
  return (
    state.presents.some((present) => present.revealEndsAt !== null && timestamp < present.revealEndsAt) ||
    document.querySelector(".present-reveal") !== null
  );
}

function renderResultOverlay() {
  if (state.status === "playing" || state.status === "ready" || hasActivePresentReveal()) {
    dom.resultOverlay.hidden = true;

    if (state.status === "playing" || state.status === "ready") {
      dom.resultCard.classList.remove("is-lost", "is-won");
    }

    return;
  }

  const result = resultMessageForState();

  dom.resultCard.classList.toggle("is-lost", state.status === "lost");
  dom.resultCard.classList.toggle("is-won", state.status === "won");
  dom.resultKicker.textContent = result.kicker;
  dom.resultTitle.textContent = result.title;
  dom.resultMessage.textContent = result.message;
  dom.resultDetail.textContent = result.detail;
  dom.resultOverlay.hidden = false;
}

function render(timestamp = performance.now()) {
  renderBankTheme();
  renderStats(timestamp);
  renderPresents();
  renderRobotSizing();
  renderPurseReserve();
  renderCoins(timestamp);
  renderStartOverlay();
  renderResultOverlay();
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
  if (isTreeBankTheme() && coin.location === "bank" && hasActiveBankSplit(coin)) {
    cancelBankSplit(coin);
    setMessage("Picked coin stopped blooming on that branch.");

    if (!state.coins.some((bankCoin) => bankCoin.location === "bank" && hasActiveBankSplit(bankCoin))) {
      const timestamp = gameNow();
      state.bankSplitStartedAt = null;
      state.bankSplitCompletesAt = null;
      state.bankSplitRealStartedAt = null;
      state.bankSplitRealCompletesAt = null;
      state.bankCycleStartedAt = timestamp;
      state.bankNextSplitAt = timestamp + interestMs();
    }
  }

  const ghost = document.createElement("div");
  ghost.className = "coin coin-ghost";
  ghost.setAttribute("aria-hidden", "true");

  if (coin.splitChildParticle && coin.particle) {
    const dx = coin.splitChildParticle.x - coin.particle.x;
    const dy = coin.splitChildParticle.y - coin.particle.y;
    const distance = Math.hypot(dx, dy);
    const radius = particleRadius("bank");
    const progress =
      coin.splitCompletesAt !== null && coin.splitStartedAt !== null
        ? splitProgress(coin, bankSplitRenderTimestamp(gameNow()))
        : 1;
    const thickness = splitBridgeThickness(progress, radius);
    const deform = splitDeform(progress);

    ghost.classList.add("is-splitting");
    ghost.style.setProperty("--split-angle", `${coin.splitAngle}rad`);
    ghost.style.setProperty("--split-along", deform.along.toFixed(3));
    ghost.style.setProperty("--split-across", deform.across.toFixed(3));

    if (distance >= radius * 0.2 && thickness >= 1.5 && progress <= 0.97) {
      const bridge = document.createElement("span");
      const fade = 1 - clamp((progress - 0.78) / 0.19, 0, 1);
      const waist = clamp(thickness / (radius * 1.9), 0, 1);
      bridge.className = "split-goo-bridge drag-split-bridge";
      bridge.style.setProperty("--drag-child-x", `${dx / 2}px`);
      bridge.style.setProperty("--drag-child-y", `${dy / 2}px`);
      bridge.style.setProperty("--length", `${Math.max(distance, thickness)}px`);
      bridge.style.setProperty("--thickness", `${thickness}px`);
      bridge.style.setProperty("--angle", `${Math.atan2(dy, dx)}rad`);
      bridge.style.setProperty("--waist", waist.toFixed(3));
      bridge.style.setProperty("--goo-fade", fade.toFixed(3));
      ghost.append(bridge);
    }

    const child = document.createElement("span");
    const grow = 0.7 + 0.3 * clamp(progress / 0.42, 0, 1);
    child.className = "coin drag-split-child is-splitting-child";
    child.style.setProperty("--drag-child-x", `${dx}px`);
    child.style.setProperty("--drag-child-y", `${dy}px`);
    child.style.setProperty("--scale", grow.toFixed(3));
    child.style.setProperty("--split-angle", `${coin.splitAngle}rad`);
    child.style.setProperty("--split-along", deform.along.toFixed(3));
    child.style.setProperty("--split-across", deform.across.toFixed(3));
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
    return openPresent(coin, Number(presentElement.dataset.presentIndex), presentElement);
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
  cancelBankSplit(coin);
  coin.particle = null;
  coin.remainingMs = depreciationMs();
  state.robotStack.push(coin.id);
  playCoinTink();
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

function closestTreeSlotIndex(xPercent, yPercent) {
  let closestIndex = 0;
  let closestDistance = Infinity;

  TREE_GRID_SLOTS.forEach((slot, index) => {
    const distance = Math.hypot(slot.x - xPercent, slot.y - yPercent);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function chooseTreeSlot(preferredIndex) {
  const usedSlots = new Set(state.treeRoots.map((root) => root.slotIndex));

  if (!usedSlots.has(preferredIndex)) {
    return preferredIndex;
  }

  const preferredSlot = TREE_GRID_SLOTS[preferredIndex];
  let openSlotIndex = null;
  let openSlotDistance = Infinity;

  TREE_GRID_SLOTS.forEach((slot, index) => {
    if (usedSlots.has(index)) {
      return;
    }

    const distance = Math.hypot(slot.x - preferredSlot.x, slot.y - preferredSlot.y);

    if (distance < openSlotDistance) {
      openSlotDistance = distance;
      openSlotIndex = index;
    }
  });

  return openSlotIndex ?? preferredIndex;
}

function placeTreeRootFromEvent(coin, event) {
  const area = particleArea("bank");
  const rect = area.element.getBoundingClientRect();
  const xPercent = ((event.clientX - rect.left) / Math.max(1, area.width)) * 100;
  const yPercent = ((event.clientY - rect.top) / Math.max(1, area.height)) * 100;
  const slotIndex = chooseTreeSlot(closestTreeSlotIndex(xPercent, yPercent));
  const treeId = state.nextTreeId;
  const rootNode = treeRootNode(slotIndex, treeId);

  state.nextTreeId += 1;
  state.treeRoots.push({ id: treeId, slotIndex, x: rootNode.treeRootX, y: rootNode.treeRootY });
  Object.assign(coin, rootNode);
  coin.particle = null;
}

function investCoin(coin, timestamp, event) {
  if (coin.location !== "purse") {
    setMessage("Only fresh purse coins can be moved into the bank.");
    return false;
  }

  coin.location = "bank";
  coin.expiresAt = null;
  clearBankSplit(coin);

  if (isTreeBankTheme()) {
    placeTreeRootFromEvent(coin, event);
    setMessage("The coin planted a new money tree root.");
  } else {
    placeParticleFromEvent(coin, "bank", event);
    setMessage("The coin is now invested in the savings bank.");
  }

  return true;
}

function createConfettiPiece() {
  const piece = document.createElement("span");
  const angle = randomBetween(0, Math.PI * 2);
  const distance = randomBetween(60, 170);
  const drift = randomBetween(18, 70) * randomSign();
  const colors = ["#ff7d9b", "#f7b733", "#55b77a", "#5ea8ff", "#c95dcf", "#fff0c2"];

  piece.className = "present-reveal__confetti";
  piece.style.setProperty("--confetti-x", `${Math.cos(angle) * distance + drift}px`);
  piece.style.setProperty("--confetti-y", `${Math.sin(angle) * distance + randomBetween(20, 95)}px`);
  piece.style.setProperty("--confetti-rotate", `${randomBetween(-720, 720)}deg`);
  piece.style.setProperty("--confetti-color", colors[Math.floor(Math.random() * colors.length)]);
  piece.style.setProperty("--confetti-delay", `${randomBetween(0, 180)}ms`);

  return piece;
}

function playPresentReveal(present, sourceElement) {
  const sourceRect = sourceElement?.getBoundingClientRect();
  const sourceWidth = sourceRect?.width || 72;
  const sourceHeight = sourceRect?.height || 72;
  const originX = sourceRect ? sourceRect.left + sourceRect.width / 2 : window.innerWidth / 2;
  const originY = sourceRect ? sourceRect.top + sourceRect.height / 2 : window.innerHeight / 2;
  const moveX = window.innerWidth / 2 - originX;
  const moveY = window.innerHeight / 2 - originY;
  const targetSize = Math.min(window.innerWidth, window.innerHeight) * 0.38;
  const frontScale = clamp(targetSize / Math.max(sourceWidth, sourceHeight), 2.2, 4.4);
  const overlay = document.createElement("div");
  const stage = document.createElement("div");
  const gift = document.createElement("span");
  const emoji = document.createElement("span");
  const confetti = document.createElement("span");

  overlay.className = "present-reveal";
  overlay.setAttribute("aria-hidden", "true");

  stage.className = "present-reveal__stage";
  stage.style.setProperty("--origin-x", `${originX}px`);
  stage.style.setProperty("--origin-y", `${originY}px`);
  stage.style.setProperty("--source-width", `${sourceWidth}px`);
  stage.style.setProperty("--source-height", `${sourceHeight}px`);
  stage.style.setProperty("--move-x", `${moveX}px`);
  stage.style.setProperty("--move-y", `${moveY}px`);
  stage.style.setProperty("--front-scale", frontScale.toFixed(3));

  gift.className = "present-reveal__gift";
  gift.textContent = "🎁";

  emoji.className = "present-reveal__emoji";
  emoji.textContent = present.emoji;

  confetti.className = "present-reveal__confetti-burst";

  for (let count = 0; count < PRESENT_CONFETTI_PIECES; count += 1) {
    confetti.append(createConfettiPiece());
  }

  stage.append(gift, emoji, confetti);
  overlay.append(stage);
  document.body.append(overlay);
  stage.addEventListener("animationend", () => overlay.remove(), { once: true });
}

function openPresent(coin, presentIndex, sourceElement) {
  const present = state.presents[presentIndex];

  if (!present || present.opened) {
    return false;
  }

  if (hasActivePresentReveal()) {
    setMessage("Wait for the current present to finish opening.");
    return false;
  }

  const revealStartedAt = performance.now();

  present.opened = true;
  present.revealEndsAt = revealStartedAt + PRESENT_REVEAL_MS;
  state.openedCount += 1;
  removeCoin(coin.id);

  if (hasActiveBankAnimation()) {
    state.bankRevealPauseLastAt = {
      game: gameNow(),
      real: revealStartedAt,
    };
  }

  if (hasActivePurseDrop()) {
    state.purseAnimationPauseLastAt = revealStartedAt;
  }

  playPresentReveal(present, sourceElement);
  playPresentDrumroll();
  setMessage(`The present opened and revealed ${present.emoji}.`);
  checkWinOrLoss();
  return true;
}

function fillSettingsForm(settings) {
  Object.entries(settings).forEach(([key, value]) => {
    if (!dom.inputs[key]) {
      return;
    }

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

    if (key === "bankTheme") {
      nextSettings[key] = BANK_THEME_VALUES.has(input.value) ? input.value : DEFAULT_SETTINGS.bankTheme;
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

dom.startPlayButton.addEventListener("click", () => {
  beginPlay();
});

dom.newGameButton.addEventListener("click", () => {
  dom.appMenu.open = false;
  newGame(state.settings);
});

dom.resultNewGameButton.addEventListener("click", () => {
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

window.addEventListener("pointerdown", unlockAudio, { passive: true });
window.addEventListener("keydown", unlockAudio);
window.addEventListener("resize", layoutBankBricks);

fillSettingsForm(DEFAULT_SETTINGS);
newGame(DEFAULT_SETTINGS);
requestAnimationFrame(tick);
