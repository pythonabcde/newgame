# Connection Sorting 游戏部署指南

完整的生产环境部署指南，适用于Debian系统 + 家庭网络 + Cloudflare。

---

## 📋 目录

1. [系统要求](#系统要求)
2. [准备工作](#准备工作)
3. [服务器环境配置](#服务器环境配置)
4. [项目部署](#项目部署)
5. [SSL证书配置](#ssl证书配置)
6. [Nginx配置](#nginx配置)
7. [路由器端口映射](#路由器端口映射)
8. [Cloudflare DNS配置](#cloudflare-dns配置)
9. [启动和测试](#启动和测试)
10. [维护和监控](#维护和监控)
11. [故障排除](#故障排除)

---

## 系统要求

### 硬件要求
- **CPU**: 2核心或以上
- **内存**: 至少2GB RAM
- **存储**: 至少10GB可用空间
- **网络**: 稳定的互联网连接，上下行至少10Mbps

### 软件要求
- **操作系统**: Debian 11/12 (或 Ubuntu 20.04/22.04)
- **Node.js**: v18.x 或 v20.x LTS
- **Nginx**: 最新稳定版
- **PM2**: 最新版本

---

## 准备工作

### 1. 获取Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **My Profile** → **API Tokens**
3. 点击 **Create Token**
4. 选择 **Edit zone DNS** 模板
5. 配置权限:
   - **Zone** → **DNS** → **Edit**
   - **Zone Resources**: 选择你的域名 `studinlet.com`
6. 创建后**保存API Token**（只显示一次）

### 2. 记录你的信息

准备以下信息:
- Cloudflare API Token: `your-api-token-here`
- 域名: `game.studinlet.com`
- 邮箱: `your-email@example.com`
- 内网服务器IP: 例如 `192.168.1.100`

---

## 服务器环境配置

### 1. 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. 安装Node.js

```bash
# 安装Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应显示 v20.x.x
npm --version   # 应显示 10.x.x
```

### 3. 安装PM2

```bash
# 全局安装PM2
sudo npm install -g pm2

# 验证安装
pm2 --version
```

### 4. 安装Nginx

```bash
# 安装Nginx
sudo apt install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证安装
nginx -v
```

### 5. 配置防火墙

```bash
# 安装UFW (如果未安装)
sudo apt install -y ufw

# 允许SSH
sudo ufw allow 22/tcp

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 项目部署

### 1. 克隆或上传项目

**方法A: 使用Git (推荐)**

```bash
# 安装Git
sudo apt install -y git

# 克隆项目
cd ~
git clone https://github.com/your-username/newgame.git
cd newgame
```

**方法B: 手动上传**

使用SCP或SFTP上传项目文件到服务器:

```bash
# 在本地电脑上运行 (假设服务器IP是 192.168.1.100)
scp -r /path/to/newgame user@192.168.1.100:~/
```

### 2. 安装依赖

```bash
cd ~/newgame
npm install
```

### 3. 测试运行

```bash
# 临时测试
node server/index.js

# 如果看到以下输出说明成功:
# Server running on port 3000
# WebSocket server ready
```

按 `Ctrl+C` 停止测试。

---

## SSL证书配置

### 1. 修改SSL配置脚本

编辑 SSL 配置脚本:

```bash
nano ~/newgame/deployment/ssl-setup.sh
```

修改以下变量:

```bash
EMAIL="your-email@example.com"              # 改成你的邮箱
CLOUDFLARE_API_TOKEN="your-api-token-here"  # 改成你的Cloudflare API Token
```

保存并退出 (`Ctrl+X`, 然后 `Y`, 然后 `Enter`)

### 2. 运行SSL配置脚本

```bash
sudo bash ~/newgame/deployment/ssl-setup.sh
```

脚本会自动:
- 安装certbot和cloudflare插件
- 申请SSL证书
- 配置自动续期

如果成功,你会看到:

```
SSL证书申请成功！
证书位置: /etc/letsencrypt/live/game.studinlet.com/
```

### 3. 验证证书

```bash
sudo certbot certificates
```

应该看到你的证书信息。

---

## Nginx配置

### 1. 复制Nginx配置文件

```bash
sudo cp ~/newgame/deployment/nginx.conf /etc/nginx/sites-available/game.studinlet.com
```

### 2. 创建符号链接

```bash
sudo ln -s /etc/nginx/sites-available/game.studinlet.com /etc/nginx/sites-enabled/
```

### 3. 删除默认配置 (可选)

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 4. 测试Nginx配置

```bash
sudo nginx -t
```

应该看到:

```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. 重启Nginx

```bash
sudo systemctl restart nginx
```

### 6. 检查Nginx状态

```bash
sudo systemctl status nginx
```

应该显示 `active (running)`。

---

## 路由器端口映射

### 配置步骤

1. **登录路由器管理界面**
   - 通常是 `192.168.1.1` 或 `192.168.0.1`
   - 使用路由器管理员账号密码登录

2. **找到端口映射/端口转发设置**
   - 不同路由器界面不同,可能叫:
     - Port Forwarding
     - Virtual Server
     - NAT设置
     - 端口映射

3. **添加端口映射规则**

   创建以下两条规则:

   **规则1: HTTP (端口80)**
   - 服务名称: `HTTP`
   - 外部端口: `80`
   - 内部IP: `192.168.1.100` (你的Debian服务器内网IP)
   - 内部端口: `80`
   - 协议: `TCP`

   **规则2: HTTPS (端口443)**
   - 服务名称: `HTTPS`
   - 外部端口: `443`
   - 内部IP: `192.168.1.100`
   - 内部端口: `443`
   - 协议: `TCP`

4. **保存并应用设置**

### 验证端口映射

```bash
# 在服务器上安装netcat
sudo apt install -y netcat

# 测试80端口
sudo nc -l 80

# 在另一台电脑或手机上(使用移动网络,不要用家里WiFi)访问:
# http://你的公网IP
# 如果能连接,说明端口映射成功
```

### 查看公网IP

```bash
curl ifconfig.me
```

---

## Cloudflare DNS配置

### 1. 登录Cloudflare

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)

### 2. 选择你的域名

点击 `studinlet.com`

### 3. 添加DNS记录

进入 **DNS** → **Records**

点击 **Add record**:

- **Type**: `A`
- **Name**: `game`
- **IPv4 address**: 你的公网IP (通过 `curl ifconfig.me` 获取)
- **Proxy status**:
  - **橙色云朵** (Proxied) - 推荐,启用Cloudflare CDN和防护
  - 或 **灰色云朵** (DNS only) - 直连,不经过Cloudflare
- **TTL**: Auto

点击 **Save**

### 4. 等待DNS传播

通常需要几分钟,最多24小时。

验证DNS:

```bash
nslookup game.studinlet.com
```

应该返回你的公网IP。

---

## 启动和测试

### 1. 配置PM2

修改PM2配置文件:

```bash
nano ~/newgame/deployment/ecosystem.config.js
```

确认路径正确:

```javascript
cwd: '/home/user/newgame',  // 改成你的实际路径,例如 /home/youruser/newgame
```

### 2. 使用PM2启动应用

```bash
cd ~/newgame
pm2 start deployment/ecosystem.config.js
```

### 3. 查看应用状态

```bash
pm2 status
```

应该看到:

```
┌────┬────────────────────────────┬─────────┬──────┐
│ id │ name                       │ status  │ cpu  │
├────┼────────────────────────────┼─────────┼──────┤
│ 0  │ connection-sorting-game    │ online  │ 0%   │
└────┴────────────────────────────┴─────────┴──────┘
```

### 4. 查看日志

```bash
# 实时查看日志
pm2 logs

# 查看错误日志
pm2 logs --err

# 查看输出日志
pm2 logs --out
```

### 5. 设置PM2开机自启

```bash
# 保存当前PM2进程列表
pm2 save

# 生成开机自启脚本
pm2 startup

# 按照提示运行显示的命令,例如:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u user --hp /home/user
```

### 6. 测试访问

在浏览器中访问:

```
https://game.studinlet.com
```

你应该看到游戏首页！

---

## 维护和监控

### PM2 常用命令

```bash
# 查看状态
pm2 status

# 重启应用
pm2 restart connection-sorting-game

# 停止应用
pm2 stop connection-sorting-game

# 查看日志
pm2 logs connection-sorting-game

# 查看详细信息
pm2 info connection-sorting-game

# 监控资源使用
pm2 monit

# 更新代码后重启
cd ~/newgame
git pull
npm install
pm2 restart connection-sorting-game
```

### 日志管理

```bash
# PM2日志位置
/var/log/pm2/connection-sorting-error.log
/var/log/pm2/connection-sorting-out.log

# Nginx日志位置
/var/log/nginx/game.studinlet.com_access.log
/var/log/nginx/game.studinlet.com_error.log

# 清理旧日志
pm2 flush
```

### SSL证书自动续期

Certbot会自动续期证书,你也可以手动测试:

```bash
# 测试续期 (不会真的续期)
sudo certbot renew --dry-run

# 强制续期
sudo certbot renew --force-renewal
```

### 系统监控

```bash
# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看网络连接
ss -tunlp
```

---

## 故障排除

### 问题1: 无法访问网站

**检查步骤:**

1. **检查Node.js应用是否运行**
   ```bash
   pm2 status
   pm2 logs
   ```

2. **检查Nginx是否运行**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **检查端口是否监听**
   ```bash
   sudo netstat -tulnp | grep :3000  # Node.js
   sudo netstat -tulnp | grep :80    # Nginx HTTP
   sudo netstat -tulnp | grep :443   # Nginx HTTPS
   ```

4. **检查防火墙**
   ```bash
   sudo ufw status
   ```

5. **检查路由器端口映射**
   - 确认外网能访问你的公网IP:80和443端口

6. **检查DNS解析**
   ```bash
   nslookup game.studinlet.com
   ```

### 问题2: SSL证书错误

**检查步骤:**

1. **验证证书**
   ```bash
   sudo certbot certificates
   ```

2. **检查证书文件**
   ```bash
   sudo ls -la /etc/letsencrypt/live/game.studinlet.com/
   ```

3. **重新申请证书**
   ```bash
   sudo certbot delete --cert-name game.studinlet.com
   sudo bash ~/newgame/deployment/ssl-setup.sh
   ```

### 问题3: WebSocket连接失败

**检查步骤:**

1. **检查Nginx配置**
   ```bash
   sudo nginx -t
   grep -A 20 "location /" /etc/nginx/sites-available/game.studinlet.com
   ```

2. **确认有WebSocket升级头**
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. **检查Cloudflare设置**
   - 如果使用Cloudflare代理,确保WebSocket已启用
   - Cloudflare Dashboard → Network → WebSocket: ON

### 问题4: 游戏卡顿或延迟高

**优化步骤:**

1. **检查服务器资源**
   ```bash
   htop
   pm2 monit
   ```

2. **优化Nginx**
   - 增加worker进程
   - 调整缓冲区大小

3. **检查网络**
   ```bash
   ping -c 10 game.studinlet.com
   traceroute game.studinlet.com
   ```

### 问题5: PM2应用频繁重启

**检查步骤:**

1. **查看错误日志**
   ```bash
   pm2 logs --err
   ```

2. **增加内存限制**
   编辑 `ecosystem.config.js`:
   ```javascript
   max_memory_restart: '1G',  // 改成1GB
   ```

3. **检查Node.js版本**
   ```bash
   node --version
   ```

---

## 性能优化建议

### 1. 启用Gzip压缩

编辑 `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript
           application/x-javascript application/xml+rss
           application/javascript application/json;
```

### 2. 静态文件缓存

已在Nginx配置中包含,确认启用。

### 3. 使用Cloudflare CDN

建议启用Cloudflare代理 (橙色云朵),可以:
- 加速全球访问
- 隐藏真实IP
- 防DDoS攻击
- 自动HTTPS

### 4. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新Node.js依赖
cd ~/newgame
npm update

# 更新PM2
sudo npm update -g pm2
```

---

## 备份建议

### 定期备份重要文件

```bash
# 创建备份脚本
cat > ~/backup-game.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份项目
tar -czf $BACKUP_DIR/newgame_$DATE.tar.gz ~/newgame

# 备份Nginx配置
sudo cp /etc/nginx/sites-available/game.studinlet.com $BACKUP_DIR/nginx_$DATE.conf

# 删除30天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/newgame_$DATE.tar.gz"
EOF

chmod +x ~/backup-game.sh

# 设置定时备份 (每天凌晨2点)
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-game.sh") | crontab -
```

---

## 安全建议

1. **定期更新系统和软件**
2. **使用强密码**
3. **启用SSH密钥认证,禁用密码登录**
4. **配置fail2ban防暴力破解**
5. **定期查看日志**
6. **限制SSH访问IP**

---

## 联系和支持

如有问题,请检查:
1. 游戏日志: `pm2 logs`
2. Nginx日志: `/var/log/nginx/`
3. 系统日志: `journalctl -xe`

---

**祝你部署成功！🎉**
