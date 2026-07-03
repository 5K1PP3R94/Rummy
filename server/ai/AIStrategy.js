const { validateMeld } = require('../models/Meld');
const { RANK_ORDER } = require('../models/Card');

// Wie viele Karten muss die KI mindestens noch behalten wollen, bevor sie
// riskante Melds eingeht (grober Dial für Schwierigkeitsgrad)
const DIFFICULTY_JOKER_WILLINGNESS = { easy: 0, medium: 1, hard: 2 };

function groupBy(cards, keyFn) {
  const map = new Map();
  for (const c of cards) {
    const key = keyFn(c);
    if (key === null) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return map;
}

/**
 * Sucht in der Hand nach auslegbaren Sätzen/Straßen (ohne Jolly-Einsatz zunächst,
 * bei hard/medium danach auch mit Jolly falls vorhanden).
 * Gibt eine Liste von Kartenlisten zurück (jede Liste = 1 gültiger Meld).
 */
function findMelds(hand, difficulty) {
  const jokers = hand.filter((c) => c.isJoker);
  const real = hand.filter((c) => !c.isJoker);
  const used = new Set();
  const melds = [];
  let jokerPool = [...jokers];

  // 1) Sätze: gleicher Rang, verschiedene Farben
  const byRank = groupBy(real, (c) => c.rank);
  for (const [, group] of byRank) {
    const distinctSuit = [];
    const seenSuits = new Set();
    for (const c of group) {
      if (!seenSuits.has(c.suit)) {
        seenSuits.add(c.suit);
        distinctSuit.push(c);
      }
    }
    if (distinctSuit.length >= 3) {
      const take = distinctSuit.slice(0, 4);
      take.forEach((c) => used.add(c.id));
      melds.push(take);
    } else if (distinctSuit.length === 2 && jokerPool.length > 0 && DIFFICULTY_JOKER_WILLINGNESS[difficulty] > 0) {
      const j = jokerPool.pop();
      distinctSuit.forEach((c) => used.add(c.id));
      used.add(j.id);
      melds.push([...distinctSuit, j]);
    }
  }

  // 2) Straßen: gleiche Farbe, fortlaufend
  const bySuit = groupBy(real.filter((c) => !used.has(c.id)), (c) => c.suit);
  for (const [, group] of bySuit) {
    const sorted = [...group].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    let run = [];
    const flushRun = () => {
      if (run.length >= 3) {
        run.forEach((c) => used.add(c.id));
        melds.push([...run]);
      } else if (run.length === 2 && jokerPool.length > 0 && DIFFICULTY_JOKER_WILLINGNESS[difficulty] > 0) {
        const j = jokerPool.pop();
        run.forEach((c) => used.add(c.id));
        used.add(j.id);
        melds.push([...run, j]);
      }
      run = [];
    };
    for (let i = 0; i < sorted.length; i++) {
      if (run.length === 0 || RANK_ORDER[sorted[i].rank] === RANK_ORDER[run[run.length - 1].rank] + 1) {
        run.push(sorted[i]);
      } else {
        flushRun();
        run = [sorted[i]];
      }
    }
    flushRun();
  }

  return melds;
}

/**
 * Prüft ob eine Karte an einen bestehenden Tisch-Meld angelegt werden kann.
 */
function findLayOff(card, table) {
  for (const meldEntry of table) {
    const attempts = [[...meldEntry.cards, card], [card, ...meldEntry.cards]];
    for (const trial of attempts) {
      if (validateMeld(trial).valid) return meldEntry;
    }
  }
  return null;
}

/**
 * Entscheidet, ob die KI die Ablage-Karte oder vom Stapel zieht.
 */
function decideDrawSource(player, engine) {
  const topDiscard = engine.discardPile[engine.discardPile.length - 1];
  if (!topDiscard) return 'stock';

  const hypotheticalHand = [...player.hand, topDiscard];
  const meldsWithCard = findMelds(hypotheticalHand, player.difficulty).filter((m) =>
    m.some((c) => c.id === topDiscard.id)
  );
  if (meldsWithCard.length > 0) return 'discard';

  if (findLayOff(topDiscard, engine.table)) return 'discard';

  return 'stock';
}

/**
 * Wählt die "unnützeste" Karte zum Ablegen: die, die am wenigsten zu
 * potenziellen Melds beiträgt und niemandem am Tisch offensichtlich hilft.
 */
function chooseDiscard(hand, table) {
  const scored = hand.map((c) => {
    let score = 0;
    // Jolly nie freiwillig ablegen
    if (c.isJoker) score += 1000;
    // Karten, die zu einem Tisch-Meld passen würden, sind riskant abzulegen
    if (!c.isJoker && findLayOff(c, table)) score += 50;
    // Karten mit Nachbarn in der Hand (gleicher Rang oder Nachbarwert gleicher Farbe) sind wertvoller
    const neighbors = hand.filter((o) => o.id !== c.id && !o.isJoker && !c.isJoker);
    const sameRank = neighbors.filter((o) => o.rank === c.rank).length;
    const sameSuitAdjacent = neighbors.filter(
      (o) => o.suit === c.suit && Math.abs(RANK_ORDER[o.rank] - RANK_ORDER[c.rank]) <= 2
    ).length;
    score += sameRank * 10 + sameSuitAdjacent * 5;
    // hoher Kartenwert = im Ablegen tendenziell eher loswerden, wenn sonst gleich nützlich
    score -= c.value * 0.1;
    return { card: c, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0].card;
}

/**
 * Führt einen kompletten KI-Zug aus: ziehen, auslegen/anlegen, ablegen.
 * `emit` ist ein optionaler Callback für UI-Verzögerungen/Logging pro Schritt.
 */
function playAITurn(engine, player) {
  const difficulty = player.difficulty || 'medium';

  const source = decideDrawSource(player, engine);
  if (source === 'discard') {
    engine.drawFromDiscard(player.id);
  } else {
    engine.drawFromStock(player.id);
  }

  if (engine.handOver) return;

  // Eigene neue Melds auslegen
  let melds = findMelds(player.hand, difficulty);
  for (const meldCards of melds) {
    try {
      engine.meld(player.id, meldCards.map((c) => c.id));
    } catch (e) {
      // Karte evtl. schon in vorherigem Meld verplant -> ignorieren
    }
    if (engine.handOver) return;
  }

  // Übrige Karten an bestehende Tisch-Melds anlegen
  let progress = true;
  while (progress) {
    progress = false;
    for (const card of [...player.hand]) {
      const target = findLayOff(card, engine.table);
      if (target) {
        try {
          engine.layOff(player.id, target.id, card.id);
          progress = true;
        } catch (e) {
          // passt doch nicht (Randfall) -> weiter
        }
        if (engine.handOver) return;
      }
    }
  }

  if (engine.handOver) return;

  // Ablegen
  const discardCard = chooseDiscard(player.hand, engine.table);
  engine.discard(player.id, discardCard.id);
}

module.exports = { playAITurn, findMelds, findLayOff, decideDrawSource, chooseDiscard };
