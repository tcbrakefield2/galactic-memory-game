/**
 * game.js — Core game logic module
 * Handles: board rendering, flip logic, match detection,
 *          score tracking, timer, win state, reset, easter egg.
 */

import { buildDeck, DIFFICULTY, shuffle } from './cards.js';
import { saveHighScore, getHighScore, savePlayerPrefs, loadPlayerPrefs } from './storage.js';

/* ── State ── */
let state = {
  deck:          [],
  flipped:       [],   // up to 2 instanceIds currently flipped
  matched:       new Set(),
  moves:         0,
  timer:         0,
  timerInterval: null,
  locked:        false, // block clicks during comparison delay
  difficulty:    'medium',
  playerName:    'Cosmonaut',
  theme:         'default',
  started:       false,
};

/* ── DOM refs ── */
const board       = document.getElementById('game-board');
const movesEl     = document.getElementById('stat-moves');
const timerEl     = document.getElementById('stat-timer');
const matchesEl   = document.getElementById('stat-matches');
const progressBar = document.getElementById('progress-bar');
const progressPct = document.getElementById('progress-pct');
const liveRegion  = document.getElementById('live-announce');
const winToast    = document.getElementById('win-toast');
const winMsg      = document.getElementById('win-msg');
const highBadge   = document.getElementById('high-score-badge');
const playerLabel = document.getElementById('player-label');

/* ── Init ── */
export function initGame() {
  const prefs = loadPlayerPrefs();
  if (prefs.name)       state.playerName = prefs.name;
  if (prefs.difficulty) state.difficulty  = prefs.difficulty;
  if (prefs.theme)      applyTheme(prefs.theme);

  updatePlayerLabel();
  renderHighScore();
  startNewGame();

  bindControls();
  bindSettingsForm();

  // Easter egg: console hint
  console.log(
    '%c✦ COSMIC MEMORY EASTER EGG ✦\n%cType cosmicSecret() in the console to unlock a hidden theme!',
    'color:#7c6af7;font-size:1.1em;font-weight:bold;',
    'color:#f76a8c;'
  );
  // Expose easter egg function
  window.cosmicSecret = easterEgg;
}

/* ── New Game ── */
export function startNewGame() {
  clearInterval(state.timerInterval);
  hideWinToast();

  state.deck      = buildDeck(state.difficulty);
  state.flipped   = [];
  state.matched   = new Set();
  state.moves     = 0;
  state.timer     = 0;
  state.locked    = false;
  state.started   = false;

  updateStats();
  renderBoard();
}

/* ── Board Rendering (DOM Templating from data array) ── */
function renderBoard() {
  board.innerHTML = '';
  const { cols } = DIFFICULTY[state.difficulty];
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  state.deck.forEach(card => {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('aria-label', `Card ${card.instanceId} — face down`);
    wrapper.dataset.instanceId = card.instanceId;

    const inner = document.createElement('div');
    inner.className = 'memory-card';
    inner.dataset.flipped = 'false';
    inner.dataset.matched = 'false';
    inner.dataset.cardId   = card.id;

    const back = document.createElement('div');
    back.className = 'card-back';
    back.setAttribute('aria-hidden', 'true');

    const front = document.createElement('div');
    front.className = 'card-front';
    front.setAttribute('aria-hidden', 'true');

    const emoji = document.createElement('span');
    emoji.className = 'card-emoji';
    emoji.textContent = card.emoji;

    const label = document.createElement('span');
    label.className = 'card-label';
    label.textContent = card.label;

    front.appendChild(emoji);
    front.appendChild(label);
    inner.appendChild(back);
    inner.appendChild(front);
    wrapper.appendChild(inner);

    // Click event
    wrapper.addEventListener('click', () => handleCardClick(wrapper, card));
    // Keyboard event
    wrapper.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(wrapper, card);
      }
    });

    board.appendChild(wrapper);
  });
}

/* ── Card Click Handler ── */
function handleCardClick(wrapper, card) {
  if (state.locked) return;
  const inner = wrapper.querySelector('.memory-card');

  // Ignore already matched or already flipped
  if (inner.dataset.matched === 'true') return;
  if (state.flipped.includes(card.instanceId)) return;
  if (state.flipped.length >= 2) return;

  // Start timer on first click
  if (!state.started) {
    startTimer();
    state.started = true;
  }

  // Flip the card
  flipCard(wrapper, inner, card, true);
  state.flipped.push(card.instanceId);

  wrapper.setAttribute('aria-label', `Card — ${card.label}`);

  if (state.flipped.length === 2) {
    state.moves++;
    updateStats();
    checkMatch();
  }
}

function flipCard(wrapper, inner, card, faceUp) {
  inner.dataset.flipped = faceUp ? 'true' : 'false';
}

/* ── Match Logic ── */
function checkMatch() {
  const [id1, id2] = state.flipped;
  const card1 = state.deck.find(c => c.instanceId === id1);
  const card2 = state.deck.find(c => c.instanceId === id2);

  if (card1.id === card2.id) {
    // Match!
    state.locked = true;
    setTimeout(() => {
      [id1, id2].forEach(iid => {
        const el = board.querySelector(`[data-instance-id="${iid}"]`);
        if (el) {
          const inner = el.querySelector('.memory-card');
          inner.dataset.matched = 'true';
          el.setAttribute('aria-label', `Matched — ${card1.label}`);
        }
      });
      state.matched.add(String(card1.id));
      state.flipped = [];
      state.locked  = false;
      updateStats();
      announce(`${card1.label} matched! ${state.matched.size} pairs found.`);

  if (state.matched.size === state.deck.length / 2) {
        handleWin();
      }
    }, 400);
  } else {
    // No match — flip back after delay
    state.locked = true;
    setTimeout(() => {
      state.flipped.forEach(iid => {
        const el = board.querySelector(`[data-instance-id="${iid}"]`);
        if (el) {
          const inner = el.querySelector('.memory-card');
          inner.dataset.flipped = 'false';
          el.setAttribute('aria-label', 'Card — face down');
        }
      });
      state.flipped = [];
      state.locked  = false;
    }, 950);
  }
}

