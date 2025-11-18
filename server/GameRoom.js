const {
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  GAME_DURATION_SECONDS,
  PLAYER_SPEED,
  DASH_DURATION_SECONDS,
  DASH_SPEED_MULTIPLIER,
  DASH_COOLDOWN_SECONDS,
  SERVER_TICK_RATE,
  COLORS,
  TEAMS,
  ZONE_RADIUS
} = require('./constants');

const {
  normalize,
  distance,
  clampToBounds,
  resolveCollisions,
  wouldCollide,
  generateSpawnPositions
} = require('./physics');

const {
  createZones,
  updateZonePositions,
  updateZoneOwnership
} = require('./zones');

class GameRoom {
  constructor(roomCode, hostWs) {
    this.roomCode = roomCode;
    this.hostWs = hostWs;
    this.state = 'LOBBY'; // LOBBY, RUNNING, ENDED
    this.players = new Map(); // playerId -> player object
    this.zones = [];
    this.teamColorMapping = null;
    this.gameStartTime = null;
    this.gameEndTime = null;
    this.tickInterval = null;
    this.currentTime = 0;
  }

  // Add a player to the room
  addPlayer(playerId, name, ws) {
    if (this.players.size >= MAX_PLAYERS) {
      return { success: false, error: 'Room is full' };
    }

    if (this.state !== 'LOBBY') {
      return { success: false, error: 'Game already in progress' };
    }

    const player = {
      playerId,
      name,
      ws,
      teamId: null,
      x: 50,
      y: 30,
      vx: 0,
      vy: 0,
      isDashing: false,
      dashTimeRemaining: 0,
      lastNonZeroMoveDir: { x: 1, y: 0 },
      nextDashAvailableTime: 0,
      connected: true,
      lastInput: { moveX: 0, moveY: 0, dashPressed: false }
    };

    this.players.set(playerId, player);
    return { success: true };
  }

