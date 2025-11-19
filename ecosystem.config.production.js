// PM2 Ecosystem Configuration for High-Concurrency Production
// Optimized for 4 CPU cores, 16GB RAM, 200GB SSD
// Designed for 300,000+ users with multiple Node.js instances

module.exports = {
  apps: [
    {
      name: 'processsutra',
      script: 'dist/index.js',
      instances: 6, // Run 6 instances (1.5x CPU cores for I/O-bound operations)
      exec_mode: 'cluster',
      
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      
      // Performance tuning - Optimized for 16GB RAM
      // Each instance gets ~2.5GB (6 instances * 2.5GB = 15GB, leaving 1GB for system)
      node_args: '--max-old-space-size=2560 --max-http-header-size=16384 --optimize-for-size',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '2.5G',
      
      // Logging
      error_file: '/var/log/pm2/processsutra-error.log',
      out_file: '/var/log/pm2/processsutra-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Advanced features
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
    }
  ],
  
  deploy: {
    production: {
      user: 'root',
      host: '194.238.16.140',
      ref: 'origin/main',
      repo: 'https://github.com/jating0000la/Process-Sutra-2026.git',
      path: '/var/www/processsutra',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.production.js --env production',
      'pre-setup': 'mkdir -p /var/log/pm2 /var/log/caddy'
    }
  }
};
