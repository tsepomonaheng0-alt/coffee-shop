import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper';
import images from '../images.js';

const reviews = [
  {
    image: 'pic-1.jpeg',
    text: ' Good service and delicious food.',
  },
  {
    image: 'pic-2.jpeg',
    text: 'I recommend this coffee shop to everyone. The staff is friendly and the atmosphere is cozy.',
  },
  {
    image: 'pic-3.jpeg',
    text: 'besr coffee in town. I love the variety of drinks and the quality of the beans.',
  },
  {
    image: 'pic-4.jpeg',
    text: 'other services were bad except the coffee.',
  },
];

export default function Review() {
  return (
    <section className="review" id="review">
      <h1 className="heading">reviews <span>what people says</span></h1>

      <Swiper
        modules={[Pagination, Autoplay]}
        className="review-slider"
        spaceBetween={20}
        pagination={{ clickable: true }}
        loop={true}
        grabCursor={true}
        autoplay={{ delay: 7500, disableOnInteraction: false }}
        breakpoints={{
          0: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
        }}
      >
        {reviews.map((review) => (
          <SwiperSlide className="box" key={review.image}>
            <i className="fas fa-quote-left"></i>
            <i className="fas fa-quote-right"></i>
            <img src={images[review.image]} alt="" />
            <div className="stars">
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
              <i className="fas fa-star"></i>
            </div>
            <p>{review.text}</p>
            <span>satisfied client</span>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
