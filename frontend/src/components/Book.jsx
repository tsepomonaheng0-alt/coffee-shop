import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { errorText, money, STATUSES } from '../utils.js';

const LAST_ORDER_KEY = 'coffee-shop:last-order';

export default function Book({
  cart,
  notice,
  orderError,
  setOrderError,
  onChangeQuantity,
  onRemove,
  onOrderPlaced,
}) {
  const errorRef = useRef(null);
  const trackerRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [tracked, setTracked] = useState(null); // the order the customer just placed

  // Focus the error message when it appears (it cannot be focused while hidden)
  useEffect(() => {
    if (orderError && errorRef.current) errorRef.current.focus();
  }, [orderError]);

  // After a page refresh, show the customer's most recent order again if it is still in progress
  useEffect(() => {
    let id = null;
    try {
      id = localStorage.getItem(LAST_ORDER_KEY);
    } catch {
      /* ignore */
    }
    if (!id) return;
    api
      .getOrder(id)
      .then((order) => order.status !== 'Collected' && setTracked(order))
      .catch(() => {});
  }, []);

  // Keep the status of the placed order up to date until it has been collected
  useEffect(() => {
    if (!tracked || tracked.status === 'Collected') return undefined;
    const timer = setInterval(async () => {
      try {
        setTracked(await api.getOrder(tracked.id));
      } catch {
        /* keep the last known status */
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [tracked?.id, tracked?.status]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      setOrderError(true);
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const items = cart.map((item) => ({ menuItemId: item.id, quantity: Number(item.quantity) }));
    if (items.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20)) {
      setSubmitError('Each quantity must be a whole number from 1 to 20.');
      return;
    }

    setSubmitError('');
    setSubmitting(true);
    try {
      const order = await api.placeOrder({
        customerName: data.get('customerName'),
        email: data.get('email'),
        phone: data.get('phone'),
        notes: data.get('notes'),
        orderType: 'Takeaway',
        items,
      });
      try {
        localStorage.setItem(LAST_ORDER_KEY, order.id);
      } catch {
        /* ignore */
      }
      setTracked(order);
      onOrderPlaced(order);
      form.reset();
      setTimeout(() => trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    } catch (err) {
      setSubmitError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const dismissTracker = () => {
    try {
      localStorage.removeItem(LAST_ORDER_KEY);
    } catch {
      /* ignore */
    }
    setTracked(null);
  };

  return (
    <section className="book" id="book">
      <h1 className="heading">order form <span>confirm your purchase</span></h1>

      <form id="order-form" action="" onSubmit={handleSubmit}>
        <fieldset className="order-items">
          <legend>Your order</legend>
          <p id="cart-empty" hidden={cart.length > 0}>
            Your cart is empty. Add items from the menu.
          </p>
          <div id="cart-items" aria-live="polite">
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <span className="cart-item-name">{item.name}</span>
                <input
                  className="cart-item-quantity"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={item.quantity}
                  required
                  aria-label={`Quantity of ${item.name}`}
                  onChange={(event) => onChangeQuantity(item.id, event.target.value)}
                />
                <button
                  className="remove-order-item"
                  type="button"
                  aria-label={`Remove ${item.name} from order`}
                  onClick={() => onRemove(item.id)}
                >
                  <i className="fas fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            ))}
          </div>
          <p
            id="order-error"
            className="order-error"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
            hidden={!orderError}
          >
            Add at least one item to your order.
          </p>
          {notice && (
            <p className="order-error" role="alert">
              {notice}
            </p>
          )}
        </fieldset>
        <input type="text" name="customerName" placeholder="Your Name" className="box" required maxLength={60} />
        <input type="email" name="email" placeholder="Email" className="box" required />
        <input type="number" name="phone" placeholder="Phone Number" className="box" required />
        <textarea
          name="notes"
          placeholder="Delivery Details / Notes"
          className="box"
          cols="30"
          rows="10"
          maxLength={200}
        ></textarea>
        {submitError && (
          <p className="order-error" role="alert">
            {submitError}
          </p>
        )}
        <input
          type="submit"
          value={submitting ? 'placing order...' : 'confirm purchase'}
          className="btn"
          disabled={submitting}
        />
      </form>

      {tracked && (
        <div className="order-tracker" ref={trackerRef} aria-live="polite">
          <h2>Order {tracked.orderNumber}</h2>
          <p className="order-tracker-sub">
            Thank you, {tracked.customerName}! Show this number when you collect your order.
          </p>
          <ol className="order-steps" aria-label="Order progress">
            {STATUSES.map((status, index) => (
              <li
                key={status}
                className={index <= STATUSES.indexOf(tracked.status) ? 'done' : ''}
                aria-current={status === tracked.status ? 'step' : undefined}
              >
                {status}
              </li>
            ))}
          </ol>
          <ul className="order-tracker-items">
            {tracked.items.map((line) => (
              <li key={line.menuItemId}>
                <span>
                  {line.quantity} x {line.name}
                </span>
                <span>{money(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="order-tracker-total">Total {money(tracked.total)}</p>
          <button className="btn" type="button" onClick={dismissTracker}>
            {tracked.status === 'Collected' ? 'close' : 'hide'}
          </button>
        </div>
      )}
    </section>
  );
}
