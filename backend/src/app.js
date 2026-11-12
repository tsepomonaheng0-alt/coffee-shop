import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { asyncHandler, badRequest, HttpError, notFound } from './errors.js';
import { createToken, credentialsMatch } from './auth.js';
import { menuRouter } from './routes/menu.js';
import { ordersRouter } from './routes/orders.js';

/** Minimal CORS: only the configured frontend origins may call the API from a browser. */
function cors(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

export function createApp({ store, config, staticDir }) {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(cors(config.corsOrigins));
  app.use(express.json({ limit: '10kb' }));

  // GET /api/health - used by Render and for the "is the backend alive?" check
  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      let database = 'down';
      try {
        if (await store.ping()) database = 'up';
      } catch {
        database = 'down';
      }
      res.status(database === 'up' ? 200 : 503).json({
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        time: new Date().toISOString(),
      });
    }),
  );

  // POST /api/auth/login - staff sign in, returns a signed bearer token
  app.post(
    '/api/auth/login',
    asyncHandler(async (req, res) => {
      const { username, password } = req.body ?? {};
      if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        throw badRequest('Username and password are required');
      }
      if (!credentialsMatch(username, password, config)) {
        throw new HttpError(401, 'Incorrect username or password');
      }
      res.json({ ...createToken(config), username: config.staffUsername, role: 'staff' });
    }),
  );

  app.use('/api/menu', menuRouter({ store, config }));
  app.use('/api/orders', ordersRouter({ store, config }));

  // Optional: serve the built React app (frontend/dist) from the same server, so the
  // whole project can be deployed as ONE service. The site uses hash routing (#/staff),
  // so no catch-all rewrite is needed.
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir));
  }

  // 404 for anything else
  app.use((_req, _res, next) => next(notFound('Route not found')));

  // Central error handler: every error leaves the API in the same JSON shape.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    let status = Number.isInteger(err.status) ? err.status : 500;
    let message = err.message;
    let details = err.details;

    if (err.type === 'entity.parse.failed') {
      status = 400;
      message = 'Request body is not valid JSON';
    } else if (err.type === 'entity.too.large') {
      status = 413;
      message = 'Request body is too large';
    }

    if (status >= 500) {
      console.error(err);
      message = 'Internal server error';
      details = undefined;
    }
    res.status(status).json({ error: { status, message, ...(details ? { details } : {}) } });
  });

  return app;
}
