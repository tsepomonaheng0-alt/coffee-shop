import { useState } from 'react';
import images from '../images.js';

const sliderImages = ['home-img-1.png', 'home-img-2.png', 'home-img-3.png'];

const getTimeOfDayHeadline = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'fresh coffee in the morning';
  if (hour >= 12 && hour < 17) return 'fresh coffee in the afternoon';
  if (hour >= 17 && hour < 22) return 'fresh coffee in the evening';
  return 'fresh coffee at night';
};

export default function Home({ onAddToCart }) {
  const [mainImage, setMainImage] = useState('home-img-1.png');
  const timeOfDayHeadline = getTimeOfDayHeadline();

  return (
    <section className="home" id="home">
      <div className="row">
        <div className="content">
          <h3>{timeOfDayHeadline}</h3>
          <a
            href="#book"
            className="btn add-to-cart-trigger"
            data-item="Fresh coffee"
            onClick={(event) => {
              event.preventDefault();
              onAddToCart('Fresh coffee');
            }}
          >
            add to cart
          </a>
        </div>

        <div className="image">
          <img src={images[mainImage]} className="main-home-image" alt="" />
        </div>
      </div>

      <div className="image-slider">
        {sliderImages.map((name) => (
          <img
            key={name}
            src={images[name]}
            alt=""
            onClick={() => setMainImage(name)}
          />
        ))}
      </div>
    </section>
  );
}
