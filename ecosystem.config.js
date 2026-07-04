/**
 * PM2 ecosystem config for hammerapp_web.
 *
 * IMPORTANT: instances is intentionally 1.
 * The in-memory rate limiter in src/lib/rate-limit.ts is per-process.
 * Increase instances only after replacing the rate limiter with Redis.
 * See claude.md §10.
 */
module.exports = {
  apps: [
    {
      name: "hammerapp-web",
      interpreter: "/root/.nvm/versions/node/v20.20.2/bin/node",
      script: "node_modules/.bin/next",
      args: "start -p 3003",
      cwd: "/var/www/hammerapp_web",
      instances: 1,
      exec_mode: "fork", // keep fork for single instance (cluster would be for multiple)
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3003",
      },
      // Log to a dedicated directory; rotate with `pm2 logrotate`
      out_file: "/var/log/hammerapp/out.log",
      error_file: "/var/log/hammerapp/error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Health probe — PM2 will restart if the app doesn't respond
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      // Graceful shutdown: drain in-flight requests before killing
      shutdown_with_message: true,
    },
  ],
};
