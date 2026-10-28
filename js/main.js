const MAX_ROUNDS = 8;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const boardCoords = [
  [14, 15], [24, 15], [34, 15], [44, 15], [54, 15], [64, 15], [74, 15], [84, 15],
  [89, 24], [89, 35], [89, 46], [89, 57], [89, 68], [89, 79],
  [84, 85], [74, 85], [64, 85], [54, 85], [44, 85], [34, 85], [24, 85], [14, 85],
  [9, 79], [9, 68], [9, 57], [9, 46], [9, 35], [9, 24]
].map(([x, y]) => ({ x, y }));

const spaceTypes = [
  "start", "blue", "mini", "blue", "star", "red", "event", "blue",
  "blue", "red", "mini", "blue", "event", "blue", "item", "blue",
  "blue", "mini", "star", "red", "blue", "blue", "event", "blue",
  "mini", "red", "blue", "blue"
];

const spaceInfo = {
  start: { icon: "☾", label: "Moon Gate" },
  blue: { icon: "✦", label: "Petal space" },
  red: { icon: "♡", label: "Tumble space" },
  event: { icon: "?", label: "Lucky event" },
  star: { icon: "★", label: "Star shop" },
  mini: { icon: "✧", label: "Festival space" },
  item: { icon: "✿", label: "Petal cache" }
};

const initialPlayers = () => [
  { id: "you", name: "You", avatar: "🌙", className: "you", coins: 10, stars: 0, space: 0, isCPU: false },
  { id: "mika", name: "Mika", avatar: "🌸", className: "mika", coins: 10, stars: 0, space: 0, isCPU: true },
  { id: "ren", name: "Ren", avatar: "🦊", className: "ren", coins: 10, stars: 0, space: 0, isCPU: true },
  { id: "haru", name: "Haru", avatar: "🐰", className: "haru", coins: 10, stars: 0, space: 0, isCPU: true }
];

const state = {
  players: initialPlayers(),
  round: 1,
  turnsTaken: 0,
  currentPlayerIndex: 0,
  phase: "turn",
  turnBusy: false,
  lastRoll: null,
  log: [],
  miniCleanup: null,
  miniLoading: false,
  miniSession: 0,
  miniCompletionHandled: false,
  activeMini: null
};

const els = {
  board: document.querySelector("#board"),
  trail: document.querySelector("#board-trail"),
  spaces: document.querySelector("#spaces"),
  tokens: document.querySelector("#tokens"),
  roundSummary: document.querySelector("#round-summary"),
  roundFill: document.querySelector("#round-track-fill"),
  turnNumber: document.querySelector("#turn-number"),
  activePlayer: document.querySelector("#active-player"),
  activeName: document.querySelector("#active-player-name"),
  activeSub: document.querySelector("#active-player-sub"),
  diceFace: document.querySelector("#dice-face"),
  diceCaption: document.querySelector("#dice-caption"),
  diceResult: document.querySelector("#dice-result"),
  rollButton: document.querySelector("#roll-button"),
  rollLabel: document.querySelector("#roll-button-label"),
  footnote: document.querySelector("#turn-footnote"),
  minigameActions: document.querySelector("#minigame-actions"),
  playerList: document.querySelector("#player-list"),
  eventLog: document.querySelector("#event-log"),
  footerPhase: document.querySelector("#footer-phase"),
  modal: document.querySelector("#minigame-modal"),
  modalRoot: document.querySelector("#minigame-root"),
  modalClose: document.querySelector("#modal-close"),
  launchSprint: document.querySelector("#launch-sprint"),
  launchCatch: document.querySelector("#launch-catch")
};

