import crypto from 'node:crypto';
import express from 'express';
import { asyncHandler, badRequest, HttpError, notFound } from '../errors.js';
import { ORDER_STATUSES, validateOrderInput, validateStatusInput } from '../validators.js';
import { requireStaff } from '../auth.js';

/** YYYY-MM-DD for an instant, in the shop's time zone. */
export function dateKey(isoOrDate, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoOrDate));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw badRequest('date must be in YYYY-MM-DD format');
  }
  return value;
}

function parseStatusParam(value) {
  if (value === undefined || value === '') return undefined;
  if (!ORDER_STATUSES.includes(value)) {
    throw badRequest(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  return value;
}

const toCents = (n) => Math.round(n * 100);

export function ordersRouter({ store, config }) {
  const router = express.Router();
  const staffOnly = requireStaff(config);

  // POST /api/orders - public: a customer places an order.
  // Prices are always taken from the database, never trusted from the client.
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const input = validateOrderInput(req.body);

      const lines = [];
      const problems = [];
      let totalCents = 0;
      for (const { menuItemId, quantity } of input.items) {
        const menuItem = await store.getMenu(menuItemId);
        if (!menuItem) {
          problems.push(`Menu item "${menuItemId}" does not exist`);
          continue;
        }
        if (!menuItem.available) {
          problems.push(`"${menuItem.name}" is currently unavailable`);
          continue;
        }
        const lineCents = toCents(menuItem.price) * quantity;
        totalCents += lineCents;
        lines.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
          lineTotal: lineCents / 100,
        });
      }
      if (problems.length) {
        throw new HttpError(409, 'Some items cannot be ordered', { items: problems.join('; ') });
      }

      const sequence = await store.nextOrderSequence();
      const now = new Date().toISOString();
      const order = {
        id: crypto.randomUUID(),
        orderNumber: `CS-${1000 + sequence}`,
        customerName: input.customerName,
        email: input.email,
        phone: input.phone,
        orderType: input.orderType,
        notes: input.notes,
        items: lines,
        total: totalCents / 100,
        status: 'Pending',
        createdAt: now,
        updatedAt: now,
      };
      await store.saveOrder(order, { isNew: true });
      res.status(201).json(order);
    }),
  );

  // GET /api/orders/summary?date=YYYY-MM-DD - staff only (defined before /:id on purpose)
  router.get(
    '/summary',
    staffOnly,
    asyncHandler(async (req, res) => {
      const date = parseDateParam(req.query.date) ?? dateKey(new Date(), config.shopTimezone);
      const orders = (await store.listOrders()).filter(
        (o) => dateKey(o.createdAt, config.shopTimezone) === date,
      );

      const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
      const itemTotals = new Map();
      let totalCents = 0;
      for (const o of orders) {
        byStatus[o.status] += 1;
        totalCents += toCents(o.total);
        for (const line of o.items) {
          const entry = itemTotals.get(line.name) || { name: line.name, quantity: 0, revenueCents: 0 };
          entry.quantity += line.quantity;
          entry.revenueCents += toCents(line.price) * line.quantity;
          itemTotals.set(line.name, entry);
        }
      }
      const topItems = [...itemTotals.values()]
        .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
        .slice(0, 5)
        .map((e) => ({ name: e.name, quantity: e.quantity, revenue: e.revenueCents / 100 }));

      res.json({
        date,
        totalOrders: orders.length,
        totalRevenue: totalCents / 100,
        averageOrderValue: orders.length ? Math.round(totalCents / orders.length) / 100 : 0,
        byStatus,
        topItems,
      });
    }),
  );

  // GET /api/orders?status=&date= - staff only: all customer orders, newest first
  router.get(
    '/',
    staffOnly,
    asyncHandler(async (req, res) => {
      const status = parseStatusParam(req.query.status);
      const date = parseDateParam(req.query.date);
      let orders = await store.listOrders();
      if (status) orders = orders.filter((o) => o.status === status);
      if (date) orders = orders.filter((o) => dateKey(o.createdAt, config.shopTimezone) === date);
      res.json(orders);
    }),
  );

  // GET /api/orders/:id - public: the id is an unguessable UUID, so a customer can
  // check their own order's status without a staff account.
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const order = await store.getOrder(req.params.id);
      if (!order) throw notFound('Order not found');
      res.json(order);
    }),
  );

  // PATCH /api/orders/:id/status - staff only
  router.patch(
    '/:id/status',
    staffOnly,
    asyncHandler(async (req, res) => {
      const status = validateStatusInput(req.body);
      const order = await store.getOrder(req.params.id);
      if (!order) throw notFound('Order not found');
      const updated = { ...order, status, updatedAt: new Date().toISOString() };
      await store.saveOrder(updated);
      res.json(updated);
    }),
  );

  return router;
}
