import images from './images.js';

// The original drinks keep their original pictures. Items staff add later get one of the
// same six pictures (always the same one for the same item).
const KNOWN = [
  ['americano', 'menu-1.png'],
  ['espresso', 'menu-2.png'],
  ['cappuccino', 'menu-3.png'],
  ['hot chocolate', 'menu-4.png'],
  ['matcha', 'menu-5.png'],
  ['iced latte', 'menu-6.png'],
];

// The original page showed the drinks in this order: Americano, Espresso, Cappuccino,
// Hot Chocolate, Matcha Latte, Iced Latte. Those keep that position; anything staff add
// afterwards follows in the order the server returns it.
const ORIGINAL_ORDER = ['americano', 'espresso', 'cappuccino', 'hot chocolate', 'matcha', 'iced latte'];

export function inOriginalOrder(items) {
  const rank = (item) => {
    const i = ORIGINAL_ORDER.findIndex((key) => item.name.toLowerCase().includes(key));
    return i === -1 ? ORIGINAL_ORDER.length : i;
  };
  return [...items].sort((a, b) => rank(a) - rank(b)); // stable sort
}

export function menuImage(item) {
  const name = item.name.toLowerCase();
  const hit = KNOWN.find(([key]) => name.includes(key));
  if (hit) return images[hit[1]];
  let h = 0;
  for (const ch of item.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return images[`menu-${(h % 6) + 1}.png`];
}
