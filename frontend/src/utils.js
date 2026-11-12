// Small helpers shared by the shop and the staff dashboard.

export const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'M';
export const SHOP_TZ = import.meta.env.VITE_SHOP_TIMEZONE || 'Africa/Maseru';

export const STATUSES = ['Pending', 'Preparing', 'Ready', 'Collected'];
export const CATEGORIES = ['Coffee', 'Tea', 'Pastries', 'Other'];
export const ORDER_TYPES = ['Dine-in', 'Takeaway'];

/** 30 -> "M30", 22.5 -> "M22.50" (same look as the original static menu). */
export function money(value) {
  const n = Number(value) || 0;
  return `${CURRENCY}${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** YYYY-MM-DD in the shop's time zone. */
export function dateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function timeLabel(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function dateTimeLabel(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SHOP_TZ,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Turns an ApiError into one readable sentence, including field-level details. */
export function errorText(err) {
  if (!err) return '';
  const details = err.details ? Object.values(err.details).join(' ') : '';
  return details ? `${err.message}: ${details}` : err.message || 'Something went wrong';
}
