const { GameEngine } = require('./GameEngine');
const Player = require('../models/Player');
const { playAITurn } = require('../ai/AIStrategy');

const AI_NAMES = ['KI-Franz', 'KI-Resi', 'KI-Sepp'];
const AI_TURN_DELAY_MS = 900;

class GameManager {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // socketId -> { engine, humanPlayerId }
  }

  createSession(socketId, humanName, difficulty = 'medium') {
    const human = new Player('human', humanName || 'Spieler', false);
    const ais = AI_NAMES.map((name, i) => new Player(`ai${i}`, name, true, difficulty));
    const players = [human, ais[0], ais[1], ais[2]];
    const engine = new GameEngine(players);
    this.sessions.set(socketId, { engine, humanPlayerId: human.id });
    this._maybeRunAI(socketId);
    return engine;
  }

  getSession(socketId) {
    return this.sessions.get(socketId);
  }

  removeSession(socketId) {
    this.sessions.delete(socketId);
  }

  _emitState(socketId) {
    const session = this.sessions.get(socketId);
    if (!session) return;
    this.io.to(socketId).emit('state', session.engine.getState(session.humanPlayerId));
  }

  // Nach jedem menschlichen Zug prüfen wir, ob die KI dran ist, und lassen sie
  // (mit kleiner Verzögerung, damit es am UI nachvollziehbar aussieht) spielen.
  _maybeRunAI(socketId) {
    const session = this.sessions.get(socketId);
    if (!session) return;
    const { engine } = session;

    if (engine.roundOver || engine.handOver) {
      this._emitState(socketId);
      return;
    }

    if (!engine.currentPlayer.isAI) {
      this._emitState(socketId);
      return;
    }

    this._emitState(socketId);
    setTimeout(() => {
      const s = this.sessions.get(socketId);
      if (!s) return;
      try {
        playAITurn(s.engine, s.engine.currentPlayer);
      } catch (e) {
        // Falls die KI-Heuristik in einem Randfall keinen Zug zustande bringt,
        // versuchen wir einen Notfall-Zug: ziehen + irgendeine Karte ablegen.
        this._emergencyAIMove(s.engine);
      }
      this._maybeRunAI(socketId);
    }, AI_TURN_DELAY_MS);
  }

  _emergencyAIMove(engine) {
    const player = engine.currentPlayer;
    try {
      if (engine.phase === 'DRAW') engine.drawFromStock(player.id);
      if (!engine.handOver && player.hand.length > 0) {
        engine.discard(player.id, player.hand[0].id);
      }
    } catch (e) {
      // letzte Rettung: nichts tun, State bleibt wie er ist
    }
  }

  handleAction(socketId, action) {
    const session = this.sessions.get(socketId);
    if (!session) throw new Error('Keine aktive Session');
    const { engine, humanPlayerId } = session;

    switch (action.type) {
      case 'DRAW_STOCK':
        engine.drawFromStock(humanPlayerId);
        break;
      case 'DRAW_DISCARD':
        engine.drawFromDiscard(humanPlayerId);
        break;
      case 'MELD':
        engine.meld(humanPlayerId, action.cardIds);
        break;
      case 'LAYOFF':
        engine.layOff(humanPlayerId, action.meldId, action.cardId);
        break;
      case 'EXCHANGE_JOKER':
        engine.exchangeJoker(humanPlayerId, action.meldId, action.cardId);
        break;
      case 'DISCARD':
        engine.discard(humanPlayerId, action.cardId);
        break;
      case 'NEXT_HAND':
        engine.startNextHand();
        break;
      default:
        throw new Error('Unbekannte Aktion');
    }

    this._maybeRunAI(socketId);
  }
}

module.exports = GameManager;
