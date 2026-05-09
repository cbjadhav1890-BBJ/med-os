const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'medos-god-mode-secret-2024',
  jwtExpiry: process.env.JWT_EXPIRY || '10h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  sessionSecret: process.env.SESSION_SECRET || 'medos-session-secret',
};

const knexConfig = process.env.DATABASE_URL
  ? {
      client: 'pg',
      connection: process.env.DATABASE_URL,
      searchPath: ['public'],
      pool: { min: 2, max: 10 },
    }
  : {
      client: 'sqlite3',
      connection: { filename: require('path').join(__dirname, '..', 'medos.db') },
      useNullAsDefault: true,
    };

module.exports = { config, knexConfig };