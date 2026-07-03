const socket = io();

const SUIT_SYMBOL = { H: '♥', D: '♦', C: '♣', S: '♠' };
const RED_SUITS = new Set(['H', 'D']);
const COURT = new Set(['J', 'Q', 'K']);

let myId = 'human';
let currentState = null;
let prevState = null;
let selectedIds = new Set();
let awaitingTarget = null; // null | 'JOKER'
let prevMeldCardIds = new Set();

const el = (id) => document.getElementById(id);

/* ---------- Lobby ---------- */
el('startBtn').addEventListener('click', () => {
  const name = el('nameInput').value.trim() || 'Spieler';
  const difficulty = el('difficultySelect').value;
  socket.emit('start_game', { name, difficulty });
  el('lobby').classList.add('hidden');
  el('game').classList.remove('hidden');
});

/* ---------- Klick-Interaktionen auf Stapeln ---------- */
el('stockPile').addEventListener('click', () => {
  const s = currentState;
  if (!s) return;
  if (!isMyTurn()) return;
  if (s.phase !== 'DRAW') return showToast('Du hast schon gezogen – jetzt auslegen oder eine Karte auf die Ablage legen.');
  sendAction({ type: 'DRAW_STOCK' });
});

el('discardPile').addEventListener('click', () => {
  const s = currentState;
  if (!s) return;
  if (!isMyTurn()) return;
  if (s.phase === 'DRAW') {
    if (!s.discardTop) return showToast('Ablage ist leer.');
    sendAction({ type: 'DRAW_DISCARD' });
  } else {
    if (selectedIds.size !== 1) return showToast('Wähle genau 1 Karte aus deiner Hand, dann klick auf die Ablage.');
    const cardId = [...selectedIds][0];
    sendAction({ type: 'DISCARD', cardId });
    clearSelection();
  }
});

/* ---------- Buttons ---------- */
el('meldBtn').addEventListener('click', () => {
  if (selectedIds.size < 3) return showToast('Wähle mindestens 3 Karten für einen Satz oder eine Straße.');
  sendAction({ type: 'MELD', cardIds: [...selectedIds] });
  clearSelection();
});

el('jokerBtn').addEventListener('click', () => {
  if (selectedIds.size !== 1) return showToast('Wähle die Ersatzkarte, dann klick auf den Meld mit dem Jolly.');
  awaitingTarget = 'JOKER';
  render();
});

el('nextHandBtn').addEventListener('click', () => sendAction({ type: 'NEXT_HAND' }));

function isMyTurn() {
  const s = currentState;
  return s && s.currentPlayerId === myId && !s.handOver && !s.roundOver;
}

function sendAction(action) { socket.emit('action', action); }

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
  prevState = currentState;
  currentState = state;
  const me = state.players.find((p) => p.id === myId);
  const myHandIds = new Set((me?.hand || []).map((c) => c.id));
  for (const id of [...selectedIds]) {
    if (!myHandIds.has(id)) selectedIds.delete(id);
  }
  render();
  runAnimations(prevState, state);
});

