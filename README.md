# Moonpetal Party — Starfall Festival

A small, anime-inspired party-board-game starter built with **vanilla JavaScript, HTML, and CSS**. It includes a playable board game and two independently loaded minigames.

## What's in the project?

```text
moonpetal-party/
├── index.html                 # Host page / layout
├── styles.css                 # Board, panels, animations, and shared minigame styles
├── js/
│   └── main.js                # Game state, turns, movement, space effects, rewards
└── minigames/
    ├── sakura-sprint.js       # Timed button-mashing race
    └── spirit-catch.js        # Timed click/tap target game
```

## Run it locally

Because the main game uses JavaScript `import()` to load minigames only when needed, open it through a local HTTP server rather than double-clicking `index.html` (browsers commonly block ES modules on `file://`). No packages, build step, or external libraries are required.

### Python

1. Extract the ZIP file.
2. Open a terminal in the `moonpetal-party` folder—the folder that contains `index.html`.
3. Run:

   ```bash
   python -m http.server 8000
   ```

4. Open **http://localhost:8000** in your browser.

If `python` doesn't resolve on Windows, try `py -m http.server 8000`.

### VS Code

Open the folder in VS Code, install/use the **Live Server** extension, and choose **Open with Live Server** on `index.html`.

## How to play the demo

- You play as the moon avatar against three CPU rivals.
- Click **Roll the Dice**. Your move animates space by space, then the landing space grants or takes petals, triggers a lucky event, or offers a Star.
- Once all four players have taken a turn, choose **Sakura Sprint** or **Spirit Catch**.
- Finish the minigame and press **Collect Rewards**. The main game applies the minigame ranking rewards, updates player totals, and starts the next round.
- After eight rounds, the player with the most Stars wins; petals break ties. Press **Play Again** to reset.

## How the main game and minigames talk

The board does not need to know the internal rules of a particular minigame. It only needs a small contract. In `js/main.js`, the loader dynamically imports a selected module:

```js
const minigameLoaders = {
  sprint: () => import("../minigames/sakura-sprint.js"),
  catch: () => import("../minigames/spirit-catch.js")
};
```

Each minigame exports `mount(context)`. The host supplies a root DOM element, a **snapshot** of the player records, the round number, and an `onComplete(result)` callback:

```js
state.miniCleanup = module.mount({
  root: els.modalRoot,
  players: state.players.map((player) => ({ ...player })),
  round: state.round,
  onComplete: (result) => completeMinigame(result, sessionId)
});
```

The minigame renders inside `root`, runs its own timer and interactions, then sends a result back. The result shape is intentionally small:

```js
{
  title: "Sakura Sprint",
  scores: [
    { playerId: "you", score: 92.5 },
    { playerId: "mika", score: 81.2 },
    { playerId: "ren", score: 70.4 },
    { playerId: "haru", score: 65.8 }
  ]
}
```

`playerId` connects a score to the host's real player record. The board ranks those scores, awards petals, updates the canonical player state, and advances the round. A minigame should **report outcomes, not directly edit the host's player objects**. That separation avoids separate games accidentally desynchronizing the board state.

`mount()` may return a cleanup function. The host calls it when the minigame ends or the modal is closed, so intervals and input listeners don't leak into later rounds.

## Add another minigame

1. Create `minigames/my-game.js`.
2. Export `mount({ root, players, round, onComplete })`.
3. Put your minigame markup inside `root`; reuse `.mini-screen`, `.mini-hero`, `.mini-title`, `.mini-arena`, `.mini-action`, and `.mini-results` for the same visual style, or add new styles to `styles.css`.
4. Return a function that clears timers and event listeners.
5. Add one lazy loader in `js/main.js` and add a launch button in `index.html` (then wire the button in `main.js`).
6. When the game finishes, call `onComplete({ title: "My Game", scores: [{ playerId, score }, ...] })` once. Include a score for each player. Higher score currently means a better placement.

## Current demo rules / easy tuning points

- `MAX_ROUNDS` in `js/main.js` controls game length.
- The `spaceTypes` array in `js/main.js` controls the 28-space board layout; the `boardCoords` array controls where spaces sit visually.
- The Star Shop currently costs 20 petals per Star.
- Blue spaces grant 3 petals, red spaces deduct up to 3, lucky events vary, and hidden caches grant 5.
- Minigame payouts are 10 / 6 / 3 / 1 petals by placement. Adjust `payouts` in both minigame files and `completeMinigame()` in the host together if you change the reward system.
- The UI is styled without an asset pipeline. It uses CSS gradients, SVG paths, and emoji tokens, so the starter is lightweight and easy to reskin.

## Browser notes

Use a modern browser with ES-module support. The project has no npm dependencies and uses no framework. The Google Fonts dependency has been removed, so the interface works offline with system-font fallbacks.