  // Remove a player
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.connected = false;
      this.players.delete(playerId);
    }
  }

  // Update player team assignment
  updatePlayerTeam(playerId, teamId) {
    const player = this.players.get(playerId);
    if (player) {
      player.teamId = teamId; // null, TEAM1, or TEAM2
      return true;
    }
    return false;
  }

  // Get lobby state for broadcasting
  getLobbyState() {
    const playerList = Array.from(this.players.values()).map(p => ({
      playerId: p.playerId,
      name: p.name,
      teamId: p.teamId
    }));

    const counts = {
      total: playerList.length,
      team1: playerList.filter(p => p.teamId === TEAMS.TEAM1).length,
      team2: playerList.filter(p => p.teamId === TEAMS.TEAM2).length,
      unassigned: playerList.filter(p => p.teamId === null).length
    };

    return { players: playerList, counts };
  }

  // Check if game can start
  canStartGame() {
    const { counts } = this.getLobbyState();
    return counts.total >= MIN_PLAYERS_TO_START && counts.unassigned === 0;
  }

  // Start the game
  startGame() {
    if (!this.canStartGame()) {
      return { success: false, error: 'Cannot start game' };
    }

    // Randomly assign colors to teams
    const randomAssignment = Math.random() < 0.5;
    this.teamColorMapping = {
      [TEAMS.TEAM1]: randomAssignment ? COLORS.BLUE : COLORS.RED,
      [TEAMS.TEAM2]: randomAssignment ? COLORS.RED : COLORS.BLUE
    };

    // Initialize zones
    this.zones = createZones(this.teamColorMapping);

    // Generate spawn positions
    const spawnPositions = generateSpawnPositions(this.players.size, this.zones);

    // Assign spawn positions to players
    let idx = 0;
    for (const player of this.players.values()) {
      if (idx < spawnPositions.length) {
        player.x = spawnPositions[idx].x;
        player.y = spawnPositions[idx].y;
      }
      player.vx = 0;
      player.vy = 0;
      player.isDashing = false;
      player.dashTimeRemaining = 0;
      player.nextDashAvailableTime = 0;
      idx++;
    }

    this.state = 'RUNNING';
    this.gameStartTime = Date.now();
    this.gameEndTime = this.gameStartTime + (GAME_DURATION_SECONDS * 1000);
    this.currentTime = 0;

    // Start game loop
    this.startGameLoop();

    return { success: true };
  }

  // Start the game update loop
  startGameLoop() {
    const tickDuration = 1000 / SERVER_TICK_RATE;
    const dt = 1 / SERVER_TICK_RATE;

    this.tickInterval = setInterval(() => {
      this.updateGame(dt);
    }, tickDuration);
  }

  // Main game update function
  updateGame(dt) {
    this.currentTime += dt;

    // Check if game should end
    const timeLeft = Math.max(0, GAME_DURATION_SECONDS - this.currentTime);
    if (timeLeft <= 0 && this.state === 'RUNNING') {
      this.endGame();
      return;
    }

    // Update zone positions
    updateZonePositions(this.zones, this.currentTime);

    // Update players
    const allPlayers = Array.from(this.players.values());
    for (const player of allPlayers) {
      if (!player.connected) continue;

      const input = player.lastInput;

      // Track last non-zero movement direction
      if (input.moveX !== 0 || input.moveY !== 0) {
        const dir = normalize(input.moveX, input.moveY);
        player.lastNonZeroMoveDir = dir;
      }

      // Handle dash activation
      if (input.dashPressed && !player.isDashing) {
        if (this.currentTime >= player.nextDashAvailableTime &&
            (player.lastNonZeroMoveDir.x !== 0 || player.lastNonZeroMoveDir.y !== 0)) {
          player.isDashing = true;
          player.dashTimeRemaining = DASH_DURATION_SECONDS;
          player.nextDashAvailableTime = this.currentTime + DASH_COOLDOWN_SECONDS;
        }
      }

      // Determine movement direction and speed
      let dir, speed;
      if (player.isDashing) {
        dir = player.lastNonZeroMoveDir;
        speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER;
      } else {
        dir = normalize(input.moveX, input.moveY);
        speed = PLAYER_SPEED;
      }

      // Calculate tentative new position
      const vel = { x: dir.x * speed, y: dir.y * speed };
      let tentativePos = {
        x: player.x + vel.x * dt,
        y: player.y + vel.y * dt
      };
      tentativePos = clampToBounds(tentativePos);

      // Handle collisions
      if (player.isDashing) {
        if (wouldCollide(tentativePos, player, allPlayers)) {
          // Collision during dash - stop dash but keep cooldown
          player.isDashing = false;
          player.dashTimeRemaining = 0;
          // Don't move this tick
        } else {
          player.x = tentativePos.x;
          player.y = tentativePos.y;
        }
      } else {
        const finalPos = resolveCollisions(tentativePos, player, allPlayers);
        player.x = finalPos.x;
        player.y = finalPos.y;
      }

      // Update dash timer
      if (player.isDashing) {
        player.dashTimeRemaining -= dt;
        if (player.dashTimeRemaining <= 0) {
          player.isDashing = false;
          player.dashTimeRemaining = 0;
        }
      }

      // Reset dash input for next tick
      player.lastInput.dashPressed = false;
    }

    // Update zone ownership
    updateZoneOwnership(this.zones, allPlayers, this.currentTime);

    // Broadcast game state to all connected clients
    this.broadcastGameState(timeLeft);
  }

  // Broadcast current game state
  broadcastGameState(timeLeft) {
    const playerStates = Array.from(this.players.values())
      .filter(p => p.connected)
      .map(p => ({
        playerId: p.playerId,
        x: p.x,
        y: p.y
      }));

    const zoneStates = this.zones.map(z => ({
      zoneId: z.zoneId,
      x: z.x,
      y: z.y,
      ownerTeamId: z.ownerTeamId,
      colorHex: z.ownerTeamId ? this.teamColorMapping[z.ownerTeamId] : null
    }));

    const state = {
      type: 'GAME_STATE',
      players: playerStates,
      zones: zoneStates,
      timeLeft: Math.ceil(timeLeft)
    };

    // Send to all players
    for (const player of this.players.values()) {
      if (player.connected && player.ws.readyState === 1) {
        // Add dash cooldown info for this specific player
        const dashCooldown = Math.max(0, player.nextDashAvailableTime - this.currentTime);
        const playerState = {
          ...state,
          dashCooldown: dashCooldown
        };
        player.ws.send(JSON.stringify(playerState));
      }
    }

    // Send to host
    if (this.hostWs && this.hostWs.readyState === 1) {
      this.hostWs.send(JSON.stringify(state));
    }
  }

  // End the game and calculate results
  endGame() {
    this.state = 'ENDED';

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Calculate sorting accuracy
    const results = this.calculateResults();

    // Broadcast end results
    const endMessage = {
      type: 'GAME_END',
      ...results
    };

    for (const player of this.players.values()) {
      if (player.connected && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify(endMessage));
      }
    }

    if (this.hostWs && this.hostWs.readyState === 1) {
      this.hostWs.send(JSON.stringify(endMessage));
    }
  }

  // Calculate final sorting accuracy
  calculateResults() {
    const connectedPlayers = Array.from(this.players.values()).filter(p => p.connected);
    const totalPlayers = connectedPlayers.length;
    let correctPlayers = 0;

    const team1Stats = { total: 0, correct: 0 };
    const team2Stats = { total: 0, correct: 0 };

    for (const player of connectedPlayers) {
      const inZone1 = distance(player.x, player.y, this.zones[0].x, this.zones[0].y) <= ZONE_RADIUS;
      const inZone2 = distance(player.x, player.y, this.zones[1].x, this.zones[1].y) <= ZONE_RADIUS;

      let targetZone = null;
      if (inZone1 && !inZone2) targetZone = this.zones[0];
      else if (inZone2 && !inZone1) targetZone = this.zones[1];

      const isCorrect = targetZone &&
                       targetZone.ownerTeamId &&
                       targetZone.ownerTeamId === player.teamId;

      if (isCorrect) correctPlayers++;

      // Per-team stats
      if (player.teamId === TEAMS.TEAM1) {
        team1Stats.total++;
        if (isCorrect) team1Stats.correct++;
      } else if (player.teamId === TEAMS.TEAM2) {
        team2Stats.total++;
        if (isCorrect) team2Stats.correct++;
      }
    }

    const accuracyPercent = totalPlayers > 0 ? Math.round((correctPlayers / totalPlayers) * 100) : 0;

    return {
      accuracyPercent,
      correctPlayers,
      totalPlayers,
      team1: {
        ...team1Stats,
        percent: team1Stats.total > 0 ? Math.round((team1Stats.correct / team1Stats.total) * 100) : 0
      },
      team2: {
        ...team2Stats,
        percent: team2Stats.total > 0 ? Math.round((team2Stats.correct / team2Stats.total) * 100) : 0
      }
    };
  }

  // Update player input
  updatePlayerInput(playerId, input) {
    const player = this.players.get(playerId);
    if (player && player.connected) {
      player.lastInput = {
        moveX: input.moveX || 0,
        moveY: input.moveY || 0,
        dashPressed: input.dashPressed || false
      };
    }
  }

  // Return to lobby (for playing another round)
  returnToLobby() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.state = 'LOBBY';
    this.teamColorMapping = null;
    this.zones = [];
    this.currentTime = 0;

    // Keep players but reset their game state
    for (const player of this.players.values()) {
      player.x = 50;
      player.y = 30;
      player.vx = 0;
      player.vy = 0;
      player.isDashing = false;
      player.dashTimeRemaining = 0;
      player.nextDashAvailableTime = 0;
    }
  }

  // Clean up the room
  destroy() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    this.players.clear();
  }
}

module.exports = GameRoom;
