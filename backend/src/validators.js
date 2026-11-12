import { badRequest } from './errors.js';

export const CATEGORIES = ['Coffee', 'Tea', 'Pastries', 'Other'];
export const ORDER_TYPES = ['Dine-in', 'Takeaway'];
export const ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Collected'];

const MAX_PRICE = 10000;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Validates a menu item body.
 * - partial=false (POST): name, price and category are required.
 * - partial=true  (PUT):  any subset of fields may be sent, but at least one is required.
 * Returns only the known, cleaned fields.
 */
export function validateMenuInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) throw badRequest('Request body must be a JSON object');

  const errors = {};
  const out = {};

  if (body.name !== undefined || !partial) {
    const name = cleanString(body.name);
    if (typeof name !== 'string' || name.length < 1 || name.length > 80) {
      errors.name = 'Name is required (1-80 characters)';
    } else out.name = name;
  }

  if (body.description !== undefined) {
    const description = cleanString(body.description);
    if (typeof description !== 'string' || description.length > 300) {
      errors.description = 'Description must be text of at most 300 characters';
    } else out.description = description;
  } else if (!partial) {
    out.description = '';
  }

  if (body.price !== undefined || !partial) {
    const price = typeof body.price === 'string' && body.price.trim() !== '' ? Number(body.price) : body.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      errors.price = `Price must be a number greater than 0 and at most ${MAX_PRICE}`;
    } else out.price = Math.round(price * 100) / 100;
  }

  if (body.category !== undefined || !partial) {
    if (!CATEGORIES.includes(body.category)) {
      errors.category = `Category must be one of: ${CATEGORIES.join(', ')}`;
    } else out.category = body.category;
  }

  if (body.available !== undefined) {
    if (typeof body.available !== 'boolean') errors.available = 'Available must be true or false';
    else out.available = body.available;
  } else if (!partial) {
    out.available = true;
  }

  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
  if (partial && Object.keys(out).length === 0) {
    throw badRequest('Send at least one field to update (name, description, price, category, available)');
  }
  return out;
}

/** Validates a customer order body and merges duplicate menu item lines. */
export function validateOrderInput(body) {
  if (!isPlainObject(body)) throw badRequest('Request body must be a JSON object');

  const errors = {};
  const out = {};

  const customerName = cleanString(body.customerName);
  if (typeof customerName !== 'string' || customerName.length < 1 || customerName.length > 60) {
    errors.customerName = 'Customer name is required (1-60 characters)';
  } else out.customerName = customerName;

  // Optional contact details (the website's order form collects them; staff may skip them).
  if (body.email === undefined || body.email === null || body.email === '') out.email = '';
  else {
    const email = cleanString(body.email);
    if (typeof email !== 'string' || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Email must be a valid email address';
    } else out.email = email;
  }

  if (body.phone === undefined || body.phone === null || body.phone === '') out.phone = '';
  else {
    const phone = cleanString(typeof body.phone === 'number' ? String(body.phone) : body.phone);
    if (typeof phone !== 'string' || !/^[0-9+()\-\s]{5,20}$/.test(phone)) {
      errors.phone = 'Phone number must be 5-20 digits (spaces, +, - and () allowed)';
    } else out.phone = phone;
  }

  const orderType = body.orderType === undefined ? 'Takeaway' : body.orderType;
  if (!ORDER_TYPES.includes(orderType)) {
    errors.orderType = `Order type must be one of: ${ORDER_TYPES.join(', ')}`;
  } else out.orderType = orderType;

  if (body.notes === undefined || body.notes === null) out.notes = '';
  else {
    const notes = cleanString(body.notes);
    if (typeof notes !== 'string' || notes.length > 200) {
      errors.notes = 'Notes must be text of at most 200 characters';
    } else out.notes = notes;
  }

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    errors.items = 'Items must be a list with 1-50 entries';
  } else {
    const merged = new Map();
    let itemsOk = true;
    for (const line of body.items) {
      if (
        !isPlainObject(line) ||
        typeof line.menuItemId !== 'string' ||
        line.menuItemId.length === 0 ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 20
      ) {
        itemsOk = false;
        break;
      }
      merged.set(line.menuItemId, (merged.get(line.menuItemId) || 0) + line.quantity);
    }
    if (!itemsOk) {
      errors.items = 'Each item needs a menuItemId (text) and a whole-number quantity from 1 to 20';
    } else if ([...merged.values()].some((q) => q > 20)) {
      errors.items = 'Quantity per item cannot exceed 20';
    } else {
      out.items = [...merged].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    }
  }

  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
  return out;
}

export function validateStatusInput(body) {
  if (!isPlainObject(body) || !ORDER_STATUSES.includes(body.status)) {
    throw badRequest('Validation failed', {
      status: `Status must be one of: ${ORDER_STATUSES.join(', ')}`,
    });
  }
  return body.status;
}
