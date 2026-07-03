const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const GameManager = require('./game/GameManager');
const registerHandlers = require('./socket/handlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const gameManager = new GameManager(io);
registerHandlers(io, gameManager);

server.listen(PORT, () => {
  console.log(`Rummy-Server läuft auf Port ${PORT}`);
});
