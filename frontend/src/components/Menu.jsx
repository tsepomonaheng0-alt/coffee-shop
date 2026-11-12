import { inOriginalOrder, menuImage } from '../menuImages.js';
import { money } from '../utils.js';

// Same markup as the original static menu - the items now come from the backend
// (name, description, price and availability are managed by staff).
export default function Menu({ items, loading, error, onRetry, onAddToCart }) {
  return (
    <section className="menu" id="menu">
      <h1 className="heading">our menu <span>popular menu</span></h1>

      {loading && <p className="menu-status" role="status">Loading the menu...</p>}
      {error && (
        <p className="menu-status" role="alert">
          {error}{' '}
          <button className="btn" type="button" onClick={() => onRetry()}>
            try again
          </button>
        </p>
      )}

      <div className="box-container">
        {inOriginalOrder(items).map((item) => (
          <div className="box" key={item.id}>
            <img src={menuImage(item)} alt="" />
            <div className="content">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span>{money(item.price)}</span>
              <button
                className="btn add-to-cart-trigger"
                data-item={item.name}
                disabled={!item.available}
                onClick={() => onAddToCart(item)}
              >
                {item.available ? 'Add to Cart' : 'Sold out'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
