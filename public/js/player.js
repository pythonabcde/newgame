// Player Client Code
let ws = null;
let playerId = null;
let roomCode = null;
let renderer = null;

// Input state
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
  space: false
};

let dashPressed = false;

// Show/hide views
function showView(viewId) {
  const views = ['joinForm', 'waitingRoom', 'gameView', 'endScreen'];
  views.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('hidden', id !== viewId);
    }
  });
}

// Show error message
function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.classList.add('show');

  setTimeout(() => {
    errorEl.classList.remove('show');
  }, 5000);
}

// Join game form submission
document.addEventListener('DOMContentLoaded', () => {
  const joinForm = document.getElementById('joinGameForm');
  if (joinForm) {
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const roomCodeInput = document.getElementById('roomCode').value.trim().toUpperCase();
      const playerName = document.getElementById('playerName').value.trim();

      if (!roomCodeInput) {
        showError('Please enter a room code');
        return;
      }

      if (!playerName) {
        showError('Please enter your name');
        return;
      }

      joinGame(roomCodeInput, playerName);
    });
  }

  // Setup keyboard input
  setupInput();
});

// Connect to WebSocket and join game
function joinGame(code, name) {
  roomCode = code;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connected');

    ws.send(JSON.stringify({
      type: 'PLAYER_JOIN_ROOM',
      roomCode: code,
      name: name
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showError('Connection error. Please try again.');
  };

  ws.onclose = () => {
    console.log('WebSocket closed');
  };
}

// Handle incoming messages
function handleMessage(data) {
  console.log('Received:', data.type);

  switch (data.type) {
    case 'JOIN_SUCCESS':
      playerId = data.playerId;
      showView('waitingRoom');
      break;

    case 'LOBBY_UPDATE':
      // Player doesn't need to do anything with lobby updates
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
      showView('waitingRoom');
      break;

    case 'SESSION_ENDED':
      alert(data.message || 'Session has ended');
      window.location.href = '/';
      break;

    case 'ERROR':
      showError(data.message);
      break;
  }
}

// Start game view
function startGameView() {
  showView('gameView');

  const canvas = document.getElementById('gameCanvas');
  renderer = new GameRenderer(canvas, playerId); // Pass playerId to highlight current player

  // Start sending input
  startInputLoop();
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

  // Update dash cooldown UI
  if (data.dashCooldown !== undefined) {
    updateDashUI(data.dashCooldown);
  }
}

// Update dash cooldown UI
function updateDashUI(cooldown) {
  const dashFill = document.getElementById('dashFill');
  const dashStatus = document.getElementById('dashStatus');

  if (cooldown <= 0) {
    // Dash is ready
    dashFill.style.width = '100%';
    dashStatus.textContent = 'READY';
    dashStatus.className = 'dash-status ready';
  } else {
    // Dash is on cooldown
    const DASH_COOLDOWN = 2; // seconds
    const percent = Math.max(0, (DASH_COOLDOWN - cooldown) / DASH_COOLDOWN * 100);
    dashFill.style.width = `${percent}%`;
    dashStatus.textContent = `${cooldown.toFixed(1)}s`;
    dashStatus.className = 'dash-status cooldown';
  }
}

// Show end screen
function showEndScreen(data) {
  showView('endScreen');

  document.getElementById('accuracyPercent').textContent = `${data.accuracyPercent}%`;

  const endStats = document.getElementById('endStats');
  endStats.innerHTML = `
    <div class="stat-row">
      <span>Correct Players:</span>
      <span>${data.correctPlayers}</span>
    </div>
    <div class="stat-row">
      <span>Total Players:</span>
      <span>${data.totalPlayers}</span>
    </div>
  `;
}

// Ready for next round
function readyForNextRound() {
  showView('waitingRoom');
}

// Setup keyboard input
function setupInput() {
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key in keys) {
      keys[key] = true;
    }

    if (key === ' ' || key === 'spacebar') {
      e.preventDefault();
      dashPressed = true;
    }
  });

  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();

    if (key in keys) {
      keys[key] = false;
    }
  });
}

// Get current movement input
function getMovementInput() {
  let moveX = 0;
  let moveY = 0;

  // WASD
  if (keys.w) moveY -= 1;
  if (keys.s) moveY += 1;
  if (keys.a) moveX -= 1;
  if (keys.d) moveX += 1;

  // Arrow keys
  if (keys.ArrowUp) moveY -= 1;
  if (keys.ArrowDown) moveY += 1;
  if (keys.ArrowLeft) moveX -= 1;
  if (keys.ArrowRight) moveX += 1;

  return { moveX, moveY };
}

// Input sending loop
let inputInterval = null;

function startInputLoop() {
  // Send input at 30 times per second
  inputInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const { moveX, moveY } = getMovementInput();

      ws.send(JSON.stringify({
        type: 'PLAYER_INPUT',
        moveX,
        moveY,
        dashPressed: dashPressed
      }));

      // Reset dash press after sending
      dashPressed = false;
    }
  }, 1000 / 30);
}

// Stop input loop when leaving
window.addEventListener('beforeunload', () => {
  if (inputInterval) {
    clearInterval(inputInterval);
  }
});

// Format time (use the same function from renderer.js)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