/* Fix: wrapper uses data-instance-id not data-instanceId */
// Patch: ensure renderBoard uses data-instance-id consistently
// (already done above with wrapper.dataset.instanceId which maps to data-instance-id)

/* ── Win ── */
function handleWin() {
  clearInterval(state.timerInterval);
  const { pairs } = DIFFICULTY[state.difficulty];
  const isNew = saveHighScore(state.difficulty, state.moves, state.timer);

  const timeStr = formatTime(state.timer);
  winMsg.textContent = `${state.playerName} — ${state.moves} moves · ${timeStr}`;
  if (isNew) {
    winMsg.textContent += ' 🏆 New Best!';
    announce(`You win! New high score: ${state.moves} moves in ${timeStr}`);
  } else {
    announce(`You win! ${state.moves} moves in ${timeStr}`);
  }

  renderHighScore();
  showWinToast();
}

/* ── Timer ── */
function startTimer() {
  state.timerInterval = setInterval(() => {
    state.timer++;
    updateTimerDisplay();
  }, 1000);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  if (timerEl) timerEl.textContent = formatTime(state.timer);
}

/* ── Stats Update ── */
function updateStats() {
  if (movesEl)   movesEl.textContent   = state.moves;
  if (matchesEl) matchesEl.textContent = `${state.matched.size} / ${state.deck.length / 2}`;
  updateTimerDisplay();
  updateProgress();
}

function updateProgress() {
  const total = state.deck.length / 2;
  const pct   = total > 0 ? Math.round((state.matched.size / total) * 100) : 0;
  if (progressBar) {
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);
  }
  if (progressPct) progressPct.textContent = pct + '%';
}

/* ── High Score Display ── */
function renderHighScore() {
  const hs = getHighScore(state.difficulty);
  if (highBadge) {
    if (hs) {
      highBadge.textContent = `★ Best: ${hs.moves} moves · ${formatTime(hs.time)}`;
      highBadge.style.display = '';
    } else {
      highBadge.style.display = 'none';
    }
  }
}

/* ── Player Label ── */
function updatePlayerLabel() {
  if (playerLabel) playerLabel.textContent = state.playerName;
}

/* ── Win Toast ── */
function showWinToast() {
  if (winToast) {
    winToast.classList.add('show');
    winToast.setAttribute('aria-hidden', 'false');
    setTimeout(() => winToast.classList.remove('show'), 6000);
  }
}

function hideWinToast() {
  if (winToast) {
    winToast.classList.remove('show');
    winToast.setAttribute('aria-hidden', 'true');
  }
}

/* ── Announce (aria-live) ── */
function announce(msg) {
  if (liveRegion) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = msg; });
  }
}

/* ── Theme ── */
export function applyTheme(theme) {
  document.body.classList.remove('theme-nebula', 'theme-aurora');
  if (theme && theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }
  state.theme = theme;
}

/* ── Controls ── */
function bindControls() {
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      startNewGame();
      announce('New game started.');
    });
  }
}

/* ── Settings Form (with Constraint Validation API) ── */
function bindSettingsForm() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    handleSettingsSubmit(form);
  });
}

function handleSettingsSubmit(form) {
  let valid = true;

  // Validate player name
  const nameInput = form.querySelector('#input-name');
  const nameError = form.querySelector('#error-name');
  if (!nameInput.checkValidity()) {
    nameError.textContent = nameInput.validity.valueMissing
      ? 'Please enter your name.'
      : 'Name must be 2–20 characters.';
    nameError.style.display = 'block';
    nameInput.classList.add('was-validated');
    valid = false;
  } else {
    nameError.style.display = 'none';
    nameInput.classList.remove('was-validated');
  }

  if (!valid) return;

  const prefs = {
    name:       nameInput.value.trim(),
    difficulty: form.querySelector('#input-difficulty').value,
    theme:      form.querySelector('#input-theme').value,
  };

  state.playerName = prefs.name;
  state.difficulty = prefs.difficulty;

  savePlayerPrefs(prefs);
  applyTheme(prefs.theme);
  updatePlayerLabel();
  renderHighScore();
  startNewGame();
  announce(`Settings saved. Starting ${prefs.difficulty} game for ${prefs.name}.`);

  // Close modal
  const modal = document.getElementById('settingsModal');
  const bsModal = bootstrap.Modal.getInstance(modal);
  if (bsModal) bsModal.hide();
}

/* ── Easter Egg ── */
function easterEgg() {
  document.body.classList.remove('theme-nebula', 'theme-aurora');
  document.body.style.setProperty('--color-accent', '#ff0080');
  document.body.style.setProperty('--color-accent2', '#00ff80');
  document.body.style.setProperty('--color-accent3', '#0080ff');
  document.body.style.setProperty('--color-bg', '#050505');
  console.log('%c🎉 VAPORWAVE MODE ACTIVATED 🎉', 'color:#ff0080;font-size:1.4em;font-weight:bold;');
  announce('Vaporwave secret theme activated!');
}
