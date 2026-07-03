const socket = io();

const SUIT_SYMBOL = { H: '♥', D: '♦', C: '♣', S: '♠' };
const RED_SUITS = new Set(['H', 'D']);

let myId = 'human';
let currentState = null;
let selectedIds = new Set();
let awaitingTarget = null; // null | 'LAYOFF' | 'JOKER'

const el = (id) => document.getElementById(id);

el('startBtn').addEventListener('click', () => {
  const name = el('nameInput').value.trim() || 'Spieler';
  const difficulty = el('difficultySelect').value;
  socket.emit('start_game', { name, difficulty });
  el('lobby').classList.add('hidden');
  el('game').classList.remove('hidden');
});

el('drawStockBtn').addEventListener('click', () => sendAction({ type: 'DRAW_STOCK' }));
el('drawDiscardBtn').addEventListener('click', () => sendAction({ type: 'DRAW_DISCARD' }));

el('meldBtn').addEventListener('click', () => {
  if (selectedIds.size < 3) return showToast('Wähle mindestens 3 Karten für einen Satz/eine Straße.');
  sendAction({ type: 'MELD', cardIds: [...selectedIds] });
  clearSelection();
});

el('layoffBtn').addEventListener('click', () => {
  if (selectedIds.size !== 1) return showToast('Wähle genau 1 Karte zum Anlegen, dann klick auf einen Meld am Tisch.');
  awaitingTarget = 'LAYOFF';
  render();
});

el('jokerBtn').addEventListener('click', () => {
  if (selectedIds.size !== 1) return showToast('Wähle die Ersatzkarte für den Jolly, dann klick auf den Meld mit dem Jolly.');
  awaitingTarget = 'JOKER';
  render();
});

el('discardBtn').addEventListener('click', () => {
  if (selectedIds.size !== 1) return showToast('Wähle genau 1 Karte zum Ablegen.');
  const cardId = [...selectedIds][0];
  sendAction({ type: 'DISCARD', cardId });
  clearSelection();
});

el('nextHandBtn').addEventListener('click', () => sendAction({ type: 'NEXT_HAND' }));

function sendAction(action) {
  socket.emit('action', action);
}

function clearSelection() {
  selectedIds.clear();
  awaitingTarget = null;
  render();
}

function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => (t.style.display = 'none'), 3200);
}

socket.on('error_msg', (msg) => showToast(msg));

socket.on('state', (state) => {
  currentState = state;
  // Auswahl bereinigen, falls Karten nicht mehr auf der Hand sind
  const me = state.players.find((p) => p.id === myId);
  const myHandIds = new Set((me?.hand || []).map((c) => c.id));
  for (const id of [...selectedIds]) {
    if (!myHandIds.has(id)) selectedIds.delete(id);
  }
  render();
});

function cardLabel(card) {
  if (card.isJoker) return 'J';
  return card.rank;
}

function renderCardEl(card, { selectable = false, faceDown = false } = {}) {
  const div = document.createElement('div');
  if (faceDown) {
    div.className = 'card back';
    return div;
  }
  div.className = 'card' + (card.isJoker ? ' joker' : RED_SUITS.has(card.suit) ? ' red' : ' black');
  if (selectedIds.has(card.id)) div.classList.add('selected');
  div.innerHTML = card.isJoker
    ? `<div>JOLLY</div>`
    : `<div>${cardLabel(card)}</div><div class="suit">${SUIT_SYMBOL[card.suit]}</div>`;
  if (selectable) {
    div.addEventListener('click', () => {
      if (selectedIds.has(card.id)) selectedIds.delete(card.id);
      else selectedIds.add(card.id);
      render();
    });
  }
  return div;
}

