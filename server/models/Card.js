const SUITS = ['H', 'D', 'C', 'S']; // Herz, Karo, Kreuz/Treff, Pik
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RANK_ORDER = RANKS.reduce((acc, r, i) => {
  acc[r] = i; // A=0 (niedrigster Wert), K=12
  return acc;
}, {});

const RANK_VALUE = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 10, Q: 10, K: 10,
};

let cardIdCounter = 0;

class Card {
  constructor(suit, rank, isJoker = false, deckNum = 0) {
    this.id = `c${cardIdCounter++}`;
    this.isJoker = isJoker;
    this.suit = isJoker ? null : suit;
    this.rank = isJoker ? null : rank;
    this.deckNum = deckNum; // welches der 2 Decks (0/1) - nur informativ
    this.value = isJoker ? 0 : RANK_VALUE[rank];
  }

  get rankOrder() {
    return this.isJoker ? null : RANK_ORDER[this.rank];
  }

  toString() {
    if (this.isJoker) return 'JOLLY';
    return `${this.rank}${this.suit}`;
  }

  toJSON() {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      isJoker: this.isJoker,
      value: this.value,
    };
  }
}

module.exports = { Card, SUITS, RANKS, RANK_ORDER, RANK_VALUE };
