// Host Client Code
let ws = null;
let currentRoomCode = null;
let currentPlayers = [];
let renderer = null;
let draggedPlayerId = null;

// Show/hide views
function showView(viewId) {
  const views = ['hostLanding', 'hostLobby', 'hostGameView', 'hostEndScreen'];
  views.forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== viewId);
  });
}

// Connect to WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    alert('Connection error. Please refresh the page and try again.');
  };

  ws.onclose = () => {
    console.log('WebSocket closed');
  };
}

// Handle incoming messages
function handleMessage(data) {
  console.log('Received:', data.type);

  switch (data.type) {
    case 'ROOM_CREATED':
      currentRoomCode = data.roomCode;
      document.getElementById('roomCode').textContent = data.roomCode;
      showView('hostLobby');
      break;

    case 'LOBBY_UPDATE':
      updateLobby(data);
      break;

    case 'GAME_START':
      startGameView();
      break;

    case 'GAME_STATE':
      updateGameState(data);
      break;

    case 'GAME_END':
      showEndScreen(data);
      break;

    case 'RETURN_TO_LOBBY':
      showView('hostLobby');
      break;

    case 'ERROR':
      alert(data.message);
      break;
  }
}

// Create room
function createRoom() {
  connectWebSocket();

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'HOST_CREATE_ROOM'
    }));
  };
}

// Update lobby display
function updateLobby(data) {
  currentPlayers = data.players;

  // Update stats
  document.getElementById('totalPlayers').textContent = data.counts.total;
  document.getElementById('team1Count').textContent = data.counts.team1;
  document.getElementById('team2Count').textContent = data.counts.team2;
  document.getElementById('unassignedCount').textContent = data.counts.unassigned;

  // Update player lists
  const unassignedList = document.getElementById('unassignedList');
  const team1List = document.getElementById('team1List');
  const team2List = document.getElementById('team2List');

  unassignedList.innerHTML = '';
  team1List.innerHTML = '';
  team2List.innerHTML = '';

  data.players.forEach(player => {
    const card = createPlayerCard(player);

    if (player.teamId === 'TEAM1') {
      team1List.appendChild(card);
    } else if (player.teamId === 'TEAM2') {
      team2List.appendChild(card);
    } else {
      unassignedList.appendChild(card);
    }
  });

  // Enable/disable start button
  const canStart = data.counts.total >= 4 && data.counts.unassigned === 0;
  document.getElementById('startGameBtn').disabled = !canStart;
}

// Create a draggable player card
function createPlayerCard(player) {
  const card = document.createElement('div');
  card.className = 'player-card';
  card.textContent = player.name;
  card.draggable = true;
  card.dataset.playerId = player.playerId;

  card.addEventListener('dragstart', (e) => {
    draggedPlayerId = player.playerId;
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', (e) => {
    draggedPlayerId = null;
    card.classList.remove('dragging');
  });

  return card;
}

// Setup drag and drop
document.addEventListener('DOMContentLoaded', () => {
  // Check if we should auto-create room
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('create') === 'true') {
    // Automatically create room, skip landing page
    createRoom();
  }

  const dropZones = document.querySelectorAll('.drop-zone');

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', (e) => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      if (draggedPlayerId) {
        const teamId = zone.dataset.team === 'null' ? null : zone.dataset.team;

        // Send update to server
        ws.send(JSON.stringify({
          type: 'HOST_UPDATE_TEAM',
          playerId: draggedPlayerId,
          teamId: teamId
        }));
      }
    });
  });
});

// Start game
function startGame() {
  ws.send(JSON.stringify({
    type: 'HOST_START_GAME'
  }));
}

// Start game view
function startGameView() {
  showView('hostGameView');

  const canvas = document.getElementById('gameCanvas');
  renderer = new GameRenderer(canvas);
}

// Update game state
function updateGameState(data) {
  if (renderer) {
    renderer.render(data);
  }

  // Update HUD
  if (data.timeLeft !== undefined) {
    document.getElementById('timer').textContent = formatTime(data.timeLeft);
  }

  if (data.players) {
    document.getElementById('playerCount').textContent = `Players: ${data.players.length}`;
  }
}

// Show end screen
function showEndScreen(data) {
  showView('hostEndScreen');

  document.getElementById('accuracyPercent').textContent = `${data.accuracyPercent}%`;
  document.getElementById('correctPlayers').textContent = data.correctPlayers;
  document.getElementById('totalPlayersEnd').textContent = data.totalPlayers;

  if (data.team1) {
    document.getElementById('team1Accuracy').textContent =
      `${data.team1.correct}/${data.team1.total} (${data.team1.percent}%)`;
  }

  if (data.team2) {
    document.getElementById('team2Accuracy').textContent =
      `${data.team2.correct}/${data.team2.total} (${data.team2.percent}%)`;
  }
}

// Return to lobby
function returnToLobby() {
  ws.send(JSON.stringify({
    type: 'HOST_RETURN_TO_LOBBY'
  }));

  showView('hostLobby');
}

// End session
function endSession() {
  if (confirm('Are you sure you want to end the session? All players will be disconnected.')) {
    ws.send(JSON.stringify({
      type: 'HOST_END_SESSION'
    }));

    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  }
}