function render() {
  if (!currentState) return;
  const s = currentState;
  const me = s.players.find((p) => p.id === myId);
  const isMyTurn = s.currentPlayerId === myId && !s.handOver && !s.roundOver;

  // Scoreboard
  const sb = el('scoreboard');
  sb.innerHTML = '';
  for (const p of s.players) {
    const chip = document.createElement('div');
    chip.className = 'score-chip' + (p.id === s.currentPlayerId ? ' active' : '');
    chip.textContent = `${p.name}: ${p.score} Pkt (${p.cardCount} Karten)`;
    sb.appendChild(chip);
  }
  el('handNumber').textContent = s.handNumber;
  el('handsPerRound').textContent = s.handsPerRound;

  // Tisch-Melds gruppiert nach Besitzer
  const tableArea = el('tableArea');
  tableArea.innerHTML = '';
  const byOwner = new Map();
  for (const m of s.table) {
    if (!byOwner.has(m.ownerId)) byOwner.set(m.ownerId, []);
    byOwner.get(m.ownerId).push(m);
  }
  for (const p of s.players) {
    const melds = byOwner.get(p.id) || [];
    const wrap = document.createElement('div');
    wrap.className = 'player-melds';
    const label = document.createElement('div');
    label.className = 'owner-label';
    label.textContent = `${p.name}${melds.length === 0 ? ' (noch nichts ausgelegt)' : ''}`;
    wrap.appendChild(label);
    for (const m of melds) {
      const group = document.createElement('div');
      group.className = 'meld-group';
      if (awaitingTarget && isMyTurn) group.classList.add('targetable');
      for (const c of m.cards) group.appendChild(renderCardEl(c));
      group.addEventListener('click', () => {
        if (!awaitingTarget || !isMyTurn) return;
        const cardId = [...selectedIds][0];
        if (!cardId) return;
        if (awaitingTarget === 'LAYOFF') {
          sendAction({ type: 'LAYOFF', meldId: m.id, cardId });
        } else if (awaitingTarget === 'JOKER') {
          sendAction({ type: 'EXCHANGE_JOKER', meldId: m.id, cardId });
        }
        clearSelection();
      });
      wrap.appendChild(group);
    }
    tableArea.appendChild(wrap);
  }

  // Stapel
  el('stockCount').textContent = s.stockCount;
  const discardCardEl = el('discardCard');
  discardCardEl.innerHTML = '';
  if (s.discardTop) discardCardEl.appendChild(renderCardEl(s.discardTop));

  // Turn banner
  const banner = el('turnBanner');
  if (s.roundOver) {
    const winner = [...s.players].sort((a, b) => b.score - a.score)[0];
    banner.textContent = `🏆 Runde vorbei! ${winner.name} gewinnt mit ${winner.score} Punkten.`;
  } else if (s.handOver) {
    const winner = s.players.find((p) => p.id === s.handWinnerId);
    banner.textContent = `${winner ? winner.name : ''} hat die Hand beendet!`;
  } else if (isMyTurn) {
    banner.textContent = s.phase === 'DRAW' ? 'Du bist am Zug – zieh eine Karte' : 'Du bist am Zug – auslegen/anlegen oder ablegen';
  } else {
    const cp = s.players.find((pp) => pp.id === s.currentPlayerId);
    banner.textContent = `${cp ? cp.name : '...'} ist am Zug`;
  }

  // Hand
  const handEl = el('handCards');
  handEl.innerHTML = '';
  const myHand = [...(me?.hand || [])].sort((a, b) => {
    if (a.isJoker !== b.isJoker) return a.isJoker ? 1 : -1;
    if (a.suit !== b.suit) return (a.suit || '').localeCompare(b.suit || '');
    return (a.value || 0) - (b.value || 0);
  });
  for (const c of myHand) {
    handEl.appendChild(renderCardEl(c, { selectable: true }));
  }

  // Buttons
  el('drawStockBtn').disabled = !isMyTurn || s.phase !== 'DRAW';
  el('drawDiscardBtn').disabled = !isMyTurn || s.phase !== 'DRAW' || !s.discardTop;
  el('meldBtn').disabled = !isMyTurn || s.phase !== 'ACTIONS';
  el('layoffBtn').disabled = !isMyTurn || s.phase !== 'ACTIONS';
  el('jokerBtn').disabled = !isMyTurn || s.phase !== 'ACTIONS';
  el('discardBtn').disabled = !isMyTurn || s.phase !== 'ACTIONS';
  el('nextHandBtn').classList.toggle('hidden', !(s.handOver && !s.roundOver));

  el('modeHint').textContent = awaitingTarget
    ? awaitingTarget === 'LAYOFF'
      ? 'Klick jetzt auf den Meld am Tisch, an den du anlegen willst.'
      : 'Klick jetzt auf den Meld, dessen Jolly du tauschen willst.'
    : '';

  // Log
  const logEl = el('log');
  logEl.innerHTML = '';
  for (const entry of s.log) {
    const d = document.createElement('div');
    d.textContent = entry.msg;
    logEl.appendChild(d);
  }
  logEl.scrollTop = logEl.scrollHeight;
}
