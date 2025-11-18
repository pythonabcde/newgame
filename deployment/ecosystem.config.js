// PM2 配置文件
// 使用方法: pm2 start deployment/ecosystem.config.js

module.exports = {
  apps: [{
    name: 'connection-sorting-game',
    script: './server/index.js',
    cwd: '/home/user/newgame',  // 请修改为实际项目路径

    // 实例配置
    instances: 1,
    exec_mode: 'fork',

    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // 日志
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pm2/connection-sorting-error.log',
    out_file: '/var/log/pm2/connection-sorting-out.log',

    // 自动重启配置
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // 监听文件变化 (生产环境建议关闭)
    watch: false,

    // 忽略监听的文件
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ],

    // 资源限制
    max_memory_restart: '500M',

    // 优雅退出
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
