// Game Renderer for Canvas
class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mapWidth = 150;
    this.mapHeight = 90;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth || window.innerWidth;
    const containerHeight = container.clientHeight || window.innerHeight;

    // Calculate scale to fit the map (use 95% to ensure everything fits)
    const scaleX = containerWidth / this.mapWidth;
    const scaleY = containerHeight / this.mapHeight;
    this.scale = Math.min(scaleX, scaleY) * 0.95; // 95% to ensure zones stay visible

    // Calculate offsets to center the map
    this.offsetX = (containerWidth - this.mapWidth * this.scale) / 2;
    this.offsetY = (containerHeight - this.mapHeight * this.scale) / 2;

    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;
  }

  clear() {
    this.ctx.fillStyle = '#FAFAFA';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // Draw grid lines
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 0.1;

    // Vertical lines
    for (let x = 0; x <= this.mapWidth; x += 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.mapHeight);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= this.mapHeight; y += 5) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.mapWidth, y);
      this.ctx.stroke();
    }

    // Map border
    this.ctx.strokeStyle = '#BDBDBD';
    this.ctx.lineWidth = 0.2;
    this.ctx.strokeRect(0, 0, this.mapWidth, this.mapHeight);

    this.ctx.restore();
  }

  drawZones(zones) {
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    for (const zone of zones) {
      const radius = 15; // ZONE_RADIUS (increased to 1.25x diameter)

      // Determine fill and stroke colors based on ownership
      let fillColor, strokeColor;

      if (!zone.ownerTeamId || !zone.colorHex) {
        fillColor = 'rgba(200, 200, 200, 0.3)';
        strokeColor = '#9E9E9E';
      } else {
        // Convert hex to rgba
        const hex = zone.colorHex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        fillColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        strokeColor = hex;
      }

      // Draw zone circle
      this.ctx.beginPath();
      this.ctx.arc(zone.x, zone.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 0.3;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawPlayers(players) {
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    const radius = 1.5; // PLAYER_RADIUS

    for (const player of players) {
      // Draw player circle - all players look the same (gray)
      this.ctx.beginPath();
      this.ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#E0E0E0'; // Light gray for all players
      this.ctx.fill();
      this.ctx.strokeStyle = '#000000'; // Black border
      this.ctx.lineWidth = 0.15;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  render(gameState) {
    this.clear();
    this.drawGrid();

    if (gameState.zones) {
      this.drawZones(gameState.zones);
    }

    if (gameState.players) {
      this.drawPlayers(gameState.players);
    }
  }
}

// Format time in mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
