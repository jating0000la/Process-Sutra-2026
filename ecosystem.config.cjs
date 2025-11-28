// PM2 Ecosystem Configuration (Optimized for 10,000+ Concurrent Users)
// VPS: 4 Cores, 16GB RAM, Node App behind Caddy + Cloudflare

module.exports = {
  apps: [
    {
      name: 'processsutra-api',
      script: './dist/index.js',

      // Use all cores dynamically
      instances: 4,
      exec_mode: 'cluster',

      // Node performance tuning
      node_args: '--max-old-space-size=3072 --optimize_for_size --stack_size=1024',
      env_file: '.env',

      env: {
        NODE_ENV: 'production',
      },

      // Ensures ZERO downtime restarts
      wait_ready: false,
      listen_timeout: 10000,
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

      // Memory guard
      max_memory_restart: '3G',
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: '194.238.16.140',
      ref: 'origin/main',
      repo: 'https://github.com/jating0000la/Process-Sutra-2026.git',
      path: '/var/www/processsutra',
      'post-deploy':
        'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/log/pm2 /var/log/caddy',
    }
  }
};
