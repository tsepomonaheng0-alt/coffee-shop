import crypto from 'node:crypto';
import express from 'express';
import { asyncHandler, notFound } from '../errors.js';
import { CATEGORIES, validateMenuInput } from '../validators.js';
import { requireStaff } from '../auth.js';

export function menuRouter({ store, config }) {
  const router = express.Router();
  const staffOnly = requireStaff(config);

  // GET /api/menu - public: customers need to see the menu
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const items = await store.listMenu();
      items.sort(
        (a, b) =>
          CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name),
      );
      res.json(items);
    }),
  );

  // GET /api/menu/:id - public
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await store.getMenu(req.params.id);
      if (!item) throw notFound('Menu item not found');
      res.json(item);
    }),
  );

  // POST /api/menu - staff only
  router.post(
    '/',
    staffOnly,
    asyncHandler(async (req, res) => {
      const data = validateMenuInput(req.body);
      const now = new Date().toISOString();
      const item = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
      await store.saveMenu(item);
      res.status(201).json(item);
    }),
  );

  // PUT /api/menu/:id - staff only (send any of: name, description, price, category, available)
  router.put(
    '/:id',
    staffOnly,
    asyncHandler(async (req, res) => {
      const existing = await store.getMenu(req.params.id);
      if (!existing) throw notFound('Menu item not found');
      const changes = validateMenuInput(req.body, { partial: true });
      const updated = { ...existing, ...changes, id: existing.id, updatedAt: new Date().toISOString() };
      await store.saveMenu(updated);
      res.json(updated);
    }),
  );

  // DELETE /api/menu/:id - staff only
  router.delete(
    '/:id',
    staffOnly,
    asyncHandler(async (req, res) => {
      const removed = await store.deleteMenu(req.params.id);
      if (!removed) throw notFound('Menu item not found');
      res.status(204).end();
    }),
  );

  return router;
}
