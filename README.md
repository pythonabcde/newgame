# Connection Sorting - 连接分类游戏

一个实时多人课堂游戏,玩家需要通过协作和推理找到自己的队友并进入正确的区域。

## 📖 游戏介绍

**Connection Sorting** 是一个为课堂设计的实时多人浏览器游戏:

- **玩家数量**: 4-32人 (建议16-24人)
- **游戏时长**: 5分钟/回合
- **设备要求**: 任何现代浏览器 (Chrome, Firefox, Edge, Safari)

### 游戏玩法

1. **主持人**创建房间并将玩家分成两组
2. **玩家**加入房间并等待游戏开始
3. 游戏开始后:
   - 每个玩家控制一个匿名的灰色圆圈
   - 游戏不会告诉你哪个圆圈是你,也不会告诉你在哪个队伍
   - 两个彩色区域在地图边缘移动
   - 玩家需要通过移动推断自己的身份和队友
   - 最终目标: 与你的队友一起进入正确颜色的区域

### 控制方式

- **移动**: WASD 或 方向键
- **冲刺**: 空格键 (有2秒冷却时间)

## 🚀 快速开始

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/newgame.git
   cd newgame
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务器**
   ```bash
   npm start
   ```

4. **访问游戏**
   - 打开浏览器访问: `http://localhost:3000`
   - 主持人访问: `http://localhost:3000/host`
   - 玩家访问: `http://localhost:3000/join`

## 📦 项目结构

```
newgame/
├── server/                 # 服务器端代码
│   ├── index.js           # 主服务器文件
│   ├── GameRoom.js        # 游戏房间类
│   ├── constants.js       # 游戏常量
│   ├── physics.js         # 物理和碰撞检测
│   └── zones.js           # 区域系统
├── public/                # 前端静态文件
│   ├── index.html         # 首页
│   ├── host.html          # 主持人界面
│   ├── join.html          # 玩家界面
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       ├── host.js        # 主持人逻辑
│       ├── player.js      # 玩家逻辑
│       └── renderer.js    # Canvas渲染器
├── deployment/            # 部署配置
│   ├── nginx.conf         # Nginx配置
│   ├── ssl-setup.sh       # SSL证书申请脚本
│   └── ecosystem.config.js # PM2配置
├── package.json
├── DEPLOYMENT.md          # 详细部署文档
└── README.md
```

## 🔧 技术栈

### 后端
- **Node.js** - JavaScript运行时
- **Express** - Web框架
- **WebSocket (ws)** - 实时通信

### 前端
- **HTML5 Canvas** - 游戏渲染
- **Vanilla JavaScript** - 客户端逻辑
- **CSS3** - 样式

### 部署
- **Nginx** - 反向代理和静态文件服务
- **PM2** - Node.js进程管理
- **Let's Encrypt** - SSL证书
- **Cloudflare** - DNS和CDN

## 🌐 生产环境部署

详细的部署指南请参考 [DEPLOYMENT.md](DEPLOYMENT.md)

### 快速部署步骤

1. **准备服务器** (Debian/Ubuntu)
2. **安装依赖**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs nginx
   sudo npm install -g pm2
   ```

3. **配置SSL证书** (使用Cloudflare DNS API)
   ```bash
   sudo bash deployment/ssl-setup.sh
   ```

4. **配置Nginx**
   ```bash
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/game.studinlet.com
   sudo ln -s /etc/nginx/sites-available/game.studinlet.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **启动应用**
   ```bash
   pm2 start deployment/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

6. **配置路由器端口映射**
   - 映射端口 80 和 443 到服务器

7. **配置Cloudflare DNS**
   - 添加 A 记录: `game.studinlet.com` → 你的公网IP

## ⚙️ 配置选项

游戏参数在 `server/constants.js` 中配置:

```javascript
module.exports = {
  MAX_PLAYERS: 32,              // 最大玩家数
  MIN_PLAYERS_TO_START: 4,      // 开始游戏最少人数
  GAME_DURATION_SECONDS: 300,   // 游戏时长 (5分钟)
  PLAYER_SPEED: 15,             // 玩家移动速度
  DASH_SPEED_MULTIPLIER: 4.0,   // 冲刺速度倍数
  DASH_COOLDOWN_SECONDS: 2,     // 冲刺冷却时间
  // ... 更多配置
};
```

## 🎮 游戏特性

- ✅ 实时多人同步 (30次/秒)
- ✅ WebSocket通信
- ✅ 房间系统 (6位代码)
- ✅ 拖拽式团队分配
- ✅ 碰撞检测
- ✅ 冲刺机制 (带冷却)
- ✅ 动态区域所有权
- ✅ 实时计分系统
- ✅ 响应式Canvas渲染
- ✅ 移动设备支持

## 🐛 已知问题

目前没有已知的重大问题。如发现问题请提交Issue。

## 📝 待办事项

- [ ] 添加音效
- [ ] 游戏回放功能
- [ ] 多房间支持
- [ ] 游戏统计和排行榜
- [ ] 自定义游戏参数界面
- [ ] 移动端触摸控制优化

## 🤝 贡献

欢迎提交Pull Request或Issue！

## 📄 许可证

MIT License

## 🙏 致谢

基于ChatGPT生成的游戏设计文档 (game.md) 开发。

---

**开始游戏**: https://game.studinlet.com

**问题反馈**: [GitHub Issues](https://github.com/your-username/newgame/issues)
