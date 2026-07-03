const { Card, SUITS, RANKS } = require('./Card');

class Deck {
  constructor() {
    this.cards = [];
    this._build();
    this.shuffle();
  }

  _build() {
    for (let deckNum = 0; deckNum < 2; deckNum++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(suit, rank, false, deckNum));
        }
      }
      // 2 Jolly pro Deck = 4 insgesamt
      this.cards.push(new Card(null, null, true, deckNum));
      this.cards.push(new Card(null, null, true, deckNum));
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    return this.cards.pop();
  }

  get size() {
    return this.cards.length;
  }

  isEmpty() {
    return this.cards.length === 0;
  }

  // Wenn der Nachziehstapel leer ist, wird der Ablagestapel (ohne oberste Karte)
  // gemischt und wird zum neuen Nachziehstapel
  refillFromDiscard(discardPile) {
    if (discardPile.length <= 1) return false;
    const top = discardPile.pop();
    this.cards = [...discardPile];
    this.shuffle();
    discardPile.length = 0;
    discardPile.push(top);
    return true;
  }
}

module.exports = Deck;
