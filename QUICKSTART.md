# 🚀 Quick Deployment Checklist

Quick deployment steps for your environment (Debian + Home Network + Cloudflare + game.studinlet.com).

---

## ✅ Pre-Deployment Checklist

Before you begin, make sure you have:

- [ ] Debian server (with internet connection)
- [ ] Public IP address
- [ ] Router administrator access
- [ ] Cloudflare account and API Token
- [ ] Domain studinlet.com hosted on Cloudflare

---

## 📝 Preparation

### 1. Get Cloudflare API Token

```
1. Visit: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Select "Edit zone DNS" template
4. Zone Resources: studinlet.com
5. Create and save the Token (only shown once!)
```

**Save your Token**: `_______________________________________`

### 2. Record Your Information

- **Private IP**: `_______________________` (e.g., 192.168.1.100)
- **Public IP**: `_______________________` (Run `curl ifconfig.me` to get it)
- **Email**: `_______________________`

---

## 🔧 Deployment Steps (Approximately 30 minutes)

### Step 1: Basic Environment (10 minutes)

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install other tools
sudo apt install -y nginx git
sudo npm install -g pm2

# 4. Verify installation
node --version    # Should be v20.x.x
nginx -v          # Should show version number
pm2 --version     # Should show version number
```

### Step 2: Download Project (2 minutes)

```bash
# Clone project
cd ~
git clone https://github.com/pythonabcde/newgame.git
cd newgame

# Install dependencies
npm install
```

### Step 3: SSL Certificate (5 minutes)

```bash
# 1. Edit SSL configuration script
nano deployment/ssl-setup.sh

# Modify these two lines:
#   EMAIL="your-email@example.com"              # Change to your email
#   CLOUDFLARE_API_TOKEN="your-api-token-here"  # Change to your Token

# 2. Run the script
sudo bash deployment/ssl-setup.sh

# If successful, it will display:
# "SSL certificate application successful!"
```

### Step 4: Nginx Configuration (3 minutes)

```bash
# 1. Copy configuration file
sudo cp deployment/nginx.conf /etc/nginx/sites-available/game.studinlet.com

# 2. Create symbolic link
sudo ln -s /etc/nginx/sites-available/game.studinlet.com /etc/nginx/sites-enabled/

# 3. Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# 4. Test configuration
sudo nginx -t

# Should display: "syntax is ok" and "test is successful"

# 5. Restart Nginx
sudo systemctl restart nginx

# 6. Check status
sudo systemctl status nginx
# Should display "active (running)"
```

### Step 5: Start Game Service (2 minutes)

```bash
# 1. Modify PM2 configuration (if path is different)
nano deployment/ecosystem.config.js
# Confirm the cwd path is correct, e.g.: cwd: '/home/youruser/newgame'

# 2. Start application
pm2 start deployment/ecosystem.config.js

# 3. Check status
pm2 status
# Should display "online"

# 4. Set up auto-start on boot
pm2 save
pm2 startup
# Run the command shown in the prompt

# 5. View logs
pm2 logs
```

### Step 6: Firewall Configuration (2 minutes)

```bash
# 1. Install and configure UFW
sudo apt install -y ufw

# 2. Allow necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 3. Enable firewall
sudo ufw enable

# 4. Check status
sudo ufw status
```

### Step 7: Router Port Forwarding (5 minutes)

**Operations in router management interface:**

1. Log in to your router (usually 192.168.1.1 or 192.168.0.1)

2. Find "Port Forwarding" or "Port Mapping" settings

3. Add the following rules:

**Rule 1 - HTTP:**
```
Name: HTTP
External Port: 80
Internal IP: 192.168.1.100 (Your Debian server IP)
Internal Port: 80
Protocol: TCP
```

**Rule 2 - HTTPS:**
```
Name: HTTPS
External Port: 443
Internal IP: 192.168.1.100
Internal Port: 443
Protocol: TCP
```

4. Save and apply

5. **Verify port forwarding:**
```bash
# From external network (use mobile data or another network), access:
http://your-public-ip

# If you can see the Nginx page or the game, it's successful!
```

### Step 8: Cloudflare DNS Configuration (5 minutes)

1. **Log in to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com

2. **Select Domain**
   - Click `studinlet.com`

3. **Add DNS Record**
   - Go to "DNS" → "Records"
   - Click "Add record"

**Configuration:**
```
Type: A
Name: game
IPv4 address: [Your public IP]
Proxy status: ✅ Proxied (Orange cloud, recommended)
TTL: Auto
```

4. **Save**

5. **Wait for DNS propagation** (Usually 1-5 minutes)

6. **Verify DNS:**
```bash
nslookup game.studinlet.com
# Should return your public IP or Cloudflare's IP
```

---

## 🎉 Test Access

In your browser, visit:

```
https://game.studinlet.com
```

You should see the game homepage!

### Test Game Flow:

1. **Host**: Visit `https://game.studinlet.com/host`
   - Click "Create Room"
   - Note the 6-digit room code

2. **Players** (using phone or other devices): Visit `https://game.studinlet.com/join`
   - Enter room code and name
   - Join the game

3. **Host**:
   - Drag players to two teams
   - Click "Start Game"

4. **Players**:
   - Use WASD or arrow keys to move
   - Spacebar to dash

---

## 🔍 Troubleshooting

### Cannot Access Website?

```bash
# 1. Check Node.js application
pm2 status
pm2 logs

# 2. Check Nginx
sudo systemctl status nginx
sudo nginx -t

# 3. Check port listening
sudo netstat -tulnp | grep :3000  # Node.js
sudo netstat -tulnp | grep :80     # HTTP
sudo netstat -tulnp | grep :443    # HTTPS

# 4. Check firewall
sudo ufw status

# 5. Test local access
curl http://localhost:3000
```

### SSL Certificate Issues?

```bash
# Check certificate
sudo certbot certificates

# Reapply
sudo certbot delete --cert-name game.studinlet.com
sudo bash ~/newgame/deployment/ssl-setup.sh
```

### WebSocket Connection Failed?

```bash
# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx

# If using Cloudflare proxy, make sure WebSocket is enabled
# Cloudflare Dashboard → Network → WebSocket: ON
```

---

## 📊 Monitoring and Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs

# Nginx access logs
sudo tail -f /var/log/nginx/game.studinlet.com_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/game.studinlet.com_error.log
```

### Restart Services

```bash
# Restart game
pm2 restart connection-sorting-game

# Restart Nginx
sudo systemctl restart nginx
```

### Update Code

```bash
cd ~/newgame
git pull
npm install
pm2 restart connection-sorting-game
```

---

## 📚 More Information

- **Complete Deployment Documentation**: See `DEPLOYMENT.md`
- **Game Instructions**: See `README.md`
- **Original Design Documentation**: See `game.md`

---

## ✅ Deployment Completion Checklist

- [ ] Server environment configured (Node.js, Nginx, PM2)
- [ ] SSL certificate successfully applied
- [ ] Nginx configuration completed and running
- [ ] Game service started (pm2 status shows online)
- [ ] Firewall configured
- [ ] Router port forwarding set up
- [ ] Cloudflare DNS configured
- [ ] Can access via https://game.studinlet.com
- [ ] Game functions properly (Host creates room, players join)

---

**Wishing you a successful deployment! If you have any issues, please see DEPLOYMENT.md for detailed help.** 🎮🚀
