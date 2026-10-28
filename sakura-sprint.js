export const meta = {
  id: "sakura-sprint",
  title: "Sakura Sprint",
  description: "Mash your way through a moonlit cherry-blossom race."
};

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const payouts = [10, 6, 3, 1];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function mount({ root, players, round = 1, onComplete }) {
  const human = players.find((player) => !player.isCPU) || players[0];
  const racePlayers = players.map((player) => ({
    ...player,
    progress: 0,
    speed: player.id === "mika" ? 0.75 : player.id === "ren" ? 0.68 : player.id === "haru" ? 0.79 : 0
  }));
  let running = false;
  let finished = false;
  let intervalId = null;
  let remaining = 10;
  let lastTime = performance.now();
  let clickCount = 0;

  root.innerHTML = `
    <section class="mini-screen sprint-screen" style="--mini-accent:#ffb8db">
      <header class="mini-hero">
        <div class="mini-eyebrow">MINIGAME 01 · PETAL POWER</div>
        <h2 class="mini-title" id="sprint-title">Sakura Sprint</h2>
        <p class="mini-description">The cherry-blossom gates are opening! Mash <b>SPACE</b> or tap the petal button to race your rivals to the finish.</p>
        <div class="mini-rule">ROUND ${round} · 10 SECOND SPRINT</div>
      </header>
      <div class="mini-timer"><div style="flex:1"><div class="mini-timer-label">TIME REMAINING</div><div class="mini-progress"><span id="sprint-time-bar"></span></div></div><div class="mini-timer-value" id="sprint-time">10.0s</div></div>
      <div class="mini-arena" id="sprint-arena">
        <div id="sprint-lanes"></div>
      </div>
      <div class="mini-control-row"><button class="mini-action mini-stretch" id="sprint-start" type="button">START THE RACE ✦</button></div>
      <p class="mini-hint" id="sprint-hint">Ready, set… <b>petal!</b> Once the race starts, every tap or Space press moves you forward.</p>
    </section>`;

  const lanesEl = root.querySelector("#sprint-lanes");
  const startButton = root.querySelector("#sprint-start");
  const timerEl = root.querySelector("#sprint-time");
  const timerBar = root.querySelector("#sprint-time-bar");
  const hintEl = root.querySelector("#sprint-hint");

  function renderLanes() {
    lanesEl.innerHTML = racePlayers.map((player) => `
      <div class="race-lane">
        <div class="race-label"><span class="race-avatar">${escapeHTML(player.avatar)}</span><span class="race-name">${escapeHTML(player.name)}${player.id === human.id ? " · YOU" : ""}</span><span class="race-meter" id="race-meter-${escapeHTML(player.id)}">${Math.floor(player.progress)}%</span></div>
        <div class="race-track"><div class="race-fill ${player.id === "mika" ? "cpu-mika" : player.id === "ren" ? "cpu-ren" : player.id === "haru" ? "cpu-haru" : ""}" id="race-fill-${escapeHTML(player.id)}" style="width:${player.progress}%"></div><span class="finish-flag"></span></div>
      </div>`).join("");
  }

  function updateMeters() {
    for (const player of racePlayers) {
      const fill = root.querySelector(`#race-fill-${CSS.escape(player.id)}`);
      const meter = root.querySelector(`#race-meter-${CSS.escape(player.id)}`);
      if (fill) fill.style.width = `${Math.min(100, player.progress)}%`;
      if (meter) meter.textContent = `${Math.floor(player.progress)}%`;
    }
  }

  function makeResultScreen() {
    finished = true;
    running = false;
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
    document.removeEventListener("keydown", onKeyDown);
    const ordered = [...racePlayers].sort((a, b) => b.progress - a.progress);
    const winner = ordered[0];
    root.innerHTML = `
      <section class="mini-screen sprint-screen" style="--mini-accent:#ffb8db">
        <header class="mini-hero">
          <div class="mini-celebration">${winner.avatar} ✨ 🌸</div>
          <div class="mini-eyebrow">PETALS IN THE WIND</div>
          <h2 class="mini-title">${escapeHTML(winner.name)} takes the lead!</h2>
          <p class="mini-description">The finish bell rings. Here is how the Moonlit Loop sprinters placed.</p>
        </header>
        <div class="mini-results"><div class="results-title"><strong>Race results</strong><span>FESTIVAL REWARDS</span></div>
          ${ordered.map((player, index) => `<div class="result-row"><span class="result-rank">${index === 0 ? "★" : `0${index + 1}`}</span><span class="result-avatar">${escapeHTML(player.avatar)}</span><span class="result-name">${escapeHTML(player.name)}${player.id === human.id ? " (you)" : ""}</span><span class="result-score">${Math.round(player.progress)}%</span><span class="result-reward">+${payouts[index] ?? 1} petals</span></div>`).join("")}
        </div>
        <p class="mini-complete-note">Scores are sent to Moonpetal Party. The host game handles coins, stars, and the next round.</p>
        <div class="mini-completion-actions"><button class="mini-action" id="sprint-collect" type="button">COLLECT REWARDS ✦</button></div>
      </section>`;
    root.querySelector("#sprint-collect").addEventListener("click", () => {
      onComplete({
        title: "Sakura Sprint",
        scores: ordered.map((player) => ({ playerId: player.id, score: Math.round(player.progress * 100) / 100 }))
      });
    });
  }

  function tick() {
    const now = performance.now();
    const delta = Math.min(0.2, (now - lastTime) / 1000);
    lastTime = now;
    remaining = Math.max(0, remaining - delta);
    for (const player of racePlayers) {
      if (player.isCPU && player.progress < 100) {
        player.progress = Math.min(100, player.progress + (player.speed + Math.random() * 0.33) * (delta * 10));
      }
    }
    timerEl.textContent = `${remaining.toFixed(1)}s`;
    timerBar.style.width = `${remaining / 10 * 100}%`;
    updateMeters();
    if (remaining <= 0) makeResultScreen();
  }

  function sprint() {
    if (!running || finished) return;
    human.progress = Math.min(100, human.progress + 2.45);
    clickCount++;
    updateMeters();
    if (clickCount % 6 === 0) {
      const button = root.querySelector("#sprint-start");
      if (button) button.style.filter = `brightness(${1 + (clickCount % 12) / 65})`;
    }
  }

  function onKeyDown(event) {
    if ((event.code === "Space" || event.key === "Enter") && running && !event.repeat) {
      event.preventDefault();
      sprint();
    }
  }

  async function startRace() {
    if (running || finished) return;
    running = true;
    remaining = 10;
    lastTime = performance.now();
    startButton.innerHTML = '<span class="sprint-glyph">🌸</span><strong>MASH TO SPRINT!</strong><small>SPACE · ENTER · OR TAP HERE</small>';
    hintEl.innerHTML = "Keep a steady rhythm! <b>Four quick taps a second</b> can put you in star position.";
    startButton.classList.add("sprint-control");
    startButton.classList.remove("mini-action", "mini-stretch");
    startButton.style.width = "100%";
    startButton.style.minHeight = "78px";
    startButton.style.marginTop = "1px";
    startButton.addEventListener("pointerdown", sprint);
    document.addEventListener("keydown", onKeyDown);
    intervalId = window.setInterval(tick, 100);
  }

  renderLanes();
  startButton.addEventListener("click", startRace);

  return () => {
    if (intervalId !== null) window.clearInterval(intervalId);
    document.removeEventListener("keydown", onKeyDown);
    const button = root.querySelector("#sprint-start");
    if (button) button.removeEventListener("pointerdown", sprint);
  };
}
