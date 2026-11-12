import { useCallback, useEffect, useState } from 'react';
import { dateKey, errorText, money, STATUSES } from '../../utils.js';

export default function StaffSummary({ onLoad }) {
  const [date, setDate] = useState(() => dateKey());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await onLoad(date));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [onLoad, date]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [date]);

  return (
    <div className="staff-panel">
      <div className="staff-toolbar">
        <label className="staff-inline">
          date
          <input className="staff-input staff-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          <i className="fas fa-sync-alt" aria-hidden="true"></i> refresh
        </button>
      </div>

      {error && <p className="staff-error" role="alert">{error}</p>}
      {loading && !data && <p className="staff-empty">Loading summary...</p>}

      {data && (
        <>
          <div className="staff-stats">
            <div className="staff-stat"><span>orders</span><strong>{data.totalOrders}</strong></div>
            <div className="staff-stat"><span>revenue</span><strong>{money(data.totalRevenue)}</strong></div>
            <div className="staff-stat"><span>average order</span><strong>{money(data.averageOrderValue)}</strong></div>
          </div>

          <h2 className="staff-title">orders by status</h2>
          <div className="staff-stats">
            {STATUSES.map((s) => (
              <div className="staff-stat" key={s}><span>{s}</span><strong>{data.byStatus[s]}</strong></div>
            ))}
          </div>

          <h2 className="staff-title">best sellers</h2>
          {data.topItems.length === 0 ? (
            <p className="staff-empty">No sales on this date yet.</p>
          ) : (
            <ol className="staff-top">
              {data.topItems.map((t) => (
                <li key={t.name}>
                  <span>{t.name}</span>
                  <span>{t.quantity} sold &middot; {money(t.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
