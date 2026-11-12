import { useMemo, useState } from 'react';
import { CATEGORIES, errorText, money, ORDER_TYPES } from '../../utils.js';

// Staff record an order by hand (walk-ins, phone orders). It goes through the same API as the
// website, so prices are always taken from the menu and the order appears in the live list.
export default function StaffNewOrder({ menu, menuError, onCreate }) {
  const [qty, setQty] = useState({});
  const [name, setName] = useState('');
  const [type, setType] = useState('Dine-in');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const groups = useMemo(() => {
    const cats = [...CATEGORIES, ...new Set(menu.map((m) => m.category).filter((c) => !CATEGORIES.includes(c)))];
    return cats.map((c) => [c, menu.filter((m) => m.category === c)]).filter(([, items]) => items.length);
  }, [menu]);

  const lines = menu.filter((m) => qty[m.id] > 0).map((m) => ({ item: m, quantity: qty[m.id] }));
  const total = lines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);

  const bump = (id, delta) =>
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(20, (q[id] || 0) + delta)) }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setDone(null);
    try {
      const order = await onCreate({
        customerName: name,
        orderType: type,
        phone,
        notes,
        items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
      });
      setDone(order);
      setQty({});
      setName('');
      setPhone('');
      setNotes('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="staff-panel staff-new">
      <div className="staff-menu-pick">
        <h2 className="staff-title">1. choose items</h2>
        {menuError && <p className="staff-error" role="alert">{menuError}</p>}
        {groups.length === 0 && !menuError && <p className="staff-empty">The menu is empty. Add items on the "menu & prices" tab.</p>}
        {groups.map(([category, items]) => (
          <fieldset className="order-items" key={category}>
            <legend>{category}</legend>
            {items.map((item) => (
              <div className={`cart-item${item.available ? '' : ' staff-soldout'}`} key={item.id}>
                <span className="cart-item-name">
                  {item.name} <small>{money(item.price)}{item.available ? '' : ' - sold out'}</small>
                </span>
                <div className="staff-qty">
                  <button type="button" onClick={() => bump(item.id, -1)} disabled={!item.available || !qty[item.id]} aria-label={`Remove one ${item.name}`}>
                    <span aria-hidden="true">&minus;</span>
                  </button>
                  <output aria-label={`Quantity of ${item.name}`}>{qty[item.id] || 0}</output>
                  <button type="button" onClick={() => bump(item.id, 1)} disabled={!item.available} aria-label={`Add one ${item.name}`}>
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
              </div>
            ))}
          </fieldset>
        ))}
      </div>

      <form className="staff-form staff-ticket" onSubmit={submit}>
        <h2 className="staff-title">2. customer &amp; order</h2>
        <input className="staff-input" type="text" placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
        <select className="staff-input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Order type">
          {ORDER_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input className="staff-input" type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <textarea className="staff-input" placeholder="Notes (optional)" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200}></textarea>

        <ul className="staff-lines">
          {lines.length === 0 && <li className="staff-empty">No items selected yet.</li>}
          {lines.map((l) => (
            <li key={l.item.id}>
              <span>
                {l.quantity} x {l.item.name}
              </span>
              <span>{money(l.item.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="staff-order-total">Total {money(total)}</p>

        {error && <p className="staff-error" role="alert">{error}</p>}
        {done && (
          <p className="staff-note" role="status">
            Order {done.orderNumber} recorded for {done.customerName} - total {money(done.total)}. It is now in the
            orders list as Pending.
          </p>
        )}
        <input type="submit" className="btn" value={busy ? 'saving...' : 'record order'} disabled={busy || lines.length === 0} />
      </form>
    </div>
  );
}
