/**
 * cards.js — Card data module
 * Array of objects representing all game cards.
 * Each card has an id, emoji, and label.
 * Used to dynamically render the game board.
 */

export const CARD_DATA = [
  { id: 1,  emoji: '🌌', label: 'Galaxy'    },
  { id: 2,  emoji: '🪐', label: 'Saturn'    },
  { id: 3,  emoji: '⭐', label: 'Star'       },
  { id: 4,  emoji: '🌙', label: 'Moon'       },
  { id: 5,  emoji: '☄️', label: 'Comet'      },
  { id: 6,  emoji: '🚀', label: 'Rocket'     },
  { id: 7,  emoji: '👾', label: 'Alien'      },
  { id: 8,  emoji: '🛸', label: 'UFO'        },
  { id: 9,  emoji: '🌠', label: 'Shooting Star' },
  { id: 10, emoji: '🔭', label: 'Telescope'  },
  { id: 11, emoji: '🌍', label: 'Earth'      },
  { id: 12, emoji: '💫', label: 'Sparkle'    },
  { id: 13, emoji: '🌟', label: 'Glowing Star' },
  { id: 14, emoji: '🪨', label: 'Asteroid'   },
  { id: 15, emoji: '🌀', label: 'Nebula'     },
  { id: 16, emoji: '🔮', label: 'Crystal'    },
  { id: 17, emoji: '⚡', label: 'Energy'     },
  { id: 18, emoji: '🌈', label: 'Aurora'     },
  { id: 19, emoji: '🎇', label: 'Firework'   },
  { id: 20, emoji: '🌊', label: 'Wave'       },
];

/**
 * DIFFICULTY SETTINGS
 * Returns how many pairs and grid columns for each difficulty.
 */
export const DIFFICULTY = {
  easy:   { pairs: 6,  cols: 4 },
  medium: { pairs: 10, cols: 5 },
  hard:   { pairs: 18, cols: 6 },
};

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * @param {Array} array
 * @returns {Array} new shuffled array
 */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a deck for the given difficulty.
 * Picks `pairs` cards at random, duplicates them, shuffles.
 * @param {string} difficulty 'easy' | 'medium' | 'hard'
 * @returns {Array} array of card objects with unique instanceId
 */
export function buildDeck(difficulty = 'medium') {
  const { pairs } = DIFFICULTY[difficulty];
  const selected = shuffle(CARD_DATA).slice(0, pairs);

  const deck = [];
  selected.forEach(card => {
    deck.push({ ...card, instanceId: `${card.id}-a` });
    deck.push({ ...card, instanceId: `${card.id}-b` });
  });

  return shuffle(deck);
}
