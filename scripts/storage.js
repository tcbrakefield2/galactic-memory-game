/**
 * storage.js — Persistence module
 * Handles localStorage and cookies for:
 *  - Player name
 *  - High scores per difficulty
 *  - Theme preference
 */

const LS_PREFIX = 'galacticMemory_';

/* ── localStorage helpers ── */

export function saveToLocal(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] localStorage write failed:', e);
  }
}

export function loadFromLocal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

/* ── Cookie helpers ── */

/**
 * Set a cookie with path and expiry (days).
 * @param {string} name
 * @param {string} value
 * @param {number} days
 */
export function setCookie(name, value, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${LS_PREFIX}${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

export function getCookie(name) {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(LS_PREFIX + name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/* ── High Score logic ── */

export function getHighScore(difficulty) {
  const scores = loadFromLocal('highScores', {});
  return scores[difficulty] ?? null;
}

/**
 * Save a new high score if it beats the stored one.
 * High score = fewest moves wins. Lower is better.
 * @param {string} difficulty
 * @param {number} moves
 * @param {number} timeSeconds
 * @returns {boolean} true if new high score
 */
export function saveHighScore(difficulty, moves, timeSeconds) {
  const scores = loadFromLocal('highScores', {});
  const current = scores[difficulty];
  const isNew = !current || moves < current.moves || (moves === current.moves && timeSeconds < current.time);
  if (isNew) {
    scores[difficulty] = { moves, time: timeSeconds, date: new Date().toLocaleDateString() };
    saveToLocal('highScores', scores);
  }
  return isNew;
}

/* ── Player & Preferences ── */

export function savePlayerPrefs(prefs) {
  // Name saved as cookie (30 days)
  if (prefs.name) setCookie('playerName', prefs.name, 30);
  // Theme & difficulty in localStorage
  saveToLocal('prefs', prefs);
}

export function loadPlayerPrefs() {
  const stored = loadFromLocal('prefs', {});
  const cookieName = getCookie('playerName');
  if (cookieName && !stored.name) stored.name = cookieName;
  return stored;
}
