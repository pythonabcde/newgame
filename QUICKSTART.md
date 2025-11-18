# 🚀 快速部署清单

针对你的环境（Debian + 家庭网络 + Cloudflare + game.studinlet.com）的快速部署步骤。

---

## ✅ 部署前检查清单

在开始之前，确保你有：

- [ ] Debian服务器（已联网）
- [ ] 公网IP地址
- [ ] 路由器管理权限
- [ ] Cloudflare账号和API Token
- [ ] 域名 studinlet.com 已托管在Cloudflare

---

## 📝 准备工作

### 1. 获取Cloudflare API Token

```
1. 访问: https://dash.cloudflare.com/profile/api-tokens
2. 点击 "Create Token"
3. 选择 "Edit zone DNS" 模板
4. Zone Resources: studinlet.com
5. 创建并保存Token（只显示一次！）
```

**保存你的Token**: `_______________________________________`

### 2. 记录你的信息

- **内网IP**: `_______________________` (例如: 192.168.1.100)
- **公网IP**: `_______________________` (运行 `curl ifconfig.me` 获取)
- **邮箱**: `_______________________`

---

## 🔧 部署步骤 (约30分钟)

### 第一步: 基础环境 (10分钟)

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装其他工具
sudo apt install -y nginx git
sudo npm install -g pm2

# 4. 验证安装
node --version    # 应该是 v20.x.x
nginx -v          # 应该显示版本号
pm2 --version     # 应该显示版本号
```

### 第二步: 下载项目 (2分钟)

```bash
# 克隆项目
cd ~
git clone https://github.com/pythonabcde/newgame.git
cd newgame

# 安装依赖
npm install
```

### 第三步: SSL证书 (5分钟)

```bash
# 1. 编辑SSL配置脚本
nano deployment/ssl-setup.sh

# 修改这两行:
#   EMAIL="your-email@example.com"              # 改成你的邮箱
#   CLOUDFLARE_API_TOKEN="your-api-token-here"  # 改成你的Token

# 2. 运行脚本
sudo bash deployment/ssl-setup.sh

# 如果成功，会显示:
# "SSL证书申请成功！"
```

### 第四步: Nginx配置 (3分钟)

```bash
# 1. 复制配置文件
sudo cp deployment/nginx.conf /etc/nginx/sites-available/game.studinlet.com

# 2. 创建软链接
sudo ln -s /etc/nginx/sites-available/game.studinlet.com /etc/nginx/sites-enabled/

# 3. 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 4. 测试配置
sudo nginx -t

# 应该显示: "syntax is ok" 和 "test is successful"

# 5. 重启Nginx
sudo systemctl restart nginx

# 6. 检查状态
sudo systemctl status nginx
# 应该显示 "active (running)"
```

### 第五步: 启动游戏服务 (2分钟)

```bash
# 1. 修改PM2配置（如果路径不同）
nano deployment/ecosystem.config.js
# 确认 cwd 路径正确，例如: cwd: '/home/youruser/newgame'

# 2. 启动应用
pm2 start deployment/ecosystem.config.js

# 3. 查看状态
pm2 status
# 应该显示 "online"

# 4. 设置开机自启
pm2 save
pm2 startup
# 按照提示运行显示的命令

# 5. 查看日志
pm2 logs
```

### 第六步: 防火墙配置 (2分钟)

```bash
# 1. 安装并配置UFW
sudo apt install -y ufw

# 2. 允许必要端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 3. 启用防火墙
sudo ufw enable

# 4. 查看状态
sudo ufw status
```

### 第七步: 路由器端口映射 (5分钟)

**在路由器管理界面操作：**

1. 登录路由器（通常是 192.168.1.1 或 192.168.0.1）

2. 找到 "端口映射" 或 "Port Forwarding" 设置

3. 添加以下规则：

**规则1 - HTTP:**
```
名称: HTTP
外部端口: 80
内部IP: 192.168.1.100 (你的Debian服务器IP)
内部端口: 80
协议: TCP
```

**规则2 - HTTPS:**
```
名称: HTTPS
外部端口: 443
内部IP: 192.168.1.100
内部端口: 443
协议: TCP
```

4. 保存并应用

5. **验证端口映射:**
```bash
# 在外网（用手机流量或其他网络）访问:
http://你的公网IP

