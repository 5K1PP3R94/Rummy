class Player {
  constructor(id, name, isAI = false, difficulty = 'medium') {
    this.id = id;
    this.name = name;
    this.isAI = isAI;
    this.difficulty = difficulty; // easy | medium | hard
    this.hand = [];
    this.score = 0; // Punktekonto über die Runde (5 Hände)
  }

  addCards(cards) {
    this.hand.push(...cards);
  }

  removeCard(cardId) {
    const idx = this.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return null;
    return this.hand.splice(idx, 1)[0];
  }

  removeCards(cardIds) {
    const removed = [];
    for (const id of cardIds) {
      const c = this.removeCard(id);
      if (c) removed.push(c);
    }
    return removed;
  }

  handValue() {
    return this.hand.reduce((sum, c) => sum + c.value, 0);
  }

  toJSON(revealHand = false) {
    return {
      id: this.id,
      name: this.name,
      isAI: this.isAI,
      score: this.score,
      cardCount: this.hand.length,
      hand: revealHand ? this.hand.map((c) => c.toJSON()) : undefined,
    };
  }
}

module.exports = Player;