function makeBoard() {
  const path = boardCoords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * 10} ${point.y * 6.5}`).join(" ") + " Z";
  els.trail.innerHTML = `
    <path class="trail-shadow" d="${path}"></path>
    <path class="trail-base" d="${path}"></path>
    <path class="trail-dash" d="${path}"></path>`;

  els.spaces.innerHTML = boardCoords.map((point, index) => {
    const type = spaceTypes[index];
    const info = spaceInfo[type];
    return `<div class="space ${type}" data-space="${index}" title="Space ${index + 1}: ${info.label}" style="left:${point.x}%;top:${point.y}%">
      <span class="space-symbol">${info.icon}</span><span class="space-number">${String(index + 1).padStart(2, "0")}</span>
    </div>`;
  }).join("");
  renderTokens();
}

function renderTokens() {
  const bySpace = new Map();
  for (const player of state.players) {
    if (!bySpace.has(player.space)) bySpace.set(player.space, []);
    bySpace.get(player.space).push(player);
  }
  els.tokens.innerHTML = [...bySpace.entries()].map(([spaceIndex, players]) => {
    const point = boardCoords[Number(spaceIndex)];
    const current = state.players[state.currentPlayerIndex];
    const tokens = players.map((player) => {
      const active = state.phase === "turn" && current?.id === player.id;
      return `<span class="player-token ${player.className}${active ? " active-token" : ""}" title="${player.name}" aria-label="${player.name}">${player.avatar}</span>`;
    }).join("");
    return `<div class="token-stack" style="left:${point.x}%;top:${point.y}%">${tokens}</div>`;
  }).join("");
  document.querySelectorAll(".space").forEach((el) => {
    const index = Number(el.dataset.space);
    el.classList.toggle("is-current", state.players.some((p) => p.space === index && p.id === state.players[state.currentPlayerIndex]?.id));
  });
}

function currentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function addLog(message) {
  state.log.unshift({ message, time: `R${state.round}` });
  state.log = state.log.slice(0, 5);
  renderLog();
}

function renderLog() {
  const entries = state.log.length ? state.log : [{ message: "🌙 <b>The festival begins.</b> The Moon Garden is yours to explore.", time: "NOW" }];
  els.eventLog.innerHTML = entries.map((entry) => `<div class="log-entry"><span class="log-time">${entry.time}</span><span>${entry.message}</span></div>`).join("");
}

function renderPlayers() {
  els.playerList.innerHTML = state.players.map((player, index) => {
    const active = state.phase === "turn" && index === state.currentPlayerIndex;
    return `<div class="player-row ${active ? "active-row" : ""}">
      <div class="roster-avatar ${player.className}">${player.avatar}</div>
      <div class="player-row-copy"><strong>${player.name}${player.isCPU ? '<span class="cpu-tag">CPU</span>' : ""}</strong><small>${active ? "Taking a turn now" : `Space ${String(player.space + 1).padStart(2, "0")}`}</small></div>
      <div class="player-stats"><span title="Petals">✿ ${player.coins}</span><span class="star-stat" title="Stars">★ ${player.stars}</span></div>
    </div>`;
  }).join("");
}

function renderUI() {
  const player = currentPlayer();
  const finished = state.phase === "finished";
  const inMinigamePhase = state.phase === "minigame";
  const roundLabel = finished ? `ROUND ${MAX_ROUNDS} <i>/ ${MAX_ROUNDS}</i>` : `ROUND ${state.round} <i>/ ${MAX_ROUNDS}</i>`;
  els.roundSummary.innerHTML = roundLabel;
  els.roundFill.style.width = `${Math.min(100, (finished ? MAX_ROUNDS : state.round) / MAX_ROUNDS * 100)}%`;
  els.turnNumber.innerHTML = `${String(Math.min(state.turnsTaken + 1, 4)).padStart(2, "0")} <i>/ 04</i>`;
  els.activeName.textContent = finished ? getChampion().name : (inMinigamePhase ? "Festival time!" : player.name);
  els.activeSub.textContent = finished ? "The Starfall champion ✨" : (inMinigamePhase ? "One last challenge decides the round." : player.isCPU ? "A rival is making their move…" : "Ready to wander?");
  const avatarEl = els.activePlayer.querySelector(".active-avatar");
  avatarEl.className = `active-avatar avatar-${finished ? getChampion().className : inMinigamePhase ? "moon" : player.className}`;
  avatarEl.textContent = finished ? getChampion().avatar : inMinigamePhase ? "✨" : player.avatar;
  const statusEl = els.activePlayer.querySelector(".active-status");
  statusEl.innerHTML = finished ? '<span class="status-dot"></span> FESTIVAL CHAMPION' : inMinigamePhase ? '<span class="status-dot"></span> ROUND COMPLETE' : player.isCPU ? '<span class="status-dot"></span> RIVAL TURN' : '<span class="status-dot"></span> YOUR MOVE';

  if (state.lastRoll === null) {
    els.diceFace.textContent = "✦";
    els.diceResult.textContent = "Roll from 1 to 6";
    els.diceCaption.textContent = "THE FATES ARE WAITING";
  }
  els.rollButton.hidden = inMinigamePhase;
  els.minigameActions.hidden = !inMinigamePhase;
  els.rollButton.disabled = state.turnBusy || (player?.isCPU && !finished) || inMinigamePhase;
  if (finished) {
    els.rollButton.hidden = false;
    els.rollButton.disabled = false;
    els.rollLabel.textContent = "PLAY AGAIN";
    els.diceCaption.textContent = "THE FESTIVAL CHAMPION";
    els.diceResult.textContent = `${getChampion().name} takes the crown`;
    els.diceFace.textContent = "★";
    els.footnote.textContent = "A new festival awaits. Start another game?";
  } else if (inMinigamePhase) {
    els.footnote.textContent = "Choose a side quest. Your score becomes festival rewards.";
    els.footerPhase.textContent = "CHOOSE YOUR FESTIVAL CHALLENGE";
  } else {
    els.rollLabel.textContent = state.turnBusy ? "ON THE MOVE…" : player?.isCPU ? "RIVAL'S TURN" : "ROLL THE DICE";
    els.footnote.textContent = state.turnBusy ? `${player.name} is wandering the Moonlit Loop…` : player?.isCPU ? `${player.name} is taking their turn automatically.` : "You go first. The rivals follow.";
    els.footerPhase.textContent = `ROUND ${state.round} · ${player?.isCPU ? `${player.name.toUpperCase()} MOVING` : "YOUR ADVENTURE AWAITS"}`;
  }
  if (!finished && !inMinigamePhase) {
    els.turnNumber.innerHTML = `${String(state.turnsTaken + 1).padStart(2, "0")} <i>/ 04</i>`;
  }
  els.launchSprint.disabled = state.miniLoading;
  els.launchCatch.disabled = state.miniLoading;
  renderPlayers();
  renderTokens();
}

function getChampion() {
  return [...state.players].sort((a, b) => b.stars - a.stars || b.coins - a.coins)[0];
}

function resolveSpace(player) {
  const type = spaceTypes[player.space];
  if (type === "blue" || type === "start") {
    player.coins += type === "start" ? 2 : 3;
    addLog(`✿ <b>${player.name}</b> found a petal breeze. <b>+${type === "start" ? 2 : 3} petals.</b>`);
  } else if (type === "red") {
    const lost = Math.min(3, player.coins);
    player.coins -= lost;
    addLog(`💗 <b>${player.name}</b> slipped on a rosy petal. <b>−${lost} petals.</b>`);
  } else if (type === "event") {
    const event = Math.floor(Math.random() * 3);
    if (event === 0) {
      player.coins += 5;
      addLog(`🎐 <b>${player.name}</b> rang the lucky bell. <b>+5 petals!</b>`);
    } else if (event === 1) {
      const lost = Math.min(2, player.coins);
      player.coins -= lost;
      addLog(`🌀 <b>${player.name}</b> met a mischievous wind spirit. <b>−${lost} petals.</b>`);
    } else {
      player.coins += 2;
      addLog(`🌷 <b>${player.name}</b> found a secret garden. <b>+2 petals</b> and a wish.`);
    }
  } else if (type === "star") {
    if (player.coins >= 20) {
      player.coins -= 20;
      player.stars += 1;
      addLog(`⭐ <b>${player.name}</b> traded 20 petals for a <b>Star!</b> What a beautiful wish.`);
    } else {
      addLog(`⭐ <b>${player.name}</b> found the Star Shop, but needs ${20 - player.coins} more petals.`);
    }
  } else if (type === "mini") {
    player.coins += 2;
    addLog(`🎮 <b>${player.name}</b> warmed up at the festival gate. <b>+2 petals.</b>`);
  } else if (type === "item") {
    player.coins += 5;
    addLog(`🌸 <b>${player.name}</b> found a hidden petal cache. <b>+5 petals!</b>`);
  }
  renderUI();
}

async function takeTurn(fromCPU = false) {
  if (state.phase !== "turn" || state.turnBusy) return;
  const player = currentPlayer();
  if (!player || (player.isCPU && !fromCPU) || (!player.isCPU && fromCPU)) return;

  state.turnBusy = true;
  renderUI();
  els.diceFace.classList.add("rolling");
  els.diceCaption.textContent = "ROLLING THROUGH THE STARS";
  els.diceResult.textContent = "The fates are turning…";
  const roll = 1 + Math.floor(Math.random() * 6);
  await sleep(480);
  state.lastRoll = roll;
  els.diceFace.classList.remove("rolling");
  els.diceFace.textContent = String(roll);
  els.diceCaption.textContent = `${player.name.toUpperCase()} ROLLED`;
  els.diceResult.textContent = `${roll} ${roll === 1 ? "space" : "spaces"}!`;
  addLog(`🎲 <b>${player.name}</b> rolled a <b>${roll}</b>.`);

  for (let step = 0; step < roll; step++) {
    player.space = (player.space + 1) % boardCoords.length;
    renderTokens();
    await sleep(145);
  }
  resolveSpace(player);
  await sleep(460);
  state.turnsTaken += 1;
  if (state.turnsTaken >= state.players.length) {
    state.phase = "minigame";
    state.currentPlayerIndex = 0;
    addLog(`🌠 <b>Round ${state.round} is complete.</b> Choose a festival challenge!`);
  } else {
    state.currentPlayerIndex = state.turnsTaken;
  }
  state.turnBusy = false;
  renderUI();

  if (state.phase === "turn" && currentPlayer().isCPU) {
    window.setTimeout(() => takeTurn(true), 520);
  }
}

const minigameLoaders = {
  sprint: () => import("../minigames/sakura-sprint.js"),
  catch: () => import("../minigames/spirit-catch.js")
};

async function launchMinigame(kind) {
  if (state.phase !== "minigame" || state.miniLoading) return;
  state.miniLoading = true;
  state.miniCompletionHandled = false;
  state.activeMini = kind;
  const sessionId = ++state.miniSession;
  els.modal.hidden = false;
  els.modalRoot.innerHTML = '<div class="mini-hero"><div class="mini-eyebrow">OPENING THE FESTIVAL GATE</div><h2 class="mini-title">A little side quest…</h2><p class="mini-description">Gathering starlight and inviting your rivals.</p></div>';
  renderUI();

  try {
    const module = await minigameLoaders[kind]();
    if (sessionId !== state.miniSession || els.modal.hidden) return;
    state.miniLoading = false;
    state.miniCleanup = module.mount({
      root: els.modalRoot,
      players: state.players.map((player) => ({ ...player })),
      round: state.round,
      onComplete: (result) => completeMinigame(result, sessionId)
    });
    renderUI();
  } catch (error) {
    console.error("Unable to load minigame", error);
    state.miniLoading = false;
    els.modalRoot.innerHTML = `<div class="mini-hero"><div class="mini-eyebrow">OOPS, A LITTLE SPIRIT GLITCH</div><h2 class="mini-title">The gate didn't open.</h2><p class="mini-description">${kind === "sprint" ? "Sakura Sprint" : "Spirit Catch"} could not be loaded. Check that you're running this project on a local web server and that the minigame file exists.</p><button class="mini-action" id="try-minigame-again" type="button">TRY AGAIN</button></div>`;
    document.querySelector("#try-minigame-again")?.addEventListener("click", () => launchMinigame(kind));
    renderUI();
  }
}

function completeMinigame(result, sessionId) {
  if (state.miniCompletionHandled || sessionId !== state.miniSession) return;
  state.miniCompletionHandled = true;
  const scored = Array.isArray(result?.scores) ? result.scores : [];
  const ordered = [...scored].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const payouts = [10, 6, 3, 1];
  const payoutLines = [];
  ordered.forEach((entry, index) => {
    const player = state.players.find((p) => p.id === entry.playerId);
    if (!player) return;
    const gain = payouts[index] ?? 1;
    player.coins += gain;
    payoutLines.push(`${player.name} +${gain}`);
  });
  const top = ordered[0] ? state.players.find((p) => p.id === ordered[0].playerId) : null;
  if (top) addLog(`🏆 <b>${top.name}</b> topped ${result.title || "the minigame"}! Festival rewards: ${payoutLines.map((line) => line.replace(" ", " ")).join(" · ")}.`);
  else addLog(`🏆 <b>The festival challenge</b> is complete. Rewards have been sent to the board.`);

  try { state.miniCleanup?.(); } catch (error) { console.warn("Minigame cleanup failed", error); }
  state.miniCleanup = null;
  state.miniLoading = false;
  state.activeMini = null;
  state.miniSession++;
  els.modal.hidden = true;
  els.modalRoot.innerHTML = "";

  if (state.round >= MAX_ROUNDS) {
    state.phase = "finished";
    const champion = getChampion();
    addLog(`👑 <b>${champion.name}</b> won the Starfall Festival with ${champion.stars} star${champion.stars === 1 ? "" : "s"} and ${champion.coins} petals!`);
  } else {
    state.round += 1;
    state.turnsTaken = 0;
    state.currentPlayerIndex = 0;
    state.lastRoll = null;
    state.phase = "turn";
    addLog(`🌙 <b>Round ${state.round} begins!</b> Back to the Moonlit Loop.`);
  }
  renderUI();
}

function closeMinigame() {
  if (els.modal.hidden) return;
  state.miniSession++;
  try { state.miniCleanup?.(); } catch (error) { console.warn("Minigame cleanup failed", error); }
  state.miniCleanup = null;
  state.miniLoading = false;
  state.miniCompletionHandled = false;
  state.activeMini = null;
  els.modal.hidden = true;
  els.modalRoot.innerHTML = "";
  renderUI();
}

function resetGame() {
  closeMinigame();
  state.players = initialPlayers();
  state.round = 1;
  state.turnsTaken = 0;
  state.currentPlayerIndex = 0;
  state.phase = "turn";
  state.turnBusy = false;
  state.lastRoll = null;
  state.log = [];
  addLog("🌙 <b>A fresh festival begins.</b> The Moon Garden is yours to explore.");
  makeBoard();
  renderUI();
}

els.rollButton.addEventListener("click", () => {
  if (state.phase === "finished") resetGame();
  else takeTurn(false);
});
els.launchSprint.addEventListener("click", () => launchMinigame("sprint"));
els.launchCatch.addEventListener("click", () => launchMinigame("catch"));
els.modalClose.addEventListener("click", closeMinigame);
els.modal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) closeMinigame();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.modal.hidden) closeMinigame();
});

makeBoard();
addLog("🌙 <b>The festival begins.</b> The Moon Garden is yours to explore.");
renderUI();
