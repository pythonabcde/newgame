// PM2 Configuration File
// Usage: pm2 start deployment/ecosystem.config.js

module.exports = {
  apps: [{
    name: 'connection-sorting-game',
    script: './server/index.js',
    cwd: '/home/yxh/newgame',  // Modify to your actual project path

    // Instance configuration
    instances: 1,
    exec_mode: 'fork',

    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logging (using PM2 default paths in ~/.pm2/logs/)
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Watch for file changes (recommended to disable in production)
    watch: false,

    // Ignore watch patterns
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ],

    // Resource limits
    max_memory_restart: '500M',

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
