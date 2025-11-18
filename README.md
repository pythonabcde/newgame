# Connection Sorting - A Classroom Multiplayer Game

A real-time multiplayer classroom game where players need to find their teammates through collaboration and inference, then enter the correct zone.

## 📖 Game Overview

**Connection Sorting** is a real-time multiplayer browser game designed for classrooms:

- **Player Count**: 4-32 players (recommended 16-24)
- **Game Duration**: 5 minutes per round
- **Device Requirements**: Any modern browser (Chrome, Firefox, Edge, Safari)

### Gameplay

1. **Host** creates a room and divides players into two teams
2. **Players** join the room and wait for the game to start
3. After the game starts:
   - Each player controls an anonymous circle
   - The current player sees themselves as **white with a green border**
   - Other players appear as **gray with a black border**
   - The game doesn't reveal which team you're on
   - Two colored zones move along the map edges
   - Players must infer their identity and teammates through movement
   - Final objective: Enter the correct colored zone with your teammates

### Controls

- **Movement**: WASD or Arrow Keys
- **Dash**: Spacebar (2-second cooldown)

## 🚀 Quick Start

### Local Development

1. **Clone the project**
   ```bash
   git clone https://github.com/pythonabcde/newgame.git
   cd newgame
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the game**
   - Open browser and visit: `http://localhost:3000`
   - Host page: `http://localhost:3000/host`
   - Player page: `http://localhost:3000/join`

## 📦 Project Structure

```
newgame/
├── server/                 # Server-side code
│   ├── index.js           # Main server file
│   ├── GameRoom.js        # Game room class
│   ├── constants.js       # Game constants
│   ├── physics.js         # Physics and collision detection
│   └── zones.js           # Zone system
├── public/                # Frontend static files
│   ├── index.html         # Homepage
│   ├── host.html          # Host interface
│   ├── join.html          # Player interface
│   ├── css/
│   │   └── style.css      # Stylesheet
│   └── js/
│       ├── host.js        # Host logic
│       ├── player.js      # Player logic
│       └── renderer.js    # Canvas renderer
├── deployment/            # Deployment configuration
│   ├── nginx.conf         # Nginx configuration
│   ├── ssl-setup.sh       # SSL certificate setup script
│   └── ecosystem.config.js # PM2 configuration
├── package.json
├── DEPLOYMENT.md          # Detailed deployment guide
├── QUICKSTART.md          # Quick deployment checklist
└── README.md
```

## 🔧 Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **WebSocket (ws)** - Real-time communication

### Frontend
- **HTML5 Canvas** - Game rendering
- **Vanilla JavaScript** - Client-side logic
- **CSS3** - Styling

### Deployment
- **Nginx** - Reverse proxy and static file serving
- **PM2** - Node.js process manager
- **Let's Encrypt** - SSL certificates
- **Cloudflare** - DNS and CDN

## 🌐 Production Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Quick Deployment Steps

1. **Prepare server** (Debian/Ubuntu)
2. **Install dependencies**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs nginx
   sudo npm install -g pm2
   ```

3. **Configure SSL certificate** (using Cloudflare DNS API)
   ```bash
   sudo bash deployment/ssl-setup.sh
   ```

4. **Configure Nginx**
   ```bash
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/game.studinlet.com
   sudo ln -s /etc/nginx/sites-available/game.studinlet.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Start application**
   ```bash
   pm2 start deployment/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

6. **Configure router port forwarding**
   - Forward ports 80 and 443 to your server

7. **Configure Cloudflare DNS**
   - Add A record: `game.studinlet.com` → Your public IP

## ⚙️ Configuration Options

Game parameters are configured in `server/constants.js`:

```javascript
module.exports = {
  MAX_PLAYERS: 32,              // Maximum players
  MIN_PLAYERS_TO_START: 4,      // Minimum players to start
  GAME_DURATION_SECONDS: 300,   // Game duration (5 minutes)
  PLAYER_SPEED: 15,             // Player movement speed
  DASH_SPEED_MULTIPLIER: 4.0,   // Dash speed multiplier
  DASH_COOLDOWN_SECONDS: 2,     // Dash cooldown time
  MAP_WIDTH: 150,               // Map width
  MAP_HEIGHT: 90,               // Map height
  ZONE_RADIUS: 12,              // Zone radius
  PLAYER_RADIUS: 1.5,           // Player radius
  // ... more configuration
};
```

## 🎮 Game Features

- ✅ Real-time multiplayer sync (30 ticks/second)
- ✅ WebSocket communication
- ✅ Room system (6-digit code)
- ✅ Drag-and-drop team assignment
- ✅ Collision detection
- ✅ Dash mechanic (with cooldown)
- ✅ Dynamic zone ownership
- ✅ Real-time scoring system
- ✅ Responsive Canvas rendering
- ✅ Player self-identification (white color with green border)
- ✅ Mobile device support

## 🐛 Known Issues

No major known issues at this time. Please submit an Issue if you find any problems.

## 📝 TODO

- [ ] Add sound effects
- [ ] Game replay feature
- [ ] Multiple room support
- [ ] Game statistics and leaderboard
- [ ] Custom game parameters interface
- [ ] Mobile touch control optimization

## 🤝 Contributing

Pull Requests and Issues are welcome!

## 📄 License

MIT License

## 🙏 Acknowledgments

Developed based on a game design document (game.md) generated by ChatGPT.

---

**Play the game**: https://game.studinlet.com

**Report issues**: [GitHub Issues](https://github.com/pythonabcde/newgame/issues)
