// PM2 Ecosystem Configuration (Optimized for 3000 Organizations)
// VPS: 4 Cores, 16GB RAM, Node App behind Caddy + Cloudflare
// Memory budget: 4 workers × 2GB = 8GB app | 4GB PostgreSQL | 1GB MongoDB | 3GB OS/Redis/buffers

module.exports = {
  apps: [
    {
      name: 'processsutra-api',
      script: './dist/index.js',

      // 4 workers for 4-core VPS
      instances: 4,
      exec_mode: 'cluster',

      // 2GB heap per worker (4 × 2GB = 8GB total, leaves 8GB for DB + OS)
      node_args: '--max-old-space-size=2048 --max-http-header-size=16384',

      env: {
        NODE_ENV: 'production',
      },

      env_production: {
        NODE_ENV: 'production',
      },

      // Ensures ZERO downtime restarts — app must call process.send('ready')
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 5000,

      // Stability & crash protection
      autorestart: true,
      min_uptime: '5s',
      max_restarts: 20,
      restart_delay: 3000,

      // Log handling (very important)
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/processsutra-error.log',
      out_file: '/var/log/pm2/processsutra-out.log',

      // Cluster improvements
      instance_var: 'INSTANCE_ID',
      exp_backoff_restart_delay: 200,

      // Memory guard — restart before OOM (1.8GB, below the 2GB heap limit)
      max_memory_restart: '1800M',
    }
  ],

  deploy: {
    production: {
      user: 'deploy',     // NEVER deploy as root — create a 'deploy' user with sudo
      host: process.env.DEPLOY_HOST || '0.0.0.0',  // Set DEPLOY_HOST env var
      ref: 'origin/main',
      repo: 'https://github.com/jating0000la/Process-Sutra-2026.git',
      path: '/var/www/processsutra',
      'post-deploy':
        'npm ci && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': 'mkdir -p /var/log/pm2 /var/log/caddy',
    }
  }
};
