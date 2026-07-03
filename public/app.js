document.addEventListener('DOMContentLoaded', () => {
const socket = io();

const SUIT_SYMBOL = { H: '♥', D: '♦', C: '♣', S: '♠' };
const RED_SUITS = new Set(['H', 'D']);
const SUIT_ORDER = { H: 0, D: 1, C: 2, S: 3 };

let myId = 'human';
let currentState = null;
let prevState = null;
let selectedIds = new Set();
let awaitingTarget = null;
let prevMeldCardIds = new Set();
let handScores = []; // [{handNum, winnerId, winnerName, points:[{id,name,points}]}]

const el = (id) => document.getElementById(id);

/* ─── Lobby ─────────────────────────────────────────────────────────────── */
el('startBtn').addEventListener('click', () => {
  const name = el('nameInput').value.trim() || 'Spieler';
  const difficulty = el('difficultySelect').value;
  socket.emit('start_game', { name, difficulty });
  el('lobby').classList.add('hidden');
  el('game').classList.remove('hidden');
  handScores = [];
});

/* ─── Event-Delegation (alle game-Elemente erst nach DOM-Ready verfügbar) ── */
document.addEventListener('click', (e) => {
  const tid = e.target.closest('[id]')?.id || e.target.id;

  if (e.target.closest('#stockPile')) {
    if (!isMyTurn()) return;
    if (currentState.phase !== 'DRAW')
      return showToast('Schon gezogen – jetzt auslegen oder Karte ablegen.');
    sendAction({ type: 'DRAW_STOCK' });
    return;
  }

  if (e.target.closest('#discardPile')) {
    if (!isMyTurn()) return;
    if (currentState.phase === 'DRAW') {
      if (!currentState.discardTop) return showToast('Ablage ist leer.');
      sendAction({ type: 'DRAW_DISCARD' });
    } else {
      if (selectedIds.size !== 1)
        return showToast('Wähle genau 1 Karte, dann klick auf die Ablage.');
      sendAction({ type: 'DISCARD', cardId: [...selectedIds][0] });
      clearSelection();
    }
    return;
  }

  if (tid === 'meldBtn') {
    if (selectedIds.size < 3)
      return showToast('Wähle mindestens 3 Karten für einen Satz oder eine Straße.');
    sendAction({ type: 'MELD', cardIds: [...selectedIds] });
    clearSelection();
    return;
  }

  if (tid === 'jokerBtn') {
    if (selectedIds.size !== 1)
      return showToast('Wähle erst die Ersatzkarte, dann klick auf den Meld mit dem Jolly.');
    awaitingTarget = 'JOKER';
    render();
    return;
  }

  if (tid === 'nextHandBtn') {
    el('summaryModal').classList.add('hidden');
    sendAction({ type: 'NEXT_HAND' });
    return;
  }

  if (tid === 'closeSummaryBtn') {
    el('summaryModal').classList.add('hidden');
    return;
  }
});

/* ─── Utils ─────────────────────────────────────────────────────────────── */
function isMyTurn() {
  const s = currentState;
  return s && s.currentPlayerId === myId && !s.handOver && !s.roundOver;
}
function sendAction(a) { socket.emit('action', a); }
function clearSelection() { selectedIds.clear(); awaitingTarget = null; render(); }

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (t.style.display = 'none'), 3200);
}

socket.on('error_msg', (msg) => showToast(msg));

socket.on('state', (state) => {
  const prev = currentState;
  prevState = prev;
  currentState = state;

  // Selektion bereinigen
  const me = state.players.find((p) => p.id === myId);
  const handIds = new Set((me?.hand || []).map((c) => c.id));
  for (const id of [...selectedIds]) if (!handIds.has(id)) selectedIds.delete(id);

  // Animationen BEVOR render(), damit Quell-DOM noch stimmt
  runAnimations(prev, state);
  render();

  // Hand-Zusammenfassung
  if (state.handOver && prev && !prev.handOver) {
    recordHandResult(prev, state);
    setTimeout(() => showSummary(state), 700);
  }
});

