const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const GameRoom = require('./GameRoom');
const { ROOM_CODE_LENGTH } = require('./constants');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Game rooms storage
const rooms = new Map(); // roomCode -> GameRoom

// Generate a random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Find a unique room code
function createUniqueRoomCode() {
  let attempts = 0;
  while (attempts < 100) {
    const code = generateRoomCode();
    if (!rooms.has(code)) {
      return code;
    }
    attempts++;
  }
  throw new Error('Could not generate unique room code');
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  let currentRoom = null;
  let currentPlayerId = null;
  let isHost = false;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);

      switch (data.type) {
        case 'HOST_CREATE_ROOM': {
          const roomCode = createUniqueRoomCode();
          const room = new GameRoom(roomCode, ws);
          rooms.set(roomCode, room);
          currentRoom = roomCode;
          isHost = true;

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            roomCode: roomCode
          }));

          console.log(`Room created: ${roomCode}`);
          break;
        }

        case 'PLAYER_JOIN_ROOM': {
          const { roomCode, name } = data;

          if (!roomCode || !name) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Room code and name are required'
            }));
            break;
          }

          const room = rooms.get(roomCode.toUpperCase());
          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Room not found or already in progress'
            }));
            break;
          }

          // Generate player ID
          const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const result = room.addPlayer(playerId, name, ws);

          if (result.success) {
            currentRoom = roomCode.toUpperCase();
            currentPlayerId = playerId;

            ws.send(JSON.stringify({
              type: 'JOIN_SUCCESS',
              playerId: playerId,
              roomCode: currentRoom
            }));

            // Broadcast updated lobby state
            broadcastLobbyUpdate(room);

            console.log(`Player ${name} joined room ${currentRoom}`);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: result.error
            }));
          }
          break;
        }

        case 'HOST_UPDATE_TEAM': {
          const { playerId, teamId } = data;
          const room = rooms.get(currentRoom);

          if (room && isHost) {
            room.updatePlayerTeam(playerId, teamId);
            broadcastLobbyUpdate(room);
            console.log(`Updated player ${playerId} team to ${teamId}`);
          }
          break;
        }

        case 'HOST_START_GAME': {
          const room = rooms.get(currentRoom);

          if (room && isHost) {
            const result = room.startGame();

            if (result.success) {
              // Notify all players that game is starting
              const startMessage = {
                type: 'GAME_START',
                durationSeconds: require('./constants').GAME_DURATION_SECONDS,
                mapConfig: {
                  width: require('./constants').MAP_WIDTH,
                  height: require('./constants').MAP_HEIGHT
                }
              };

              // Send to all players
              for (const player of room.players.values()) {
                if (player.connected && player.ws.readyState === WebSocket.OPEN) {
                  player.ws.send(JSON.stringify(startMessage));
                }
              }

              // Send to host
              if (room.hostWs.readyState === WebSocket.OPEN) {
                room.hostWs.send(JSON.stringify(startMessage));
              }

              console.log(`Game started in room ${currentRoom}`);
            } else {
              ws.send(JSON.stringify({
                type: 'ERROR',
                message: result.error
              }));
            }
          }
          break;
        }

        case 'PLAYER_INPUT': {
          const { moveX, moveY, dashPressed } = data;
          const room = rooms.get(currentRoom);

          if (room && currentPlayerId && room.state === 'RUNNING') {
            room.updatePlayerInput(currentPlayerId, {
              moveX,
              moveY,
              dashPressed
            });
          }
          break;
        }

        case 'HOST_RETURN_TO_LOBBY': {
          const room = rooms.get(currentRoom);

          if (room && isHost) {
            room.returnToLobby();

            // Notify all clients
            const lobbyMessage = {
              type: 'RETURN_TO_LOBBY'
            };

            for (const player of room.players.values()) {
              if (player.connected && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify(lobbyMessage));
              }
            }

            if (room.hostWs.readyState === WebSocket.OPEN) {
              room.hostWs.send(JSON.stringify(lobbyMessage));
            }

            broadcastLobbyUpdate(room);
            console.log(`Room ${currentRoom} returned to lobby`);
          }
          break;
        }

        case 'HOST_END_SESSION': {
          const room = rooms.get(currentRoom);

          if (room && isHost) {
            // Notify all players
            for (const player of room.players.values()) {
              if (player.connected && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                  type: 'SESSION_ENDED',
                  message: 'Host ended the session'
                }));
              }
            }

            room.destroy();
            rooms.delete(currentRoom);
            console.log(`Room ${currentRoom} destroyed`);
          }
          break;
        }

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Internal server error'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');

    if (currentRoom) {
      const room = rooms.get(currentRoom);

      if (room) {
        if (isHost) {
          // Host disconnected - end the room
          console.log(`Host disconnected from room ${currentRoom}`);

          for (const player of room.players.values()) {
            if (player.connected && player.ws.readyState === WebSocket.OPEN) {
              player.ws.send(JSON.stringify({
                type: 'SESSION_ENDED',
                message: 'Host disconnected'
              }));
              player.ws.close();
            }
          }

          room.destroy();
          rooms.delete(currentRoom);
        } else if (currentPlayerId) {
          // Player disconnected
          console.log(`Player ${currentPlayerId} disconnected from room ${currentRoom}`);
          room.removePlayer(currentPlayerId);
          broadcastLobbyUpdate(room);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Helper function to broadcast lobby updates
function broadcastLobbyUpdate(room) {
  const lobbyState = room.getLobbyState();
  const message = {
    type: 'LOBBY_UPDATE',
    ...lobbyState
  };

  // Send to host
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify(message));
  }

  // Send to all players
  for (const player of room.players.values()) {
    if (player.connected && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/host.html'));
});

app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/join.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
