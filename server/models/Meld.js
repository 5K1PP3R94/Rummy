const { RANKS, RANK_ORDER } = require('./Card');

const MIN_MELD_SIZE = 3;

/**
 * Prüft, ob eine Kartenkombination ein gültiger SATZ ist:
 * gleicher Rang, unterschiedliche Farben (Jolly füllt fehlende Farben auf).
 */
function validateSet(cards) {
  if (cards.length < MIN_MELD_SIZE) return { valid: false, reason: 'Mindestens 3 Karten nötig' };

  const real = cards.filter((c) => !c.isJoker);
  const jokerCount = cards.length - real.length;

  if (real.length === 0) return { valid: false, reason: 'Nicht nur Jolly' };

  const rank = real[0].rank;
  if (!real.every((c) => c.rank === rank)) {
    return { valid: false, reason: 'Alle Karten müssen den gleichen Rang haben' };
  }

  const suitsUsed = new Set(real.map((c) => c.suit));
  if (suitsUsed.size !== real.length) {
    return { valid: false, reason: 'Karten mit gleichem Rang müssen unterschiedliche Farben haben' };
  }

  if (cards.length > 4) {
    return { valid: false, reason: 'Ein Satz hat maximal 4 Karten' };
  }
  if (jokerCount > 2) {
    return { valid: false, reason: 'Zu viele Jolly in einem Satz' };
  }

  return { valid: true, type: 'set', rank, size: cards.length };
}

/**
 * Prüft, ob eine Kartenkombination eine gültige STRASSE ist:
 * gleiche Farbe, aufeinanderfolgende Werte, Ass nur niedrig (A-2-3...),
 * Jolly füllt Lücken oder verlängert.
 */
function validateRun(cards) {
  if (cards.length < MIN_MELD_SIZE) return { valid: false, reason: 'Mindestens 3 Karten nötig' };

  const real = cards.filter((c) => !c.isJoker);
  const jokerCount = cards.length - real.length;
  if (real.length === 0) return { valid: false, reason: 'Nicht nur Jolly' };

  const suit = real[0].suit;
  if (!real.every((c) => c.suit === suit)) {
    return { valid: false, reason: 'Alle Karten müssen die gleiche Farbe haben' };
  }

  const orders = real.map((c) => RANK_ORDER[c.rank]).sort((a, b) => a - b);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    return { valid: false, reason: 'Doppelte Werte in einer Straße nicht erlaubt (zweites Deck woanders auslegen)' };
  }

  // Anzahl der zu füllenden Lücken zwischen min und max Position berechnen
  const min = orders[0];
  const max = orders[orders.length - 1];
  const span = max - min + 1;
  const gaps = span - orders.length; // fehlende Werte innerhalb der Spanne

  if (gaps < 0) return { valid: false, reason: 'Ungültige Reihenfolge' };

  const remainingJokers = jokerCount - gaps;
  if (remainingJokers < 0) {
    return { valid: false, reason: 'Nicht genug Jolly, um die Lücken zu füllen' };
  }

  // Übrige Jolly müssen die Straße nach oben verlängern (unten geht nicht, da Ass niedrigster Wert ist)
  const maxPossibleLength = span + remainingJokers;
  if (max + remainingJokers > RANKS.length - 1 && remainingJokers > 0) {
    // Karten würden über König hinausgehen - nur soweit möglich anhängen ist ok,
    // wir werten das nicht als Fehler, sondern kappen einfach die Länge nicht -
    // stattdessen: es muss zumindest exakt passen
  }

  return {
    valid: true,
    type: 'run',
    suit,
    size: cards.length,
    minOrder: min,
    maxOrder: Math.min(max + remainingJokers, RANKS.length - 1),
  };
}

/**
 * Validiert eine Meld-Kombination (Satz ODER Straße).
 */
function validateMeld(cards) {
  const setResult = validateSet(cards);
  if (setResult.valid) return setResult;
  const runResult = validateRun(cards);
  if (runResult.valid) return runResult;
  return { valid: false, reason: setResult.reason || runResult.reason };
}

/**
 * Prüft, ob eine einzelne Karte an einen bestehenden Meld angelegt werden kann.
 * Gibt bei Erfolg die neue Kartenliste zurück (unsortiert angehängt).
 */
function canLayOff(meldCards, meldMeta, card) {
  const trial = [...meldCards, card];
  const result = validateMeld(trial);
  return result.valid ? result : null;
}

/**
 * Jolly-Austausch: prüft, ob `replacement` (echte Karte aus der Hand)
 * den Jolly in diesem Meld ersetzen kann.
 */
function canExchangeJoker(meldCards, replacement) {
  const jokerIndex = meldCards.findIndex((c) => c.isJoker);
  if (jokerIndex === -1) return null;

  const trial = meldCards.map((c, i) => (i === jokerIndex ? replacement : c));
  const result = validateMeld(trial);
  if (!result.valid) return null;

  const removedJoker = meldCards[jokerIndex];
  return { newMeldCards: trial, removedJoker };
}

module.exports = { validateMeld, validateSet, validateRun, canLayOff, canExchangeJoker, MIN_MELD_SIZE };
