/**
 * Data access layer.
 *
 * RedisStore keeps everything as JSON strings under unique keys (key-value model):
 *
 *   menu:item:<uuid>   -> JSON menu item
 *   menu:ids           -> SET of menu item ids          (index, so we never use KEYS)
 *   order:<uuid>       -> JSON order
 *   orders:by_time     -> ZSET of order ids scored by creation time (newest first listing)
 *   orders:counter     -> INCR counter used to build the human order number (CS-1001 ...)
 *   meta:seeded        -> flag so the sample menu is only inserted once
 *
 * MemoryStore has the same interface and is used by the automated tests.
 */

const MENU_PREFIX = 'menu:item:';
const ORDER_PREFIX = 'order:';

const parse = (raw) => (raw ? JSON.parse(raw) : null);

export class RedisStore {
  constructor(redis) {
    this.redis = redis;
  }

  async ping() {
    return (await this.redis.ping()) === 'PONG';
  }

  // ---- menu ----
  async listMenu() {
    const ids = await this.redis.smembers('menu:ids');
    if (ids.length === 0) return [];
    const raws = await this.redis.mget(ids.map((id) => MENU_PREFIX + id));
    return raws.map(parse).filter(Boolean);
  }

  async getMenu(id) {
    return parse(await this.redis.get(MENU_PREFIX + id));
  }

  async saveMenu(item) {
    await this.redis.multi().set(MENU_PREFIX + item.id, JSON.stringify(item)).sadd('menu:ids', item.id).exec();
    return item;
  }

  async deleteMenu(id) {
    const results = await this.redis.multi().del(MENU_PREFIX + id).srem('menu:ids', id).exec();
    return results[0][1] === 1;
  }

  // ---- orders ----
  async nextOrderSequence() {
    return this.redis.incr('orders:counter');
  }

  async saveOrder(order, { isNew = false } = {}) {
    const tx = this.redis.multi().set(ORDER_PREFIX + order.id, JSON.stringify(order));
    if (isNew) tx.zadd('orders:by_time', new Date(order.createdAt).getTime(), order.id);
    await tx.exec();
    return order;
  }

  async getOrder(id) {
    return parse(await this.redis.get(ORDER_PREFIX + id));
  }

  /** All orders, newest first. */
  async listOrders() {
    const ids = await this.redis.zrevrange('orders:by_time', 0, -1);
    if (ids.length === 0) return [];
    const raws = await this.redis.mget(ids.map((id) => ORDER_PREFIX + id));
    return raws.map(parse).filter(Boolean);
  }

  /** Marks the store as seeded. Returns true only the first time (atomic SET NX). */
  async claimSeed() {
    return (await this.redis.set('meta:seeded', new Date().toISOString(), 'NX')) === 'OK';
  }
}

export class MemoryStore {
  constructor() {
    this.menu = new Map();
    this.orders = new Map();
    this.counter = 0;
    this.seeded = false;
  }
  async ping() {
    return true;
  }
  async listMenu() {
    return [...this.menu.values()].map((v) => structuredClone(v));
  }
  async getMenu(id) {
    const v = this.menu.get(id);
    return v ? structuredClone(v) : null;
  }
  async saveMenu(item) {
    this.menu.set(item.id, structuredClone(item));
    return item;
  }
  async deleteMenu(id) {
    return this.menu.delete(id);
  }
  async nextOrderSequence() {
    return ++this.counter;
  }
  async saveOrder(order) {
    this.orders.set(order.id, structuredClone(order));
    return order;
  }
  async getOrder(id) {
    const v = this.orders.get(id);
    return v ? structuredClone(v) : null;
  }
  async listOrders() {
    return [...this.orders.values()]
      .map((v) => structuredClone(v))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  async claimSeed() {
    if (this.seeded) return false;
    this.seeded = true;
    return true;
  }
}
