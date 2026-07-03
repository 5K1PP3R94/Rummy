const Deck = require('../models/Deck');
const { validateMeld, canExchangeJoker, MIN_MELD_SIZE } = require('../models/Meld');

const HANDS_PER_ROUND = 5;
const CARDS_PER_PLAYER = 7;

let meldIdCounter = 0;

class GameEngine {
  constructor(players) {
    this.players = players; // Array<Player>, Reihenfolge = Sitzordnung
    this.handNumber = 0;
    this.roundOver = false;
    this.log = [];
    this._newHandState();
  }

  _newHandState() {
    this.deck = new Deck();
    this.discardPile = [];
    this.table = []; // { id, ownerId, cards: [Card] }
    this.currentPlayerIndex = this.handNumber % this.players.length; // Geber wechselt
    this.phase = 'DRAW'; // DRAW -> ACTIONS -> DISCARD
    this.handOver = false;
    this.handWinnerId = null;

    for (const p of this.players) {
      p.hand = [];
    }
    for (let i = 0; i < CARDS_PER_PLAYER; i++) {
      for (const p of this.players) {
        p.addCards([this.deck.draw()]);
      }
    }
    this.discardPile.push(this.deck.draw());
    this.handNumber += 1;
    this._addLog(`Hand ${this.handNumber} gestartet. ${this.players[this.currentPlayerIndex].name} beginnt.`);
  }

  _addLog(msg) {
    this.log.push({ t: Date.now(), msg });
    if (this.log.length > 200) this.log.shift();
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  _ensureTurn(playerId) {
    if (this.handOver) throw new Error('Hand ist bereits vorbei');
    if (this.currentPlayer.id !== playerId) throw new Error('Nicht am Zug');
  }

  // ---- Ziehen ----

  drawFromStock(playerId) {
    this._ensureTurn(playerId);
    if (this.phase !== 'DRAW') throw new Error('Schon gezogen, jetzt auslegen oder ablegen');

    if (this.deck.isEmpty()) {
      const refilled = this.deck.refillFromDiscard(this.discardPile);
      if (!refilled) throw new Error('Nachziehstapel und Ablage leer');
      this._addLog('Nachziehstapel neu gemischt aus Ablage.');
    }
    const card = this.deck.draw();
    this.currentPlayer.addCards([card]);
    this.phase = 'ACTIONS';
    this._addLog(`${this.currentPlayer.name} zieht vom Stapel.`);
    return card;
  }

  drawFromDiscard(playerId) {
    this._ensureTurn(playerId);
    if (this.phase !== 'DRAW') throw new Error('Schon gezogen, jetzt auslegen oder ablegen');
    if (this.discardPile.length === 0) throw new Error('Ablagestapel ist leer');

    const card = this.discardPile.pop();
    this.currentPlayer.addCards([card]);
    this.phase = 'ACTIONS';
    this._addLog(`${this.currentPlayer.name} nimmt ${card} von der Ablage.`);
    return card;
  }

  // ---- Auslegen (neuer Meld) ----

  meld(playerId, cardIds) {
    this._ensureTurn(playerId);
    if (this.phase !== 'ACTIONS') throw new Error('Erst ziehen, bevor ausgelegt werden kann');
    if (cardIds.length < MIN_MELD_SIZE) throw new Error(`Mindestens ${MIN_MELD_SIZE} Karten nötig`);

    const player = this.currentPlayer;
    const cards = cardIds.map((id) => player.hand.find((c) => c.id === id));
    if (cards.some((c) => !c)) throw new Error('Karte nicht auf der Hand');

    const result = validateMeld(cards);
    if (!result.valid) throw new Error(result.reason);

    player.removeCards(cardIds);
    const meldEntry = { id: `m${meldIdCounter++}`, ownerId: player.id, cards };
    this.table.push(meldEntry);
    this._addLog(`${player.name} legt ${result.type === 'set' ? 'einen Satz' : 'eine Straße'} aus (${cards.map((c) => c.toString()).join(',')}).`);
    this._checkHandEnd();
    return meldEntry;
  }

  // ---- Anlegen an bestehenden Meld ----

  layOff(playerId, meldId, cardId) {
    this._ensureTurn(playerId);
    if (this.phase !== 'ACTIONS') throw new Error('Erst ziehen, bevor angelegt werden kann');

    const player = this.currentPlayer;
    const card = player.hand.find((c) => c.id === cardId);
    if (!card) throw new Error('Karte nicht auf der Hand');

    const meldEntry = this.table.find((m) => m.id === meldId);
    if (!meldEntry) throw new Error('Meld nicht gefunden');

    // versuche Karte vorne oder hinten anzuhängen (Reihenfolge bei Sätzen egal)
    const attempts = [
      [...meldEntry.cards, card],
      [card, ...meldEntry.cards],
    ];
    let success = null;
    for (const trial of attempts) {
      const result = validateMeld(trial);
      if (result.valid) {
        success = trial;
        break;
      }
    }
    if (!success) throw new Error('Karte passt nicht an diesen Meld');

    player.removeCard(cardId);
    meldEntry.cards = success;
    this._addLog(`${player.name} legt ${card.toString()} an.`);
    this._checkHandEnd();
    return meldEntry;
  }

  // ---- Jolly-Austausch ----

  exchangeJoker(playerId, meldId, replacementCardId) {
    this._ensureTurn(playerId);
    if (this.phase !== 'ACTIONS') throw new Error('Erst ziehen, bevor getauscht werden kann');

    const player = this.currentPlayer;
    const replacement = player.hand.find((c) => c.id === replacementCardId);
    if (!replacement) throw new Error('Karte nicht auf der Hand');

    const meldEntry = this.table.find((m) => m.id === meldId);
    if (!meldEntry) throw new Error('Meld nicht gefunden');

    const result = canExchangeJoker(meldEntry.cards, replacement);
    if (!result) throw new Error('Jolly kann hier nicht getauscht werden');

    player.removeCard(replacementCardId);
    meldEntry.cards = result.newMeldCards;
    player.addCards([result.removedJoker]);
    this._addLog(`${player.name} tauscht Jolly gegen ${replacement.toString()}.`);
    return meldEntry;
  }

  // ---- Ablegen (Zugende) ----

  discard(playerId, cardId) {
    this._ensureTurn(playerId);
    if (this.phase !== 'ACTIONS') throw new Error('Erst ziehen, bevor abgelegt werden kann');

    const player = this.currentPlayer;
    const card = player.removeCard(cardId);
    if (!card) throw new Error('Karte nicht auf der Hand');

    this.discardPile.push(card);
    this._addLog(`${player.name} legt ${card.toString()} ab.`);

    if (player.hand.length === 0) {
      this._endHand(player);
      return { handOver: true };
    }

    this._advanceTurn();
    return { handOver: false };
  }

  _checkHandEnd() {
    // Wird nach meld/layOff aufgerufen - falls Hand dadurch schon leer ist
    // (z.B. letzte Karten alle ausgelegt, kein Ablegen nötig weil 0 Karten übrig)
    if (this.currentPlayer.hand.length === 0) {
      this._endHand(this.currentPlayer);
    }
  }

  _advanceTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.phase = 'DRAW';
  }

