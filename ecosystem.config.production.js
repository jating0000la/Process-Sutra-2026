// PM2 Ecosystem Configuration for High-Concurrency Production
// Optimized for 4 CPU cores, 16GB RAM, 200GB SSD
// Target: 8,000+ concurrent users with cluster mode

module.exports = {
  apps: [
    {
      name: 'processsutra',
      script: 'dist/index.js',
      instances: 4, // 4 instances = 1 per CPU core (optimal for 4-core system)
      exec_mode: 'cluster',
      
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      
      // Performance tuning - Optimized for 16GB RAM
      // Each instance gets ~3GB (4 instances * 3GB = 12GB, leaving 4GB for system/DB/Redis)
      node_args: '--max-old-space-size=3072',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
      
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