# 如果能看到Nginx页面或游戏，说明成功！
```

### 第八步: Cloudflare DNS配置 (5分钟)

1. **登录Cloudflare Dashboard**
   - 访问: https://dash.cloudflare.com

2. **选择域名**
   - 点击 `studinlet.com`

3. **添加DNS记录**
   - 进入 "DNS" → "Records"
   - 点击 "Add record"

**配置:**
```
Type: A
Name: game
IPv4 address: [你的公网IP]
Proxy status: ✅ Proxied (橙色云朵，推荐)
TTL: Auto
```

4. **保存**

5. **等待DNS生效** (通常1-5分钟)

6. **验证DNS:**
```bash
nslookup game.studinlet.com
# 应该返回你的公网IP或Cloudflare的IP
```

---

## 🎉 测试访问

在浏览器访问:

```
https://game.studinlet.com
```

你应该看到游戏首页！

### 测试游戏流程:

1. **主持人**: 访问 `https://game.studinlet.com/host`
   - 点击"创建房间"
   - 记下6位房间代码

2. **玩家** (用手机或其他设备): 访问 `https://game.studinlet.com/join`
   - 输入房间代码和名字
   - 加入游戏

3. **主持人**:
   - 将玩家拖拽到两个队伍
   - 点击"开始游戏"

4. **玩家**:
   - 使用WASD或方向键移动
   - 空格键冲刺

---

## 🔍 故障排除

### 无法访问网站？

```bash
# 1. 检查Node.js应用
pm2 status
pm2 logs

# 2. 检查Nginx
sudo systemctl status nginx
sudo nginx -t

# 3. 检查端口监听
sudo netstat -tulnp | grep :3000  # Node.js
sudo netstat -tulnp | grep :80     # HTTP
sudo netstat -tulnp | grep :443    # HTTPS

# 4. 检查防火墙
sudo ufw status

# 5. 测试本地访问
curl http://localhost:3000
```

### SSL证书问题？

```bash
# 检查证书
sudo certbot certificates

# 重新申请
sudo certbot delete --cert-name game.studinlet.com
sudo bash ~/newgame/deployment/ssl-setup.sh
```

### WebSocket连接失败？

```bash
# 检查Nginx配置
sudo nginx -t
sudo systemctl restart nginx

# 如果用了Cloudflare代理，确保WebSocket已启用
# Cloudflare Dashboard → Network → WebSocket: ON
```

---

## 📊 监控和维护

### 查看日志

```bash
# PM2日志
pm2 logs

# Nginx访问日志
sudo tail -f /var/log/nginx/game.studinlet.com_access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/game.studinlet.com_error.log
```

### 重启服务

```bash
# 重启游戏
pm2 restart connection-sorting-game

# 重启Nginx
sudo systemctl restart nginx
```

### 更新代码

```bash
cd ~/newgame
git pull
npm install
pm2 restart connection-sorting-game
```

---

## 📚 更多信息

- **完整部署文档**: 查看 `DEPLOYMENT.md`
- **游戏说明**: 查看 `README.md`
- **原始设计文档**: 查看 `game.md`

---

## ✅ 部署完成检查

- [ ] 服务器环境已配置 (Node.js, Nginx, PM2)
- [ ] SSL证书已申请成功
- [ ] Nginx配置已完成并运行
- [ ] 游戏服务已启动 (pm2 status 显示 online)
- [ ] 防火墙已配置
- [ ] 路由器端口映射已设置
- [ ] Cloudflare DNS已配置
- [ ] 可以通过 https://game.studinlet.com 访问
- [ ] 游戏功能正常（主持人创建房间，玩家加入）

---

**祝你部署成功！如有问题，请查看 DEPLOYMENT.md 获取详细帮助。** 🎮🚀