/* ─── Karten-Rendering ───────────────────────────────────────────────────── */
function buildCardEl(card, { selectable = false, small = false } = {}) {
  const div = document.createElement('div');
  let cls = 'card';
  if (card.isJoker) cls += ' joker';
  else if (RED_SUITS.has(card.suit)) cls += ' red';
  if (small) cls += ' small';
  if (selectedIds.has(card.id)) cls += ' selected';
  div.className = cls;

  if (card.isJoker) {
    div.innerHTML = window.CardArt.svgJoker();
  } else if (card.rank === 'J') {
    div.innerHTML = window.CardArt.svgJack(card.suit);
  } else if (card.rank === 'Q') {
    div.innerHTML = window.CardArt.svgQueen(card.suit);
  } else if (card.rank === 'K') {
    div.innerHTML = window.CardArt.svgKing(card.suit);
  } else {
    const sym = SUIT_SYMBOL[card.suit];
    div.innerHTML = `
      <div class="corner">${card.rank}<span class="c-suit">${sym}</span></div>
      <div class="center-pip">${sym}</div>
      <div class="corner br">${card.rank}<span class="c-suit">${sym}</span></div>`;
  }

  if (selectable) {
    div.addEventListener('click', () => {
      if (selectedIds.has(card.id)) selectedIds.delete(card.id);
      else selectedIds.add(card.id);
      render();
    });
  }
  div.dataset.cardId = card.id;
  return div;
}

function buildBackEl(extraClass = '') {
  const d = document.createElement('div');
  d.className = ('card back ' + extraClass).trim();
  return d;
}

/* ─── Sortierung ─────────────────────────────────────────────────────────── */
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    if (a.isJoker !== b.isJoker) return a.isJoker ? 1 : -1;
    const sd = (SUIT_ORDER[a.suit] ?? 9) - (SUIT_ORDER[b.suit] ?? 9);
    if (sd !== 0) return sd;
    return (a.value || 0) - (b.value || 0);
  });
}

