import { useCallback, useEffect, useState } from 'react';
import Footer from '../Footer.jsx';
import images from '../../images.js';
import { api, clearSession, loadSession } from '../../api.js';
import { errorText } from '../../utils.js';
import StaffLogin from './StaffLogin.jsx';
import StaffOrders from './StaffOrders.jsx';
import StaffNewOrder from './StaffNewOrder.jsx';
import StaffMenu from './StaffMenu.jsx';
import StaffSummary from './StaffSummary.jsx';

// Staff dashboard (#/staff). Uses the same header, fonts, colours, borders and buttons as the shop.
export default function StaffPage() {
  const [session, setSession] = useState(loadSession);
  const [loginNotice, setLoginNotice] = useState('');
  const [tab, setTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [ordersState, setOrdersState] = useState({ loading: true, error: '', updatedAt: null });
  const [menu, setMenu] = useState([]);
  const [menuError, setMenuError] = useState('');

  const token = session?.token;

  const logout = useCallback((message = '') => {
    clearSession();
    setSession(null);
    setOrders([]);
    setLoginNotice(message);
  }, []);

  // Runs an authenticated API call. If the token has expired the staff member is signed out.
  const call = useCallback(
    async (fn) => {
      try {
        return await fn(token);
      } catch (err) {
        if (err.status === 401) logout('Your session has expired. Please sign in again.');
        throw err;
      }
    },
    [token, logout]
  );

  const refreshOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      if (!silent) setOrdersState((s) => ({ ...s, loading: true, error: '' }));
      try {
        const data = await call((t) => api.listOrders(t));
        setOrders(data);
        setOrdersState({ loading: false, error: '', updatedAt: new Date() });
      } catch (err) {
        setOrdersState((s) => ({ ...s, loading: false, error: errorText(err) }));
      }
    },
    [token, call]
  );

  const refreshMenu = useCallback(async () => {
    try {
      setMenu(await api.getMenu());
      setMenuError('');
    } catch (err) {
      setMenuError(errorText(err));
    }
  }, []);

  // Load everything once signed in, then keep the order list fresh while the page is open
  useEffect(() => {
    if (!token) return undefined;
    refreshOrders();
    refreshMenu();
    const timer = setInterval(() => refreshOrders({ silent: true }), 10000);
    return () => clearInterval(timer);
  }, [token, refreshOrders, refreshMenu]);

  // ---- order actions ----
  const setStatus = async (order, status) => {
    const updated = await call((t) => api.setOrderStatus(t, order.id, status));
    setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  };

  // Staff recording an order by hand uses the same endpoint customers use.
  const createOrder = async (payload) => {
    const order = await api.placeOrder(payload);
    await refreshOrders({ silent: true });
    return order;
  };

  // ---- menu actions ----
  const addMenuItem = async (item) => {
    await call((t) => api.createMenuItem(t, item));
    await refreshMenu();
  };
  const saveMenuItem = async (id, changes) => {
    await call((t) => api.updateMenuItem(t, id, changes));
    await refreshMenu();
  };
  const deleteMenuItem = async (id) => {
    await call((t) => api.deleteMenuItem(t, id));
    await refreshMenu();
  };

  const pending = orders.filter((o) => o.status === 'Pending').length;

  const header = (
    <header className="header">
      <a href="#home" className="header-logo" aria-label="Back to the Coffee shop">
        <img src={images['hohooosdfodihsn.png']} alt="Coffee" className="brand-logo" />
      </a>
      <div className="staff-header-actions">
        <a href="#home" className="staff-header-link">
          shop
        </a>
        {session && (
          <button type="button" className="btn" onClick={() => logout()}>
            log out
          </button>
        )}
      </div>
    </header>
  );

  if (!session) {
    return (
      <>
        {header}
        <StaffLogin notice={loginNotice} onLogin={(s) => { setLoginNotice(''); setSession(s); }} />
        <Footer />
      </>
    );
  }

  const tabs = [
    ['orders', `orders${pending ? ` (${pending} pending)` : ''}`],
    ['new', 'record order'],
    ['menu', 'menu & prices'],
    ['summary', 'daily summary'],
  ];

  return (
    <>
      {header}
      <section className="staff" id="staff">
        <h1 className="heading">staff <span>dashboard</span></h1>

        <div className="staff-wrap">
          <div className="staff-tabs" role="tablist" aria-label="Staff sections">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`btn${tab === key ? ' active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'orders' && (
            <StaffOrders
              orders={orders}
              state={ordersState}
              onRefresh={() => refreshOrders()}
              onSetStatus={setStatus}
            />
          )}
          {tab === 'new' && <StaffNewOrder menu={menu} menuError={menuError} onCreate={createOrder} />}
          {tab === 'menu' && (
            <StaffMenu
              menu={menu}
              error={menuError}
              onAdd={addMenuItem}
              onSave={saveMenuItem}
              onDelete={deleteMenuItem}
            />
          )}
          {tab === 'summary' && <StaffSummary onLoad={(date) => call((t) => api.summary(t, date))} />}
        </div>
      </section>
      <Footer />
    </>
  );
}
