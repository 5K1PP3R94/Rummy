function registerHandlers(io, gameManager) {
  io.on('connection', (socket) => {
    socket.on('start_game', ({ name, difficulty }) => {
      try {
        gameManager.createSession(socket.id, name, difficulty);
      } catch (e) {
        socket.emit('error_msg', e.message);
      }
    });

    socket.on('action', (action) => {
      try {
        gameManager.handleAction(socket.id, action);
      } catch (e) {
        socket.emit('error_msg', e.message);
        // trotzdem aktuellen State erneut senden, damit UI konsistent bleibt
        const session = gameManager.getSession(socket.id);
        if (session) {
          io.to(socket.id).emit('state', session.engine.getState(session.humanPlayerId));
        }
      }
    });

    socket.on('disconnect', () => {
      gameManager.removeSession(socket.id);
    });
  });
}

module.exports = registerHandlers;
