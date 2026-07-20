const DEFAULT_SETTINGS = {
  payrate: 5,
  depreciation: 5,
  feedrate: 4,
  start: 3,
  interest: 20,
  presents: 9,
  lifetime: 10,
};

const SPLIT_DURATION_MS = 1100;

const PRESETS = {
  easy: {
    payrate: 8,
    depreciation: 7,
    feedrate: 5,
    start: 4,
    interest: 40,
    presents: 7,
    lifetime: 12,
  },
  medium: DEFAULT_SETTINGS,
  hard: {
    payrate: 12,
    depreciation: 4,
    feedrate: 3,
    start: 1,
    interest: 75,
    presents: 10,
    lifetime: 8,
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
  robotStat: document.querySelector("#robot-stat"),
  bankStat: document.querySelector("#bank-stat"),
  presentStat: document.querySelector("#present-stat"),
  purseStat: document.querySelector("#purse-stat"),
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
  },
};

let state;
let drag = null;
let lastHighlightedTarget = null;

function depreciationMs() {
  return state.settings.depreciation * 1000;
}

function interestMs() {
  return state.settings.interest * 1000;
}

function payrateMs() {
  return state.settings.payrate * 1000;
}

function formatSeconds(ms) {
  return `${Math.max(0, Math.ceil(ms / 1000))}s`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function createBankCoin(timestamp) {
  const coin = createCoin("bank", timestamp);
  coin.nextSplitAt = timestamp + interestMs();
  return coin;
}

function removeCoin(coinId) {
  state.coins = state.coins.filter((coin) => coin.id !== coinId);
  state.robotStack = state.robotStack.filter((id) => id !== coinId);
}

function findCoin(coinId) {
  return state.coins.find((coin) => coin.id === coinId);
}

function newGame(settings = state?.settings ?? DEFAULT_SETTINGS) {
  const timestamp = performance.now();
  const emojis = shuffle(EMOJIS);

  state = {
    settings: { ...settings },
    coins: [],
    nextCoinId: 1,
    wageCoinsIssued: 0,
    nextPayAt: timestamp + settings.payrate * 1000,
    robotStack: [],
    robotLastTick: timestamp,
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

function processBank(timestamp) {
  const bankCoins = state.coins.filter((coin) => coin.location === "bank");
  let completedSplits = 0;
  let startedSplits = 0;

  for (const coin of bankCoins) {
    if (drag?.id === coin.id) {
      continue;
    }

    if (coin.splitCompletesAt !== null && timestamp >= coin.splitCompletesAt) {
      createBankCoin(timestamp);
      coin.nextSplitAt = timestamp + interestMs();
      coin.splitStartedAt = null;
      coin.splitCompletesAt = null;
      completedSplits += 1;
    } else if (coin.splitCompletesAt === null && coin.nextSplitAt !== null && timestamp >= coin.nextSplitAt) {
      coin.nextSplitAt = null;
      coin.splitStartedAt = timestamp;
      coin.splitCompletesAt = timestamp + SPLIT_DURATION_MS;
      startedSplits += 1;
    }
  }

  if (completedSplits > 0) {
    setMessage(`${completedSplits} bank coin${completedSplits === 1 ? "" : "s"} finished splitting.`);
  } else if (startedSplits > 0) {
    setMessage(`${startedSplits} bank coin${startedSplits === 1 ? " is" : "s are"} splitting.`);
  }
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
  if (state.status === "playing") {
    processIncome(timestamp);
    processPurse(timestamp);
    processRobot(timestamp);
    processBank(timestamp);
    checkWinOrLoss();
  }

  render(timestamp);
  requestAnimationFrame(tick);
}

function createCoinElement(coin, timestamp, location) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `coin coin--${location}`;
  element.dataset.coinId = String(coin.id);
  element.setAttribute("aria-label", `${location} coin`);

  if (drag?.id === coin.id) {
    element.classList.add("is-source");
  }

  if (location === "purse") {
    const remaining = (coin.expiresAt - timestamp) / depreciationMs();
    element.style.setProperty("--scale", clamp(remaining, 0.18, 1).toFixed(2));
    element.title = `Disappears in ${formatSeconds(coin.expiresAt - timestamp)}`;
  } else if (location === "robot") {
    const bottomCoinId = state.robotStack[0];
    const scale = coin.id === bottomCoinId ? coin.remainingMs / depreciationMs() : 1;
    element.style.setProperty("--scale", clamp(scale, 0.18, 1).toFixed(2));
    element.title =
      coin.id === bottomCoinId ? `Robot meal has ${formatSeconds(coin.remainingMs)} left` : "Waiting in robot stack";

    if (coin.id === bottomCoinId) {
      element.classList.add("is-bottom");
    }
  } else {
    if (coin.splitCompletesAt !== null) {
      const progress = clamp((timestamp - coin.splitStartedAt) / SPLIT_DURATION_MS, 0, 1);
      const splitChild = document.createElement("span");
      splitChild.className = "coin split-child";
      splitChild.setAttribute("aria-hidden", "true");
      element.classList.add("is-splitting");
      element.style.setProperty("--split-progress", progress.toFixed(3));
      element.title = `Splitting for ${formatSeconds(coin.splitCompletesAt - timestamp)}`;
      element.append(splitChild);
    } else {
      element.title = `Splits in ${formatSeconds(coin.nextSplitAt - timestamp)}`;
    }
  }

  return element;
}

function renderCoins(timestamp) {
  const purseFragment = document.createDocumentFragment();
  const bankFragment = document.createDocumentFragment();
  const robotFragment = document.createDocumentFragment();

  for (const coin of state.coins) {
    if (coin.location === "purse") {
      purseFragment.append(createCoinElement(coin, timestamp, "purse"));
    } else if (coin.location === "bank") {
      bankFragment.append(createCoinElement(coin, timestamp, "bank"));
    }
  }

  for (const coinId of state.robotStack) {
    const coin = findCoin(coinId);

    if (coin) {
      robotFragment.append(createCoinElement(coin, timestamp, "robot"));
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
  const bottomCoin = findCoin(state.robotStack[0]);
  const purseCoins = state.coins.filter((coin) => coin.location === "purse");
  const bankCoins = state.coins.filter((coin) => coin.location === "bank");
  const nextPurseDrop = state.nextPayAt === null ? null : state.nextPayAt - timestamp;
  const nextPurseExpiry = purseCoins.reduce(
    (soonest, coin) => Math.min(soonest, coin.expiresAt - timestamp),
    Number.POSITIVE_INFINITY,
  );
  const nextBankSplit = bankCoins.reduce(
    (soonest, coin) => {
      const nextEventAt = coin.splitCompletesAt ?? coin.nextSplitAt;
      return Math.min(soonest, nextEventAt - timestamp);
    },
    Number.POSITIVE_INFINITY,
  );

  dom.robotStat.textContent = `${state.robotStack.length} / ${state.settings.feedrate}${
    bottomCoin ? ` (${formatSeconds(bottomCoin.remainingMs)})` : ""
  }`;
  dom.bankStat.textContent = `${bankCoins.length}${
    Number.isFinite(nextBankSplit) ? ` (${formatSeconds(nextBankSplit)})` : ""
  }`;
  dom.presentStat.textContent = `${state.openedCount} / ${state.presents.length}`;
  dom.purseStat.textContent = `${purseCoins.length}${
    Number.isFinite(nextPurseExpiry) ? ` (${formatSeconds(nextPurseExpiry)})` : ""
  }${
    nextPurseDrop === null
      ? ` | ${state.wageCoinsIssued} / ${state.settings.lifetime}`
      : ` | +${formatSeconds(nextPurseDrop)} | ${state.wageCoinsIssued} / ${state.settings.lifetime}`
  }`;
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
  clearHighlightedTarget();
  drag.ghost.remove();
  drag = null;
  document.removeEventListener("pointermove", handlePointerMove);
  handleDrop(coinId, target, performance.now());
  render();
}

function handlePointerMove(event) {
  updateGhostPosition(event);
  highlightTarget(event);
}

function handlePointerUp(event) {
  finishDrag(event);
}

function handleDrop(coinId, target, timestamp) {
  if (state.status !== "playing") {
    return false;
  }

  const coin = findCoin(coinId);

  if (!coin || coin.location === "robot") {
    return false;
  }

  if (coin.splitCompletesAt !== null) {
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
    return investCoin(coin, timestamp);
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
  coin.remainingMs = depreciationMs();
  state.robotStack.push(coin.id);
  setMessage("The robot ate a coin and stacked it in his tummy.");
  return true;
}

function investCoin(coin, timestamp) {
  if (coin.location !== "purse") {
    setMessage("Only fresh purse coins can be moved into the bank.");
    return false;
  }

  coin.location = "bank";
  coin.expiresAt = null;
  coin.nextSplitAt = timestamp + interestMs();
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
    dom.inputs[key].value = value;
  });
  dom.inputs.start.setCustomValidity("");
}

function readSettingsForm() {
  const nextSettings = {};

  for (const [key, input] of Object.entries(dom.inputs)) {
    const value = Number(input.value);

    if (!Number.isFinite(value)) {
      throw new Error(`${key} must be a number.`);
    }

    nextSettings[key] = Math.round(value);
  }

  if (nextSettings.start > nextSettings.feedrate) {
    dom.inputs.start.setCustomValidity("Start S cannot be greater than feedrate F.");
    dom.inputs.start.reportValidity();
    throw new Error("Start S cannot be greater than feedrate F.");
  }

  dom.inputs.start.setCustomValidity("");

  return nextSettings;
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

  if (!coin || coin.location === "robot" || coin.splitCompletesAt !== null) {
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

fillSettingsForm(DEFAULT_SETTINGS);
newGame(DEFAULT_SETTINGS);
requestAnimationFrame(tick);
