import crypto from 'node:crypto';

// The same six drinks the website has always shown (names/prices/descriptions
// come from the original frontend), so the live menu looks identical on first run.
const SAMPLE_MENU = [
  ['Americano', 'Espresso with hot water for a smooth lighter taste.', 30, 'Coffee'],
  ['Espresso', 'A concentrated shot of coffee with a rich, bold flavor.', 20, 'Coffee'],
  ['Cappuccino', 'A perfect balance of espresso, steamed milk, and frothy milk foam.', 30, 'Coffee'],
  ['Hot Chocolate', 'Rich and creamy hot chocolate with a hint of vanilla.', 50, 'Other'],
  ['Matcha Latte', 'Delicious matcha green tea blended with steamed milk.', 80, 'Tea'],
  [
    'Iced Latte(10/10 IN SUMMER)',
    'Refresh your taste buds with our signature iced latte, perfect for a hot day.',
    50,
    'Coffee',
  ],
];

/** Inserts a starter menu the very first time the database is empty. */
export async function seedMenuIfNeeded(store) {
  if (!(await store.claimSeed())) return false;
  const now = new Date().toISOString();
  for (const [name, description, price, category] of SAMPLE_MENU) {
    await store.saveMenu({
      id: crypto.randomUUID(),
      name,
      description,
      price,
      category,
      available: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  return true;
}