/* ---------- Karten-Rendering ---------- */
function buildCardEl(card, { selectable = false } = {}) {
  const div = document.createElement('div');
  div.className = 'card' + (card.isJoker ? ' joker' : RED_SUITS.has(card.suit) ? ' red' : '');
  if (selectedIds.has(card.id)) div.classList.add('selected');

  if (card.isJoker) {
    div.innerHTML = `
      <div class="corner">J<span class="c-suit">★</span></div>
      <div class="center-pip">🃏</div>
      <div class="corner br">J<span class="c-suit">★</span></div>`;
  } else {
    const sym = SUIT_SYMBOL[card.suit];
    const center = COURT.has(card.rank)
      ? `<div class="center-pip court">${card.rank}${sym}</div>`
      : `<div class="center-pip">${sym}</div>`;
    div.innerHTML = `
      <div class="corner">${card.rank}<span class="c-suit">${sym}</span></div>
      ${center}
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

function buildBackEl(cls = 'card back') {
  const div = document.createElement('div');
  div.className = cls;
  return div;
}

/* ---------- Haupt-Render ---------- */
function render() {
  if (!currentState) return;
  const s = currentState;
  const me = s.players.find((p) => p.id === myId);
  const myTurn = isMyTurn();

  // Scoreboard
  const sb = el('scoreboard');
  sb.innerHTML = '';
  for (const p of s.players) {
    const chip = document.createElement('div');
    chip.className = 'score-chip' + (p.id === s.currentPlayerId && !s.handOver ? ' active' : '');
    chip.textContent = `${p.name}: ${p.score}`;
    sb.appendChild(chip);
  }
  el('handNumber').textContent = s.handNumber;
  el('handsPerRound').textContent = s.handsPerRound;

  // Gegner-Sitzplätze mit verdeckten Fächern
  const opp = el('opponents');
  opp.innerHTML = '';
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
    const count = document.createElement('div');
    count.className = 'seat-count';
    count.textContent = `${p.cardCount} Karten`;
    seat.appendChild(fan);
    seat.appendChild(nameEl);
    seat.appendChild(count);
    opp.appendChild(seat);
  }

  // Tisch-Melds
  const tableArea = el('tableArea');
  tableArea.innerHTML = '';
  const newMeldCardIds = new Set();
  const byOwner = new Map();
  for (const m of s.table) {
    if (!byOwner.has(m.ownerId)) byOwner.set(m.ownerId, []);
    byOwner.get(m.ownerId).push(m);
    for (const c of m.cards) newMeldCardIds.add(c.id);
  }
  for (const p of s.players) {
    const melds = byOwner.get(p.id) || [];
    if (melds.length === 0 && p.id !== myId) continue;
    const wrap = document.createElement('div');
    wrap.className = 'player-melds';
    const label = document.createElement('div');
    label.className = 'owner-label';
    label.textContent = melds.length ? p.name : `${p.name} – noch nichts ausgelegt`;
    wrap.appendChild(label);
    for (const m of melds) {
      const group = document.createElement('div');
      group.className = 'meld-group';
      const canTarget = myTurn && s.phase === 'ACTIONS' && selectedIds.size === 1;
      if (canTarget) group.classList.add('targetable');
      for (const c of m.cards) {
        const cardEl = buildCardEl(c);
        if (!prevMeldCardIds.has(c.id)) cardEl.classList.add('pop');
        group.appendChild(cardEl);
      }
      group.addEventListener('click', () => {
        if (!myTurn || s.phase !== 'ACTIONS') return;
        if (selectedIds.size !== 1) return showToast('Wähle genau 1 Handkarte, dann klick auf den Ziel-Meld.');
        const cardId = [...selectedIds][0];
        if (awaitingTarget === 'JOKER') {
          sendAction({ type: 'EXCHANGE_JOKER', meldId: m.id, cardId });
        } else {
          sendAction({ type: 'LAYOFF', meldId: m.id, cardId });
        }
        clearSelection();
      });
      wrap.appendChild(group);
    }
    tableArea.appendChild(wrap);
  }
  prevMeldCardIds = newMeldCardIds;

  // Stapel-Mitte
  el('stockCount').textContent = s.stockCount;
  const discardCardEl = el('discardCard');
  discardCardEl.innerHTML = '';
  if (s.discardTop) discardCardEl.appendChild(buildCardEl(s.discardTop));

  el('stockPile').classList.toggle('clickable', myTurn && s.phase === 'DRAW');
  el('discardPile').classList.toggle(
    'clickable',
    myTurn && (s.phase === 'DRAW' ? !!s.discardTop : selectedIds.size === 1)
  );

  // Banner
  const banner = el('turnBanner');
  if (s.roundOver) {
    const winner = [...s.players].sort((a, b) => b.score - a.score)[0];
    banner.textContent = `🏆 Runde vorbei! ${winner.name} gewinnt mit ${winner.score} Punkten.`;
  } else if (s.handOver) {
    const winner = s.players.find((p) => p.id === s.handWinnerId);
    banner.textContent = `${winner ? winner.name : ''} hat die Hand beendet!`;
  } else if (myTurn) {
    banner.textContent = s.phase === 'DRAW'
      ? 'Du bist dran – klick auf einen Stapel zum Ziehen'
      : 'Auslegen, anlegen (Karte + Meld anklicken) oder Karte wählen und auf die Ablage klicken';
  } else {
    const cp = s.players.find((pp) => pp.id === s.currentPlayerId);
    banner.textContent = `${cp ? cp.name : '…'} ist am Zug`;
  }

  // Eigene Hand
  const handEl = el('handCards');
  handEl.innerHTML = '';
  const myHand = [...(me?.hand || [])].sort((a, b) => {
    if (a.isJoker !== b.isJoker) return a.isJoker ? 1 : -1;
    if (a.suit !== b.suit) return (a.suit || '').localeCompare(b.suit || '');
    return (a.value || 0) - (b.value || 0);
  });
  for (const c of myHand) handEl.appendChild(buildCardEl(c, { selectable: true }));

  // Buttons
  el('meldBtn').disabled = !myTurn || s.phase !== 'ACTIONS';
  el('jokerBtn').disabled = !myTurn || s.phase !== 'ACTIONS';
  el('nextHandBtn').classList.toggle('hidden', !(s.handOver && !s.roundOver));

  el('modeHint').textContent = awaitingTarget === 'JOKER'
    ? 'Jolly-Tausch aktiv: klick jetzt auf den Meld mit dem Jolly.'
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

/* ---------- Animationen ---------- */
function rectOf(elem) {
  if (!elem) return null;
  return elem.getBoundingClientRect();
}

function seatRect(playerId) {
  if (playerId === myId) return rectOf(el('handCards'));
  const seat = document.querySelector(`.seat[data-player-id="${playerId}"] .seat-fan`);
  return rectOf(seat);
}

function flyCard(fromRect, toRect, cardData, delay = 0) {
  if (!fromRect || !toRect) return;
  const node = cardData ? buildCardEl(cardData) : buildBackEl();
  node.classList.add('flying-card');
  node.style.left = `${fromRect.left + fromRect.width / 2 - 31}px`;
  node.style.top = `${fromRect.top + fromRect.height / 2 - 44}px`;
  node.style.transform = 'translate(0,0) scale(1)';
  document.body.appendChild(node);

  const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
  const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

  setTimeout(() => {
    requestAnimationFrame(() => {
      node.style.transform = `translate(${dx}px, ${dy}px) scale(0.9)`;
      node.style.opacity = '0.9';
    });
    setTimeout(() => node.remove(), 500);
  }, delay);
}

function runAnimations(prev, curr) {
  if (!prev || !curr) return;
  if (prev.handNumber !== curr.handNumber) return; // neue Hand -> kein Diff-Spam

  const stockRect = rectOf(el('stockCard'));
  const discardRect = rectOf(el('discardCard'));
  let delay = 0;

  const prevPlayers = new Map(prev.players.map((p) => [p.id, p]));

  for (const p of curr.players) {
    const before = prevPlayers.get(p.id);
    if (!before) continue;
    const diff = p.cardCount - before.cardCount;

    // Karte(n) gezogen
    if (diff > 0) {
      const drewFromDiscard = curr.discardCount < prev.discardCount;
      const from = drewFromDiscard ? discardRect : stockRect;
      const showCard = drewFromDiscard && prev.discardTop ? prev.discardTop : null;
      flyCard(from, seatRect(p.id), p.id === myId ? showCard : (showCard || null), delay);
      delay += 120;
    }
  }

  // Neue Karte auf der Ablage -> vom aktiven Sitz zur Ablage fliegen
  if (curr.discardCount > prev.discardCount && curr.discardTop) {
    // wer hat abgelegt? Der Spieler, der vorher dran war
    const actorId = prev.currentPlayerId;
    flyCard(seatRect(actorId), discardRect, curr.discardTop, delay);
  }
}
