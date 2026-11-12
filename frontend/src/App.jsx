import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Home from './components/Home.jsx';
import Menu from './components/Menu.jsx';
import Book from './components/Book.jsx';
import Review from './components/Review.jsx';
import Footer from './components/Footer.jsx';
import StaffPage from './components/staff/StaffPage.jsx';
import { api } from './api.js';
import { errorText } from './utils.js';

// Hash routing keeps the site working on any static host:  #/staff -> staff dashboard,
// anything else (#home, #menu, #book ...) -> the customer website.
const getRoute = () => (window.location.hash.startsWith('#/staff') ? 'staff' : 'shop');

export default function App() {
  const [route, setRoute] = useState(getRoute);

  // cart: [{ id, name, quantity }] - quantity kept as a string like the original number input
  const [cart, setCart] = useState([]);
  const [orderError, setOrderError] = useState(false);
  const [notice, setNotice] = useState('');

  // live menu from the backend
  const [menu, setMenu] = useState([]);
  const [menuState, setMenuState] = useState({ loading: true, error: '' });

  const loadMenu = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setMenuState({ loading: true, error: '' });
    try {
      setMenu(await api.getMenu());
      setMenuState({ loading: false, error: '' });
    } catch (err) {
      // a failed background refresh keeps showing the menu we already have
      if (!silent) setMenuState({ loading: false, error: errorText(err) });
    }
  }, []);

  useEffect(() => {
    loadMenu();
    // pick up price / availability changes made by staff
    const refresh = () => document.visibilityState === 'visible' && loadMenu({ silent: true });
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadMenu]);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // After switching pages, jump to the requested section (or the top)
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (route === 'staff' || !id) window.scrollTo(0, 0);
    else requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, [route]);

  // target is a menu item object, or a name ("Americano"). The hero button's generic
  // "Fresh coffee" maps to the first available coffee on the live menu.
  const addToCart = (target) => {
    let item = target;
    if (typeof target === 'string') {
      const wanted = target.toLowerCase();
      item =
        menu.find((m) => m.available && m.name.toLowerCase() === wanted) ||
        (wanted === 'fresh coffee' ? menu.find((m) => m.available && m.category === 'Coffee') : undefined);
    }
    if (!item || !item.available) {
      setNotice(menuState.loading ? 'The menu is still loading - try again in a moment.' : 'Sorry, that item is not available right now.');
      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setCart((items) => {
      if (items.some((line) => line.id === item.id)) {
        return items.map((line) =>
          line.id === item.id
            ? { ...line, quantity: String((Number(line.quantity) || 0) + 1) }
            : line
        );
      }
      return [...items, { id: item.id, name: item.name, quantity: '1' }];
    });
    setOrderError(false);
    setNotice('');
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  };

  const changeQuantity = (id, quantity) => {
    setCart((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (id) => {
    setCart((items) => items.filter((item) => item.id !== id));
    setOrderError(false);
  };

  if (route === 'staff') return <StaffPage />;

  return (
    <>
      <Header />
      <Home onAddToCart={addToCart} />
      <Menu
        items={menu}
        loading={menuState.loading}
        error={menuState.error}
        onRetry={loadMenu}
        onAddToCart={addToCart}
      />
      <Book
        cart={cart}
        notice={notice}
        orderError={orderError}
        setOrderError={setOrderError}
        onChangeQuantity={changeQuantity}
        onRemove={removeFromCart}
        onOrderPlaced={() => setCart([])}
      />
      <Review />
      <Footer />
    </>
  );
}