/* ─── Haupt-Render ───────────────────────────────────────────────────────── */
function render() {
  if (!currentState) return;
  const s = currentState;
  const me = s.players.find((p) => p.id === myId);
  const myTurn = isMyTurn();

  // Scoreboard
  el('scoreboard').innerHTML = '';
  for (const p of s.players) {
    const chip = document.createElement('div');
    chip.className = 'score-chip' + (p.id === s.currentPlayerId && !s.handOver ? ' active' : '');
    chip.textContent = `${p.name}: ${p.score}`;
    el('scoreboard').appendChild(chip);
  }
  el('handNumber').textContent = s.handNumber;
  el('handsPerRound').textContent = s.handsPerRound;

  // Gegner-Sitzplätze
  el('opponents').innerHTML = '';
  for (const p of s.players) {
    if (p.id === myId) continue;
    const seat = document.createElement('div');
    seat.className = 'seat' + (p.id === s.currentPlayerId && !s.handOver ? ' active' : '');
    seat.dataset.playerId = p.id;
    const fan = document.createElement('div');
    fan.className = 'seat-fan';
    const n = Math.min(p.cardCount, 10);
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'fan-card';
      const spread = n > 1 ? (i / (n - 1) - 0.5) : 0;
      c.style.transform = `rotate(${spread * 26}deg) translateY(${Math.abs(spread) * 7}px)`;
      fan.appendChild(c);
    }
    const nameEl = document.createElement('div');
    nameEl.className = 'seat-name';
    nameEl.textContent = p.name;
    const cnt = document.createElement('div');
    cnt.className = 'seat-count';
    cnt.textContent = `${p.cardCount} Karten`;
    seat.append(fan, nameEl, cnt);
    el('opponents').appendChild(seat);
  }

  // Tisch-Melds
  el('tableArea').innerHTML = '';
  const newMeldIds = new Set();
  const byOwner = new Map();
  for (const m of s.table) {
    if (!byOwner.has(m.ownerId)) byOwner.set(m.ownerId, []);
    byOwner.get(m.ownerId).push(m);
    for (const c of m.cards) newMeldIds.add(c.id);
  }
  for (const p of s.players) {
    const melds = byOwner.get(p.id) || [];
    if (!melds.length && p.id !== myId) continue;
    const wrap = document.createElement('div');
    wrap.className = 'player-melds';
    const lbl = document.createElement('div');
    lbl.className = 'owner-label';
    lbl.textContent = melds.length ? p.name : `${p.name} – noch nichts ausgelegt`;
    wrap.appendChild(lbl);
    for (const m of melds) {
      const group = document.createElement('div');
      group.className = 'meld-group';
      if (myTurn && s.phase === 'ACTIONS' && selectedIds.size === 1) group.classList.add('targetable');
      for (const c of m.cards) {
        const ce = buildCardEl(c, { small: true });
        if (!prevMeldCardIds.has(c.id)) ce.classList.add('pop');
        group.appendChild(ce);
      }
      group.addEventListener('click', () => {
        if (!myTurn || s.phase !== 'ACTIONS') return;
        if (!selectedIds.size) return showToast('Erst eine Handkarte wählen, dann den Ziel-Meld anklicken.');
        const cardId = [...selectedIds][0];
        sendAction(awaitingTarget === 'JOKER'
          ? { type: 'EXCHANGE_JOKER', meldId: m.id, cardId }
          : { type: 'LAYOFF', meldId: m.id, cardId });
        clearSelection();
      });
      wrap.appendChild(group);
    }
    el('tableArea').appendChild(wrap);
  }
  prevMeldCardIds = newMeldIds;

  // Stapel
  el('stockCount').textContent = s.stockCount;
  el('discardCard').innerHTML = '';
  if (s.discardTop) el('discardCard').appendChild(buildCardEl(s.discardTop));
  el('stockPile').classList.toggle('clickable', myTurn && s.phase === 'DRAW');
  el('discardPile').classList.toggle('clickable',
    myTurn && (s.phase === 'DRAW' ? !!s.discardTop : selectedIds.size === 1));

  // Banner
  const banner = el('turnBanner');
  if (s.roundOver) {
    const w = [...s.players].sort((a, b) => b.score - a.score)[0];
    banner.textContent = `🏆 Runde vorbei! ${w.name} gewinnt mit ${w.score} Punkten.`;
  } else if (s.handOver) {
    const w = s.players.find((p) => p.id === s.handWinnerId);
    banner.textContent = `${w?.name ?? ''} hat die Hand beendet!`;
  } else if (myTurn) {
    banner.textContent = s.phase === 'DRAW'
      ? 'Du bist dran – klick auf Stapel oder Ablage zum Ziehen'
      : 'Legen / Anlegen (Karte wählen + Meld anklicken) · Ablegen: Karte wählen + Ablage anklicken';
  } else {
    const cp = s.players.find((p) => p.id === s.currentPlayerId);
    banner.textContent = `${cp?.name ?? '…'} ist am Zug`;
  }

  // Eigene Hand – sortiert ♥♦♣♠ dann nach Wert
  el('handCards').innerHTML = '';
  for (const c of sortHand(me?.hand || []))
    el('handCards').appendChild(buildCardEl(c, { selectable: true }));

  // Buttons
  el('meldBtn').disabled  = !myTurn || s.phase !== 'ACTIONS';
  el('jokerBtn').disabled = !myTurn || s.phase !== 'ACTIONS';
  el('nextHandBtn').classList.toggle('hidden', !(s.handOver && !s.roundOver));

  el('modeHint').textContent = awaitingTarget === 'JOKER'
    ? '★ Jolly-Tausch aktiv – klick auf den Meld mit dem Jolly.' : '';

  // Log
  const logEl = el('log');
  logEl.innerHTML = '';
  for (const e of s.log) {
    const d = document.createElement('div'); d.textContent = e.msg; logEl.appendChild(d);
  }
  logEl.scrollTop = logEl.scrollHeight;
}

/* ─── Zusammenfassung / Übersicht ────────────────────────────────────────── */
function recordHandResult(prev, curr) {
  const winner = curr.players.find((p) => p.id === curr.handWinnerId);
  const prevScores = new Map(prev.players.map((p) => [p.id, p.score]));
  const points = curr.players.map((p) => ({
    id: p.id,
    name: p.name,
    gained: p.score - (prevScores.get(p.id) ?? p.score),
    total: p.score,
  }));
  handScores.push({ handNum: curr.handNumber, winnerName: winner?.name ?? '?', points });
}