  _endHand(winner) {
    this.handOver = true;
    this.handWinnerId = winner.id;
    let totalFromLosers = 0;
    const breakdown = [];
    for (const p of this.players) {
      if (p.id === winner.id) continue;
      const val = p.handValue();
      totalFromLosers += val;
      breakdown.push({ playerId: p.id, name: p.name, restwert: val });
    }
    winner.score += totalFromLosers;
    this._addLog(`${winner.name} beendet die Hand! Gutschrift: ${totalFromLosers} Punkte (Stand: ${winner.score}).`);

    if (this.handNumber >= HANDS_PER_ROUND) {
      this.roundOver = true;
      this._addLog('Runde beendet nach 5 Händen.');
    }

    return { totalFromLosers, breakdown };
  }

  startNextHand() {
    if (this.roundOver) throw new Error('Runde ist bereits vorbei');
    this._newHandState();
  }

  getRoundWinner() {
    if (!this.roundOver) return null;
    return [...this.players].sort((a, b) => b.score - a.score)[0];
  }

  // ---- Serialisierung für Client ----

  getState(forPlayerId) {
    return {
      handNumber: this.handNumber,
      handsPerRound: HANDS_PER_ROUND,
      roundOver: this.roundOver,
      handOver: this.handOver,
      handWinnerId: this.handWinnerId,
      phase: this.phase,
      currentPlayerId: this.currentPlayer.id,
      stockCount: this.deck.size,
      discardTop: this.discardPile.length ? this.discardPile[this.discardPile.length - 1].toJSON() : null,
      discardCount: this.discardPile.length,
      table: this.table.map((m) => ({ id: m.id, ownerId: m.ownerId, cards: m.cards.map((c) => c.toJSON()) })),
      players: this.players.map((p) => p.toJSON(p.id === forPlayerId)),
      log: this.log.slice(-30),
    };
  }
}

module.exports = { GameEngine, HANDS_PER_ROUND, CARDS_PER_PLAYER };
