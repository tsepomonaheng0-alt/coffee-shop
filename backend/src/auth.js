import crypto from 'node:crypto';
import { forbidden, unauthorized } from './errors.js';

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/** Constant-time string comparison (hashes first so lengths always match). */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Creates a signed, expiring staff token:  base64url(payload).signature */
export function createToken(config, now = Date.now()) {
  const payload = {
    sub: config.staffUsername,
    role: 'staff',
    exp: now + config.tokenTtlHours * 3600 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  return { token: `${body}.${sign(body, config.tokenSecret)}`, expiresAt: new Date(payload.exp).toISOString() };
}

/** Returns the token payload, or null when the token is invalid or expired. */
export function verifyToken(token, config, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!safeEqual(signature, sign(body, config.tokenSecret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function credentialsMatch(username, password, config) {
  // Evaluate both so timing does not reveal which one was wrong.
  const userOk = safeEqual(username ?? '', config.staffUsername);
  const passOk = safeEqual(password ?? '', config.staffPassword);
  return userOk && passOk;
}

/** Express middleware: authentication (valid token) + authorisation (staff role). */
export function requireStaff(config) {
  return (req, _res, next) => {
    const header = req.headers.authorization || '';
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) return next(unauthorized());
    const payload = verifyToken(match[1], config);
    if (!payload) return next(unauthorized('Invalid or expired token'));
    if (payload.role !== 'staff') return next(forbidden());
    req.user = payload;
    next();
  };
}