function showSummary(state) {
  const modal = el('summaryModal');
  const body  = el('summaryBody');
  body.innerHTML = '';

  const roundOver = state.roundOver;
  el('summaryTitle').textContent = roundOver
    ? '🏆 Runde beendet – Endergebnis'
    : `Hand ${state.handNumber > 1 ? state.handNumber - 1 : 1} beendet`;

  // Tabelle aller Hände
  const lastHands = handScores.slice(-state.handNumber);
  const players = state.players.map((p) => ({ id: p.id, name: p.name }));

  // Header-Zeile
  let html = `<table class="summary-table">
    <thead><tr><th>Hand</th><th>Sieger</th>${players.map((p) =>
      `<th>${p.name}</th>`).join('')}</tr></thead><tbody>`;

  for (const h of lastHands) {
    html += `<tr>
      <td>${h.handNum}</td>
      <td>${h.winnerName}</td>
      ${players.map((p) => {
        const entry = h.points.find((x) => x.id === p.id);
        const gained = entry?.gained ?? 0;
        return `<td class="${gained > 0 ? 'pts-gained' : ''}">${gained > 0 ? `+${gained}` : '–'}</td>`;
      }).join('')}
    </tr>`;
  }

  // Gesamtstand
  html += `</tbody><tfoot><tr class="total-row">
    <td colspan="2">Gesamt</td>
    ${players.map((p) => `<td>${state.players.find((x) => x.id === p.id)?.score ?? 0}</td>`).join('')}
  </tr></tfoot></table>`;

  if (roundOver) {
    const winner = [...state.players].sort((a, b) => b.score - a.score)[0];
    html += `<div class="round-winner">🏆 ${winner.name} gewinnt die Runde mit ${winner.score} Punkten!</div>`;
    el('nextHandBtn').classList.add('hidden');
    el('closeSummaryBtn').classList.remove('hidden');
  } else {
    el('nextHandBtn').classList.remove('hidden');
    el('closeSummaryBtn').classList.add('hidden');
  }

  body.innerHTML = html;
  modal.classList.remove('hidden');
}

/* ─── Animationen ────────────────────────────────────────────────────────── */
function rectOf(elem) { return elem?.getBoundingClientRect() ?? null; }

function seatRect(playerId) {
  if (playerId === myId) return rectOf(el('handCards'));
  const fan = document.querySelector(`.seat[data-player-id="${playerId}"] .seat-fan`);
  return rectOf(fan);
}

function flyCard(fromRect, toRect, cardData, { delay = 0, faceDown = false } = {}) {
  if (!fromRect || !toRect) return;
  // Element bauen – aufgedeckt wenn Daten vorhanden UND nicht explizit verdeckt
  const node = (!faceDown && cardData) ? buildCardEl(cardData) : buildBackEl();
  node.classList.add('flying-card');
  // Startposition
  node.style.left = `${fromRect.left + fromRect.width  / 2 - 31}px`;
  node.style.top  = `${fromRect.top  + fromRect.height / 2 - 44}px`;
  document.body.appendChild(node);

  const dx = (toRect.left + toRect.width  / 2) - (fromRect.left + fromRect.width  / 2);
  const dy = (toRect.top  + toRect.height / 2) - (fromRect.top  + fromRect.height / 2);

  setTimeout(() => {
    requestAnimationFrame(() => {
      node.style.transform = `translate(${dx}px,${dy}px) scale(0.88)`;
      node.style.opacity   = '0.92';
    });
    setTimeout(() => node.remove(), 520);
  }, delay);
}

function runAnimations(prev, curr) {
  if (!prev || !curr) return;
  if (prev.handNumber !== curr.handNumber) return;

  const stockRect   = rectOf(el('stockCard'));
  const discardRect = rectOf(el('discardCard'));
  let delay = 0;

  const prevPlayers = new Map(prev.players.map((p) => [p.id, p]));

  // ── Karten gezogen ──────────────────────────────────────────────
  for (const p of curr.players) {
    const before = prevPlayers.get(p.id);
    if (!before) continue;
    const diff = p.cardCount - before.cardCount;
    if (diff <= 0) continue;

    const fromDiscard = prev.discardTop && curr.discardCount < prev.discardCount;
    const fromRect    = fromDiscard ? discardRect : stockRect;
    const revealCard  = fromDiscard ? prev.discardTop : null; // vom Stock immer verdeckt für andere
    const isSelf      = p.id === myId;

    // Vom Stock: selbst aufgedeckt (man sieht seine eigene Karte – aber der Server schickt sie
    // nur im eigenen State, hier zeigen wir sicherheitshalber Rücken für andere)
    flyCard(fromRect, seatRect(p.id), revealCard, {
      delay,
      faceDown: !revealCard && !isSelf,
    });
    delay += 140;
  }

  // ── Ablegen: Karte fliegt vom Sitz zur Ablage ────────────────────
  if (curr.discardCount > prev.discardCount && curr.discardTop) {
    const actorId = prev.currentPlayerId;
    // curr.discardTop ist die neue Karte – sie ist jetzt schon bekannt, Karte aufgedeckt zeigen
    flyCard(seatRect(actorId), discardRect, curr.discardTop, { delay });
  }
}

});
