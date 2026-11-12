import { useEffect, useState } from 'react';
import { CATEGORIES, errorText, money } from '../../utils.js';

const blank = { name: '', description: '', price: '', category: 'Coffee' };
const fromItem = (i) => ({ name: i.name, description: i.description, price: String(i.price), category: i.category });

function Fields({ draft, setDraft }) {
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value });
  return (
    <>
      <input className="staff-input" placeholder="Name" value={draft.name} onChange={set('name')} required maxLength={80} aria-label="Name" />
      <input className="staff-input staff-price" type="number" min="0.01" step="0.01" placeholder="Price" value={draft.price} onChange={set('price')} required aria-label="Price" />
      <select className="staff-input" value={draft.category} onChange={set('category')} aria-label="Category">
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input className="staff-input staff-desc" placeholder="Description" value={draft.description} onChange={set('description')} maxLength={300} aria-label="Description" />
    </>
  );
}

function MenuRow({ item, onSave, onDelete }) {
  const [draft, setDraft] = useState(fromItem(item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // when the item changes on the server (after a save/refresh) show the saved values
  useEffect(() => setDraft(fromItem(item)), [item.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = fromItem(item);
  const dirty = Object.keys(saved).some((k) => saved[k] !== draft[k]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`staff-menu-row${item.available ? '' : ' staff-soldout'}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => onSave(item.id, { ...draft, price: Number(draft.price) }));
        }}
      >
        <Fields draft={draft} setDraft={setDraft} />
        <div className="staff-row-actions">
          <button type="submit" className="btn" disabled={!dirty || busy}>
            save
          </button>
          <button
            type="button"
            className={`btn staff-toggle${item.available ? ' active' : ''}`}
            disabled={busy}
            aria-pressed={item.available}
            onClick={() => run(() => onSave(item.id, { available: !item.available }))}
          >
            {item.available ? 'available' : 'sold out'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            aria-label={`Delete ${item.name}`}
            onClick={() => window.confirm(`Delete "${item.name}" from the menu?`) && run(() => onDelete(item.id))}
          >
            delete
          </button>
        </div>
      </form>
      {error && <p className="staff-error" role="alert">{error}</p>}
    </li>
  );
}

// Add, rename, re-price, hide (sold out) and delete menu items. Customers see changes straight away.
export default function StaffMenu({ menu, error, onAdd, onSave, onDelete }) {
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [added, setAdded] = useState('');

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    setAddError('');
    setAdded('');
    try {
      await onAdd({ ...draft, price: Number(draft.price), available: true });
      setAdded(`"${draft.name}" added at ${money(draft.price)}.`);
      setDraft(blank);
    } catch (err) {
      setAddError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="staff-panel">
      <form className="staff-form staff-add" onSubmit={add}>
        <h2 className="staff-title">add a menu item</h2>
        <div className="staff-menu-fields">
          <Fields draft={draft} setDraft={setDraft} />
        </div>
        {addError && <p className="staff-error" role="alert">{addError}</p>}
        {added && <p className="staff-note" role="status">{added}</p>}
        <input type="submit" className="btn" value={busy ? 'adding...' : 'add item'} disabled={busy} />
      </form>

      <h2 className="staff-title">current menu &middot; {menu.length} items</h2>
      <p className="staff-meta">Edit a name, price, category or description, then press save. Mark an item "sold out" to stop customers ordering it.</p>
      {error && <p className="staff-error" role="alert">{error}</p>}
      <ul className="staff-menu-list">
        {menu.map((item) => (
          <MenuRow key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
