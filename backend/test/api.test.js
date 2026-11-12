// Run with:  npm test      (uses an in-memory store, so no Redis is needed)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { loadConfig } from '../src/config.js';
import { seedMenuIfNeeded } from '../src/seed.js';
import { createToken, verifyToken } from '../src/auth.js';

const config = loadConfig({
  NODE_ENV: 'test',
  STAFF_USERNAME: 'staff',
  STAFF_PASSWORD: 'secret-pass',
  TOKEN_SECRET: 'test-secret',
  CORS_ORIGINS: 'http://localhost:5173',
});

let server;
let base;
let token;

const api = async (path, { method = 'GET', body, auth, headers = {} } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
};

before(async () => {
  const store = new MemoryStore();
  await seedMenuIfNeeded(store);
  const app = createApp({ store, config });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await api('/api/auth/login', { method: 'POST', body: { username: 'staff', password: 'secret-pass' } });
  token = login.json.token;
});

after(() => server.close());

test('GET /api/health reports ok', async () => {
  const r = await api('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'ok');
  assert.equal(r.json.database, 'up');
});

test('login rejects wrong password and missing fields', async () => {
  assert.equal((await api('/api/auth/login', { method: 'POST', body: { username: 'staff', password: 'nope' } })).status, 401);
  assert.equal((await api('/api/auth/login', { method: 'POST', body: {} })).status, 400);
});

test('tokens expire and cannot be forged', () => {
  const { token: t } = createToken(config, Date.now() - 1000 * 3600 * 24);
  assert.equal(verifyToken(t, config), null);
  const good = createToken(config).token;
  assert.ok(verifyToken(good, config));
  assert.equal(verifyToken(good.slice(0, -2) + 'xx', config), null);
});

test('menu: public list and single item', async () => {
  const list = await api('/api/menu');
  assert.equal(list.status, 200);
  assert.ok(list.json.length >= 6);
  const one = await api(`/api/menu/${list.json[0].id}`);
  assert.equal(one.status, 200);
  assert.equal(one.json.id, list.json[0].id);
  assert.equal((await api('/api/menu/does-not-exist')).status, 404);
});

test('menu: write endpoints require staff authentication', async () => {
  const body = { name: 'Flat White', price: 36, category: 'Coffee' };
  assert.equal((await api('/api/menu', { method: 'POST', body })).status, 401);
  assert.equal((await api('/api/menu', { method: 'POST', body, auth: 'garbage' })).status, 401);
  assert.equal((await api('/api/menu/x', { method: 'PUT', body: { price: 1 } })).status, 401);
  assert.equal((await api('/api/menu/x', { method: 'DELETE' })).status, 401);
});

test('menu: create, update, delete lifecycle', async () => {
  const created = await api('/api/menu', {
    method: 'POST',
    auth: token,
    body: { name: '  Flat White ', description: 'Velvety', price: '36.5', category: 'Coffee' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.name, 'Flat White');
  assert.equal(created.json.price, 36.5);
  assert.equal(created.json.available, true);
  assert.ok(created.json.id);

  const id = created.json.id;
  const updated = await api(`/api/menu/${id}`, { method: 'PUT', auth: token, body: { price: 40, available: false } });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.price, 40);
  assert.equal(updated.json.available, false);
  assert.equal(updated.json.name, 'Flat White');

  assert.equal((await api(`/api/menu/${id}`, { method: 'DELETE', auth: token })).status, 204);
  assert.equal((await api(`/api/menu/${id}`)).status, 404);
  assert.equal((await api(`/api/menu/${id}`, { method: 'DELETE', auth: token })).status, 404);
});

test('menu: validation errors return 400 with field details', async () => {
  const bad = await api('/api/menu', {
    method: 'POST',
    auth: token,
    body: { name: '', price: -5, category: 'Sushi', available: 'yes' },
  });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.error.details.name);
  assert.ok(bad.json.error.details.price);
  assert.ok(bad.json.error.details.category);
  assert.ok(bad.json.error.details.available);

  const list = await api('/api/menu');
  const empty = await api(`/api/menu/${list.json[0].id}`, { method: 'PUT', auth: token, body: {} });
  assert.equal(empty.status, 400);
});

test('malformed JSON gives a clean 400', async () => {
  const r = await api('/api/menu', { method: 'POST', auth: token, body: '{not json' });
  assert.equal(r.status, 400);
  assert.equal(r.json.error.message, 'Request body is not valid JSON');
});

test('orders: place order, server computes the total, unique numbers', async () => {
  const menu = (await api('/api/menu')).json;
  const [a, b] = menu;
  const first = await api('/api/orders', {
    method: 'POST',
    body: {
      customerName: 'Thabo',
      orderType: 'Dine-in',
      notes: 'extra hot',
      items: [
        { menuItemId: a.id, quantity: 2 },
        { menuItemId: b.id, quantity: 1 },
        { menuItemId: a.id, quantity: 1 },
      ],
      total: 1, // must be ignored
    },
  });
  assert.equal(first.status, 201);
  assert.equal(first.json.status, 'Pending');
  assert.equal(first.json.total, a.price * 3 + b.price);
  assert.equal(first.json.items.length, 2);
  assert.match(first.json.orderNumber, /^CS-\d{4,}$/);

  const second = await api('/api/orders', {
    method: 'POST',
    body: { customerName: 'Lerato', items: [{ menuItemId: b.id, quantity: 1 }] },
  });
  assert.equal(second.status, 201);
  assert.notEqual(second.json.orderNumber, first.json.orderNumber);
  assert.notEqual(second.json.id, first.json.id);
  assert.equal(second.json.orderType, 'Takeaway');

  const fetched = await api(`/api/orders/${first.json.id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.json.customerName, 'Thabo');
  assert.equal((await api('/api/orders/nope')).status, 404);
});

test('orders: validation and unavailable items are rejected', async () => {
  const menu = (await api('/api/menu')).json;
  const noName = await api('/api/orders', { method: 'POST', body: { items: [{ menuItemId: menu[0].id, quantity: 1 }] } });
  assert.equal(noName.status, 400);
  assert.ok(noName.json.error.details.customerName);

  const noItems = await api('/api/orders', { method: 'POST', body: { customerName: 'X', items: [] } });
  assert.equal(noItems.status, 400);

  const badQty = await api('/api/orders', {
    method: 'POST',
    body: { customerName: 'X', items: [{ menuItemId: menu[0].id, quantity: 0 }] },
  });
  assert.equal(badQty.status, 400);

  const unknown = await api('/api/orders', {
    method: 'POST',
    body: { customerName: 'X', items: [{ menuItemId: 'ghost', quantity: 1 }] },
  });
  assert.equal(unknown.status, 409);

  await api(`/api/menu/${menu[2].id}`, { method: 'PUT', auth: token, body: { available: false } });
  const soldOut = await api('/api/orders', {
    method: 'POST',
    body: { customerName: 'X', items: [{ menuItemId: menu[2].id, quantity: 1 }] },
  });
  assert.equal(soldOut.status, 409);
  await api(`/api/menu/${menu[2].id}`, { method: 'PUT', auth: token, body: { available: true } });
});

test('orders: staff-only list, status update and summary', async () => {
  assert.equal((await api('/api/orders')).status, 401);
  assert.equal((await api('/api/orders/summary')).status, 401);
  assert.equal((await api('/api/orders/abc/status', { method: 'PATCH', body: { status: 'Ready' } })).status, 401);

  const list = await api('/api/orders', { auth: token });
  assert.equal(list.status, 200);
  assert.ok(list.json.length >= 2);
  // newest first
  assert.ok(new Date(list.json[0].createdAt) >= new Date(list.json[1].createdAt));

  const id = list.json[0].id;
  for (const status of ['Preparing', 'Ready', 'Collected']) {
    const r = await api(`/api/orders/${id}/status`, { method: 'PATCH', auth: token, body: { status } });
    assert.equal(r.status, 200);
    assert.equal(r.json.status, status);
  }
  assert.equal((await api(`/api/orders/${id}/status`, { method: 'PATCH', auth: token, body: { status: 'Burnt' } })).status, 400);
  assert.equal((await api('/api/orders/nope/status', { method: 'PATCH', auth: token, body: { status: 'Ready' } })).status, 404);

  const filtered = await api('/api/orders?status=Collected', { auth: token });
  assert.ok(filtered.json.every((o) => o.status === 'Collected'));
  assert.equal((await api('/api/orders?status=Nope', { auth: token })).status, 400);
  assert.equal((await api('/api/orders?date=yesterday', { auth: token })).status, 400);

  const summary = await api('/api/orders/summary', { auth: token });
  assert.equal(summary.status, 200);
  assert.equal(summary.json.totalOrders, list.json.length);
  assert.equal(
    summary.json.totalRevenue,
    Math.round(list.json.reduce((s, o) => s + o.total * 100, 0)) / 100,
  );
  assert.equal(Object.values(summary.json.byStatus).reduce((a, b) => a + b, 0), summary.json.totalOrders);
  assert.ok(summary.json.topItems.length >= 1);

  const empty = await api('/api/orders/summary?date=2000-01-01', { auth: token });
  assert.equal(empty.json.totalOrders, 0);
  assert.equal(empty.json.totalRevenue, 0);
});

test('CORS: allowed origin gets headers, unknown origin does not; unknown route is JSON 404', async () => {
  const ok = await api('/api/menu', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const no = await api('/api/menu', { headers: { Origin: 'http://evil.example' } });
  assert.equal(no.headers.get('access-control-allow-origin'), null);
  const pre = await api('/api/menu', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
  assert.equal(pre.status, 204);
  const missing = await api('/api/nothing');
  assert.equal(missing.status, 404);
  assert.equal(missing.json.error.message, 'Route not found');
});

test('orders: optional email and phone are stored, bad values are rejected', async () => {
  const menu = (await api('/api/menu')).json;
  const items = [{ menuItemId: menu[0].id, quantity: 1 }];

  const ok = await api('/api/orders', {
    method: 'POST',
    body: { customerName: 'Lerato', email: 'lerato@example.com', phone: 62143330, items },
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.email, 'lerato@example.com');
  assert.equal(ok.json.phone, '62143330');

  // staff recording a walk-in order manually: no contact details needed
  const walkIn = await api('/api/orders', { method: 'POST', body: { customerName: 'Walk-in', orderType: 'Dine-in', items } });
  assert.equal(walkIn.status, 201);
  assert.equal(walkIn.json.email, '');
  assert.equal(walkIn.json.phone, '');

  const bad = await api('/api/orders', {
    method: 'POST',
    body: { customerName: 'X', email: 'not-an-email', phone: 'abc', items },
  });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.error.details.email);
  assert.ok(bad.json.error.details.phone);
});
