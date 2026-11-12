import 'dotenv/config';
import crypto from 'node:crypto';

/**
 * Reads configuration from environment variables.
 * In production the staff password and token secret MUST be provided,
 * so the app can never accidentally run with a well-known default.
 */
export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';

  const staffPassword = env.STAFF_PASSWORD || (isProduction ? '' : 'staff123');
  const tokenSecret =
    env.TOKEN_SECRET || (isProduction ? '' : crypto.randomBytes(32).toString('hex'));

  if (isProduction && (!staffPassword || !tokenSecret)) {
    throw new Error('STAFF_PASSWORD and TOKEN_SECRET must be set when NODE_ENV=production');
  }

  const ttl = Number(env.TOKEN_TTL_HOURS);

  return {
    isProduction,
    port: Number(env.PORT) || 4000,
    redisUrl: env.REDIS_URL || 'redis://127.0.0.1:6379',
    staffUsername: env.STAFF_USERNAME || 'staff',
    staffPassword,
    tokenSecret,
    tokenTtlHours: Number.isFinite(ttl) && ttl > 0 ? ttl : 12,
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),
    shopTimezone: env.SHOP_TIMEZONE || 'Africa/Maseru',
    // Local-dev convenience: run without Redis (data is lost when the server stops).
    useMemoryStore: env.USE_MEMORY_STORE === 'true',
  };
}
