# Zwettl Rummy 🃏

Österreichisches Rummy (Rommé), 4 Spieler, gegen 3 KI-Gegner. Selbstgehostet via Docker.

## Regeln (implementiert)

- 2 Kartendecks + 4 Jolly (108 Karten)
- 7 Karten Startblatt pro Spieler
- Neue Auslage: mindestens 3 Karten (Satz oder Straße), kein Mindestpunktwert nötig
- Satz = gleicher Rang, unterschiedliche Farben (3–4 Karten)
- Straße = gleiche Farbe UND gleiches Haus, fortlaufende Werte, Ass nur niedrig (A-2-3…, kein Wrap um den König)
- Anlegen an fremde Auslagen ist erlaubt
- Jolly-Austausch: ausgelegten Jolly durch die echte Karte ersetzen, Jolly wandert auf die eigene Hand
- Hand endet, sobald ein Spieler 0 Karten auf der Hand hat (nach Ablegen oder direkt nach Auslegen/Anlegen)
- Wertung: Ass=1, 2-10=Nennwert, Bube/Dame/König=10. Restkarten der Verlierer werden addiert und dem Sieger gutgeschrieben
- 5 Hände pro Runde, höchster Punktestand gewinnt

## Starten mit Docker Compose

```bash
docker compose up -d --build
```

Dann im Browser: `http://<server-ip>:3000` (bzw. über deinen Nginx Proxy Manager mit eigenem Hostnamen dahinter).

## Starten ohne Docker (lokal testen)

```bash
npm install
npm start
```

## Architektur

- `server/models/` – Card, Deck, Meld-Validierung, Player
- `server/game/GameEngine.js` – reine Spiel-State-Machine (kennt keine Sockets, keine KI)
- `server/game/GameManager.js` – verwaltet Sessions, triggert KI-Züge automatisch nach dem menschlichen Zug
- `server/ai/AIStrategy.js` – Heuristik: Zieh-Entscheidung, automatisches Melden/Anlegen, Ablage-Auswahl
- `server/socket/handlers.js` + `server/index.js` – Express + Socket.io Server
- `public/` – Vanilla-JS Frontend (kein Build-Step nötig)

Jeder Spieler ist ein `Player`-Objekt mit `isAI`-Flag. Die Engine selbst unterscheidet nicht zwischen
Mensch und KI – das macht später einen Umstieg auf echten Multiplayer (mehrere Menschen, weniger/keine KI)
relativ einfach, ohne die Engine anzufassen.

## Bekannte Grenzen / mögliche Erweiterungen

- Aktuell nur 1 menschlicher Spieler pro Session (gegen 3 KI). Echtes Multiplayer (mehrere Menschen in
  einer Session) würde eine Lobby/Room-Verwaltung in `GameManager` brauchen, die Engine selbst müsste
  nicht verändert werden.
- KI setzt Jolly bei "hard" und "medium" auch aggressiv ein, um Melds zu vervollständigen – das ist bewusst
  simpel gehalten (kein Lookahead/Minimax), spielt sich aber überraschend ordentlich (in Simulationen über
  mehrere hundert automatisch gespielte Züge stabil, keine Abstürze).
- Kein Login/Persistenz – State lebt nur pro Socket-Verbindung im Server-RAM. Bei Serverneustart sind
  laufende Spiele weg (analog zu deinem SynFlow/NØRA Setup wäre das über SQLite nachrüstbar, falls du
  Spielstände/Statistiken über Zeit sammeln willst).
- Keine Undo-Funktion – einmal ausgelegte Karten liegen.
