import { useMemo, useState } from 'react';
import { dateKey, dateTimeLabel, errorText, money, STATUSES } from '../../utils.js';

// Live list of every order: who ordered, what, how much - and where it is in the workflow.
export default function StaffOrders({ orders, state, onRefresh, onSetStatus }) {
  const [filter, setFilter] = useState('All');
  const [allDates, setAllDates] = useState(false);
  const [date, setDate] = useState(() => dateKey());
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const inRange = useMemo(
    () => (allDates ? orders : orders.filter((o) => dateKey(o.createdAt) === date)),
    [orders, allDates, date]
  );
  const counts = useMemo(() => {
    const c = { All: inRange.length };
    STATUSES.forEach((s) => (c[s] = inRange.filter((o) => o.status === s).length));
    return c;
  }, [inRange]);
  const shown = filter === 'All' ? inRange : inRange.filter((o) => o.status === filter);
  const shownTotal = shown.reduce((sum, o) => sum + o.total, 0);

  const change = async (order, status) => {
    if (order.status === status) return;
    setBusyId(order.id);
    setError('');
    try {
      await onSetStatus(order, status);
    } catch (err) {
      setError(`${order.orderNumber}: ${errorText(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="staff-panel">
      <div className="staff-toolbar">
        <div className="staff-chips" role="group" aria-label="Filter by status">
          {['All', ...STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              className={`staff-chip${filter === s ? ' active' : ''}`}
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
            >
              {s} <b>{counts[s]}</b>
            </button>
          ))}
        </div>

        <div className="staff-toolbar-right">
          <label className="staff-inline">
            <input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />
            all dates
          </label>
          {!allDates && (
            <input
              className="staff-input staff-date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Show orders for this date"
            />
          )}
          <button type="button" className="btn" onClick={onRefresh} disabled={state.loading}>
            <i className="fas fa-sync-alt" aria-hidden="true"></i> refresh
          </button>
        </div>
      </div>

      <p className="staff-meta">
        {shown.length} {shown.length === 1 ? 'order' : 'orders'} &middot; {money(shownTotal)}
        {state.updatedAt && (
          <> &middot; updated {state.updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (refreshes every 10s)</>
        )}
      </p>

      {state.error && <p className="staff-error" role="alert">{state.error}</p>}
      {error && <p className="staff-error" role="alert">{error}</p>}
      {state.loading && orders.length === 0 && <p className="staff-empty">Loading orders...</p>}
      {!state.loading && shown.length === 0 && !state.error && (
        <p className="staff-empty">No orders to show{filter !== 'All' ? ` with status "${filter}"` : ''}.</p>
      )}

      <div className="staff-orders">
        {shown.map((order) => {
          const next = STATUSES[STATUSES.indexOf(order.status) + 1];
          return (
            <article className={`staff-order status-${order.status.toLowerCase()}`} key={order.id}>
              <header>
                <h3>{order.orderNumber}</h3>
                <span className="staff-badge">{order.status}</span>
              </header>
              <p className="staff-order-meta">
                {order.customerName} &middot; {order.orderType} &middot; {dateTimeLabel(order.createdAt)}
                {order.phone ? <> &middot; {order.phone}</> : null}
              </p>
              <ul className="staff-lines">
                {order.items.map((line) => (
                  <li key={line.menuItemId}>
                    <span>
                      {line.quantity} x {line.name}
                    </span>
                    <span>{money(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              {order.notes && <p className="staff-order-notes">Note: {order.notes}</p>}
              <footer>
                <strong className="staff-order-total">Total {money(order.total)}</strong>
                <div className="staff-steps" role="group" aria-label={`Status of ${order.orderNumber}`}>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${order.status === s ? 'active' : ''}${s === next ? ' next' : ''}`}
                      disabled={busyId === order.id}
                      aria-pressed={order.status === s}
                      onClick={() => change(order, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
