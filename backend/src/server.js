import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Redis from 'ioredis';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { MemoryStore, RedisStore } from './store.js';
import { seedMenuIfNeeded } from './seed.js';

const config = loadConfig();

let redis = null;
let store;
if (config.useMemoryStore) {
  console.warn('[store] USE_MEMORY_STORE=true -> using the in-memory store. Data is lost on restart.');
  store = new MemoryStore();
} else {
  redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
  redis.on('error', (err) => console.error('[redis] error:', err.message));
  redis.on('ready', () => console.log('[redis] connected'));
  store = new RedisStore(redis);
}

// If the frontend has been built (npm run build), the API also serves it.
const staticDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
const app = createApp({ store, config, staticDir });

const server = app.listen(config.port, async () => {
  console.log(`Coffee Shop API listening on port ${config.port}`);
  try {
    if (await seedMenuIfNeeded(store)) console.log('[seed] sample menu created');
  } catch (err) {
    console.error('[seed] failed:', err.message);
  }
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    Promise.resolve(redis?.quit()).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
