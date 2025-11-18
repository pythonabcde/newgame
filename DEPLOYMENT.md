# Connection Sorting Game Deployment Guide

Complete production environment deployment guide for Debian systems + home network + Cloudflare.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Preparation](#preparation)
3. [Server Environment Configuration](#server-environment-configuration)
4. [Project Deployment](#project-deployment)
5. [SSL Certificate Configuration](#ssl-certificate-configuration)
6. [Nginx Configuration](#nginx-configuration)
7. [Router Port Mapping](#router-port-mapping)
8. [Cloudflare DNS Configuration](#cloudflare-dns-configuration)
9. [Startup and Testing](#startup-and-testing)
10. [Maintenance and Monitoring](#maintenance-and-monitoring)
11. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware Requirements
- **CPU**: 2 cores or more
- **Memory**: At least 2GB RAM
- **Storage**: At least 10GB available space
- **Network**: Stable internet connection, at least 10Mbps up/down

### Software Requirements
- **Operating System**: Debian 11/12 (or Ubuntu 20.04/22.04)
- **Node.js**: v18.x or v20.x LTS
- **Nginx**: Latest stable version
- **PM2**: Latest version

---

## Preparation

### 1. Obtain Cloudflare API Token

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Select **Edit zone DNS** template
5. Configure permissions:
   - **Zone** → **DNS** → **Edit**
   - **Zone Resources**: Select your domain `studinlet.com`
6. After creation, **save the API Token** (only shown once)

### 2. Record Your Information

Prepare the following information:
- Cloudflare API Token: `your-api-token-here`
- Domain: `game.studinlet.com`
- Email: `your-email@example.com`
- Internal server IP: e.g., `192.168.1.100`

---

## Server Environment Configuration

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js

```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 3. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 4. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
```

### 5. Configure Firewall

```bash
# Install UFW (if not installed)
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Project Deployment

### 1. Clone or Upload Project

**Method A: Using Git (Recommended)**

```bash
# Install Git
sudo apt install -y git

# Clone project
cd ~
git clone https://github.com/your-username/newgame.git
cd newgame
```

**Method B: Manual Upload**

Use SCP or SFTP to upload project files to server:

```bash
# Run on local computer (assuming server IP is 192.168.1.100)
scp -r /path/to/newgame user@192.168.1.100:~/
```

### 2. Install Dependencies

```bash
cd ~/newgame
npm install
```

### 3. Test Run

```bash
# Temporary test
node server/index.js

# If you see the following output, it's successful:
# Server running on port 3000
# WebSocket server ready
```

Press `Ctrl+C` to stop the test.

---

## SSL Certificate Configuration

### 1. Modify SSL Configuration Script

Edit the SSL configuration script:

```bash
nano ~/newgame/deployment/ssl-setup.sh
```

Modify the following variables:

```bash
EMAIL="your-email@example.com"              # Change to your email
CLOUDFLARE_API_TOKEN="your-api-token-here"  # Change to your Cloudflare API Token
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

### 2. Run SSL Configuration Script

```bash
sudo bash ~/newgame/deployment/ssl-setup.sh
```

The script will automatically:
- Install certbot and cloudflare plugin
- Request SSL certificate
- Configure automatic renewal

If successful, you will see:

```
SSL certificate request successful!
Certificate location: /etc/letsencrypt/live/game.studinlet.com/
```

### 3. Verify Certificate

```bash
sudo certbot certificates
```

You should see your certificate information.

---

## Nginx Configuration

### 1. Copy Nginx Configuration File

```bash
sudo cp ~/newgame/deployment/nginx.conf /etc/nginx/sites-available/game.studinlet.com
```

### 2. Create Symbolic Link

```bash
sudo ln -s /etc/nginx/sites-available/game.studinlet.com /etc/nginx/sites-enabled/
```

### 3. Remove Default Configuration (Optional)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 4. Test Nginx Configuration

```bash
sudo nginx -t
```

You should see:

```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Restart Nginx

```bash
sudo systemctl restart nginx
```

### 6. Check Nginx Status

```bash
sudo systemctl status nginx
```

Should display `active (running)`.

---

## Router Port Mapping

### Configuration Steps

1. **Log in to Router Management Interface**
   - Usually `192.168.1.1` or `192.168.0.1`
   - Log in with router admin credentials

2. **Find Port Mapping/Port Forwarding Settings**
   - Different router interfaces vary, may be called:
     - Port Forwarding
     - Virtual Server
     - NAT Settings
     - Port Mapping

3. **Add Port Mapping Rules**

   Create the following two rules:

   **Rule 1: HTTP (Port 80)**
   - Service Name: `HTTP`
   - External Port: `80`
   - Internal IP: `192.168.1.100` (your Debian server's internal IP)
   - Internal Port: `80`
   - Protocol: `TCP`

   **Rule 2: HTTPS (Port 443)**
   - Service Name: `HTTPS`
   - External Port: `443`
   - Internal IP: `192.168.1.100`
   - Internal Port: `443`
   - Protocol: `TCP`

4. **Save and Apply Settings**

### Verify Port Mapping

```bash
# Install netcat on server
sudo apt install -y netcat

# Test port 80
sudo nc -l 80

# On another computer or mobile (use mobile network, not home WiFi) access:
# http://your-public-IP
# If it can connect, port mapping is successful
```

### Check Public IP

```bash
curl ifconfig.me
```

---

## Cloudflare DNS Configuration

### 1. Log in to Cloudflare

Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)

### 2. Select Your Domain

Click `studinlet.com`

### 3. Add DNS Record

Go to **DNS** → **Records**

Click **Add record**:

- **Type**: `A`
- **Name**: `game`
- **IPv4 address**: Your public IP (obtained via `curl ifconfig.me`)
- **Proxy status**:
  - **Orange cloud** (Proxied) - Recommended, enables Cloudflare CDN and protection
  - Or **Gray cloud** (DNS only) - Direct connection, not through Cloudflare
- **TTL**: Auto

Click **Save**

### 4. Wait for DNS Propagation

Usually takes a few minutes, up to 24 hours maximum.

Verify DNS:

```bash
nslookup game.studinlet.com
```

Should return your public IP.

---

## Startup and Testing

### 1. Configure PM2

Modify PM2 configuration file:

```bash
nano ~/newgame/deployment/ecosystem.config.js
```

Confirm the path is correct:

```javascript
cwd: '/home/user/newgame',  // Change to your actual path, e.g., /home/youruser/newgame
```

### 2. Start Application with PM2

```bash
cd ~/newgame
pm2 start deployment/ecosystem.config.js
```

### 3. Check Application Status

```bash
pm2 status
```

You should see:

```
┌────┬────────────────────────────┬─────────┬──────┐
│ id │ name                       │ status  │ cpu  │
├────┼────────────────────────────┼─────────┼──────┤
│ 0  │ connection-sorting-game    │ online  │ 0%   │
└────┴────────────────────────────┴─────────┴──────┘
```

### 4. View Logs

```bash
# View logs in real-time
pm2 logs

# View error logs
pm2 logs --err

# View output logs
pm2 logs --out
```

### 5. Set PM2 to Start on Boot

```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Run the command shown in the output, for example:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u user --hp /home/user
```

### 6. Test Access

Access in your browser:

```
https://game.studinlet.com
```

You should see the game homepage!

---

## Maintenance and Monitoring

### Common PM2 Commands

```bash
# Check status
pm2 status

# Restart application
pm2 restart connection-sorting-game

# Stop application
pm2 stop connection-sorting-game

# View logs
pm2 logs connection-sorting-game

# View detailed information
pm2 info connection-sorting-game

# Monitor resource usage
pm2 monit

# Restart after code update
cd ~/newgame
git pull
npm install
pm2 restart connection-sorting-game
```

### Log Management

```bash
# PM2 log location
/var/log/pm2/connection-sorting-error.log
/var/log/pm2/connection-sorting-out.log

# Nginx log location
/var/log/nginx/game.studinlet.com_access.log
/var/log/nginx/game.studinlet.com_error.log

# Clean old logs
pm2 flush
```

### SSL Certificate Auto-renewal

Certbot will automatically renew certificates, but you can also test manually:

```bash
# Test renewal (won't actually renew)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### System Monitoring

```bash
# View system resources
htop

# View disk usage
df -h

# View memory usage
free -h

# View network connections
ss -tunlp
```

---

## Troubleshooting

### Issue 1: Cannot Access Website

**Troubleshooting Steps:**

1. **Check if Node.js application is running**
   ```bash
   pm2 status
   pm2 logs
   ```

2. **Check if Nginx is running**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Check if ports are listening**
   ```bash
   sudo netstat -tulnp | grep :3000  # Node.js
   sudo netstat -tulnp | grep :80    # Nginx HTTP
   sudo netstat -tulnp | grep :443   # Nginx HTTPS
   ```

4. **Check firewall**
   ```bash
   sudo ufw status
   ```

5. **Check router port mapping**
   - Confirm external access to your public IP ports 80 and 443

6. **Check DNS resolution**
   ```bash
   nslookup game.studinlet.com
   ```

### Issue 2: SSL Certificate Error

**Troubleshooting Steps:**

1. **Verify certificate**
   ```bash
   sudo certbot certificates
   ```

2. **Check certificate files**
   ```bash
   sudo ls -la /etc/letsencrypt/live/game.studinlet.com/
   ```

3. **Reapply for certificate**
   ```bash
   sudo certbot delete --cert-name game.studinlet.com
   sudo bash ~/newgame/deployment/ssl-setup.sh
   ```

### Issue 3: WebSocket Connection Failed

**Troubleshooting Steps:**

1. **Check Nginx configuration**
   ```bash
   sudo nginx -t
   grep -A 20 "location /" /etc/nginx/sites-available/game.studinlet.com
   ```

2. **Confirm WebSocket upgrade headers exist**
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. **Check Cloudflare settings**
   - If using Cloudflare proxy, ensure WebSocket is enabled
   - Cloudflare Dashboard → Network → WebSocket: ON

### Issue 4: Game Lag or High Latency

**Optimization Steps:**

1. **Check server resources**
   ```bash
   htop
   pm2 monit
   ```

2. **Optimize Nginx**
   - Increase worker processes
   - Adjust buffer sizes

3. **Check network**
   ```bash
   ping -c 10 game.studinlet.com
   traceroute game.studinlet.com
   ```

### Issue 5: PM2 Application Frequently Restarts

**Troubleshooting Steps:**

1. **View error logs**
   ```bash
   pm2 logs --err
   ```

2. **Increase memory limit**
   Edit `ecosystem.config.js`:
   ```javascript
   max_memory_restart: '1G',  // Change to 1GB
   ```

3. **Check Node.js version**
   ```bash
   node --version
   ```

---

## Performance Optimization Suggestions

### 1. Enable Gzip Compression

Edit `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript
           application/x-javascript application/xml+rss
           application/javascript application/json;
```

### 2. Static File Caching

Already included in Nginx configuration, confirm it's enabled.

### 3. Use Cloudflare CDN

Recommended to enable Cloudflare proxy (orange cloud), which provides:
- Accelerated global access
- Hide real IP
- DDoS protection
- Automatic HTTPS

### 4. Regular Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd ~/newgame
npm update

# Update PM2
sudo npm update -g pm2
```

---

## Backup Recommendations

### Regular Backup of Important Files

```bash
# Create backup script
cat > ~/backup-game.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup project
tar -czf $BACKUP_DIR/newgame_$DATE.tar.gz ~/newgame

# Backup Nginx configuration
sudo cp /etc/nginx/sites-available/game.studinlet.com $BACKUP_DIR/nginx_$DATE.conf

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/newgame_$DATE.tar.gz"
EOF

chmod +x ~/backup-game.sh

# Set up scheduled backup (every day at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-game.sh") | crontab -
```

---

## Security Recommendations

1. **Regularly update system and software**
2. **Use strong passwords**
3. **Enable SSH key authentication, disable password login**
4. **Configure fail2ban to prevent brute force attacks**
5. **Regularly check logs**
6. **Restrict SSH access by IP**

---

## Contact and Support

If you have issues, check:
1. Game logs: `pm2 logs`
2. Nginx logs: `/var/log/nginx/`
3. System logs: `journalctl -xe`

---

**Wishing you a successful deployment! 🎉**
