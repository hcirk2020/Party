export const meta = {
  id: "spirit-catch",
  title: "Spirit Catch",
  description: "Catch little spirits before they flutter away."
};

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const payouts = [10, 6, 3, 1];
const charms = [
  { icon: "✦", value: 1 }, { icon: "🌸", value: 1 }, { icon: "⭐", value: 2 },
  { icon: "💎", value: 3 }, { icon: "✨", value: 2 }, { icon: "💮", value: 1 }
];

export function mount({ root, players, round = 1, onComplete }) {
  const human = players.find((player) => !player.isCPU) || players[0];
  const scores = new Map(players.map((player) => [player.id, 0]));
  let running = false;
  let finished = false;
  let intervalId = null;
  let remaining = 12;
  let lastTime = performance.now();
  let lastCpuTick = performance.now();
  let lastTargetMove = performance.now();
  let currentCharm = charms[0];
  let catches = 0;
  const floatingTimers = new Set();

  root.innerHTML = `
    <section class="mini-screen catch-screen" style="--mini-accent:#c7b9ff">
      <header class="mini-hero">
        <div class="mini-eyebrow">MINIGAME 02 · WISH COLLECTOR</div>
        <h2 class="mini-title" id="catch-title">Spirit Catch</h2>
        <p class="mini-description">Tiny star spirits are escaping into the garden! Click or tap them before they flutter away. Rare gems are worth extra points.</p>
        <div class="mini-rule">ROUND ${round} · 12 SECOND CHASE</div>
      </header>
      <div class="mini-timer"><div style="flex:1"><div class="mini-timer-label">TIME REMAINING</div><div class="mini-progress"><span id="catch-time-bar"></span></div></div><div class="mini-timer-value" id="catch-time">12.0s</div></div>
      <div class="catch-arena" id="catch-arena">
        <div class="catch-score-chip">YOUR WISHES <b id="catch-score">0</b></div>
        <button class="catch-target" id="catch-target" type="button" aria-label="Catch the spirit" hidden>✦</button>
        <div class="catch-bottom-hint" id="catch-arena-hint">Press “Open the gate” to begin</div>
      </div>
      <div class="mini-control-row"><button class="mini-action mini-stretch" id="catch-start" type="button">OPEN THE GATE ✧</button></div>
      <p class="mini-hint" id="catch-hint">Aim for the glowing charm. <b>Star spirits = 2</b>, diamonds = 3, and petals = 1 point.</p>
    </section>`;

  const arena = root.querySelector("#catch-arena");
  const target = root.querySelector("#catch-target");
  const startButton = root.querySelector("#catch-start");
  const timeEl = root.querySelector("#catch-time");
  const timeBar = root.querySelector("#catch-time-bar");
  const scoreEl = root.querySelector("#catch-score");
  const arenaHint = root.querySelector("#catch-arena-hint");
  const hintEl = root.querySelector("#catch-hint");

  function moveTarget() {
    currentCharm = charms[Math.floor(Math.random() * charms.length)];
    target.textContent = currentCharm.icon;
    target.style.left = `${13 + Math.random() * 74}%`;
    target.style.top = `${20 + Math.random() * 59}%`;
    target.style.transform = "translate(-50%,-50%) rotate(0deg)";
    void target.offsetWidth;
    target.style.transform = `translate(-50%,-50%) rotate(${Math.random() * 18 - 9}deg)`;
    lastTargetMove = performance.now();
  }

  function floatPoints(value, event) {
    const rect = arena.getBoundingClientRect();
    const x = Math.max(12, Math.min(rect.width - 28, event.clientX - rect.left));
    const y = Math.max(22, Math.min(rect.height - 24, event.clientY - rect.top));
    const floater = document.createElement("span");
    floater.className = "catch-floating";
    floater.textContent = `+${value}`;
    floater.style.left = `${x}px`;
    floater.style.top = `${y}px`;
    arena.append(floater);
    const timerId = window.setTimeout(() => {
      floater.remove();
      floatingTimers.delete(timerId);
    }, 850);
    floatingTimers.add(timerId);
  }

  function catchSpirit(event) {
    if (!running || finished) return;
    event.preventDefault();
    const value = currentCharm.value;
    scores.set(human.id, scores.get(human.id) + value);
    catches++;
    scoreEl.textContent = String(scores.get(human.id));
    floatPoints(value, event);
    arenaHint.textContent = catches % 5 === 0 ? "Lovely catch! Keep going ✨" : "Another spirit is on its way…";
    moveTarget();
  }

  function tick() {
    const now = performance.now();
    const delta = Math.min(0.2, (now - lastTime) / 1000);
    lastTime = now;
    remaining = Math.max(0, remaining - delta);
    timeEl.textContent = `${remaining.toFixed(1)}s`;
    timeBar.style.width = `${remaining / 12 * 100}%`;

    if (now - lastCpuTick >= 850) {
      lastCpuTick = now;
      for (const player of players.filter((entry) => entry.isCPU)) {
        if (Math.random() < 0.85) scores.set(player.id, scores.get(player.id) + (Math.random() < 0.16 ? 2 : 1));
      }
    }
    if (now - lastTargetMove >= 1100) moveTarget();
    if (remaining <= 0) showResults();
  }

  function showResults() {
    if (finished) return;
    finished = true;
    running = false;
    if (intervalId !== null) window.clearInterval(intervalId);
    intervalId = null;
    target.hidden = true;
    const ordered = [...players].map((player) => ({ ...player, score: scores.get(player.id) || 0 })).sort((a, b) => b.score - a.score);
    const winner = ordered[0];
    root.innerHTML = `
      <section class="mini-screen catch-screen" style="--mini-accent:#c7b9ff">
        <header class="mini-hero">
          <div class="mini-celebration">🌙 ✨ 💮</div>
          <div class="mini-eyebrow">WISHES GATHERED</div>
          <h2 class="mini-title">${escapeHTML(winner.name)} caught the most light!</h2>
          <p class="mini-description">The spirit gate is closing. Every wish is counted, and the festival rewards are ready.</p>
        </header>
        <div class="mini-results"><div class="results-title"><strong>Spirit catch results</strong><span>FESTIVAL REWARDS</span></div>
          ${ordered.map((player, index) => `<div class="result-row"><span class="result-rank">${index === 0 ? "★" : `0${index + 1}`}</span><span class="result-avatar">${escapeHTML(player.avatar)}</span><span class="result-name">${escapeHTML(player.name)}${player.id === human.id ? " (you)" : ""}</span><span class="result-score">${player.score} pts</span><span class="result-reward">+${payouts[index] ?? 1} petals</span></div>`).join("")}
        </div>
        <p class="mini-complete-note">Your ranked scores go back to the main board. The host game awards the petals and starts the next round.</p>
        <div class="mini-completion-actions"><button class="mini-action" id="catch-collect" type="button">COLLECT REWARDS ✦</button></div>
      </section>`;
    root.querySelector("#catch-collect").addEventListener("click", () => {
      onComplete({ title: "Spirit Catch", scores: ordered.map((player) => ({ playerId: player.id, score: player.score })) });
    });
  }

  function startGame() {
    if (running || finished) return;
    running = true;
    remaining = 12;
    lastTime = performance.now();
    lastCpuTick = performance.now();
    startButton.textContent = "CATCH THE SPIRITS ✨";
    startButton.disabled = true;
    startButton.classList.add("secondary");
    target.hidden = false;
    arenaHint.textContent = "Quick! The spirits won't wait!";
    hintEl.innerHTML = "Tap every glowing charm before it moves. <b>Keep your eyes on the garden!</b>";
    moveTarget();
    intervalId = window.setInterval(tick, 100);
  }

  target.addEventListener("click", catchSpirit);
  startButton.addEventListener("click", startGame);

  return () => {
    if (intervalId !== null) window.clearInterval(intervalId);
    for (const timerId of floatingTimers) window.clearTimeout(timerId);
    floatingTimers.clear();
    target.removeEventListener("click", catchSpirit);
    startButton.removeEventListener("click", startGame);
  };
}
