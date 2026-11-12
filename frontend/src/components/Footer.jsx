import images from '../images.js';

export default function Footer() {
  return (
    <section className="footer">
      <div className="footer-content">
        <a href="#home" className="footer-logo" aria-label="Coffee home">
          <img src={images['hohooosdfodihsn.png']} alt="Coffee" className="brand-logo" />
        </a>

        <div className="footer-contact">
          <a href="tel:+266">
            <i className="fas fa-phone" aria-hidden="true"></i> +266 6214 3330
          </a>
          <a href="mailto:coffee@gmail.com">
            <i className="fas fa-envelope" aria-hidden="true"></i> coffee@gmail.com
          </a>
          <span>
            <i className="fas fa-map-marker-alt" aria-hidden="true"></i>LNDC center,
            Pioneer Rd, Maseru 100
          </span>
        </div>

        <nav className="footer-socials" aria-label="Social media">
          <a href="https://www.facebook.com/" aria-label="Facebook">
            <i className="fab fa-facebook-f" aria-hidden="true"></i>
          </a>
          <a href="https://www.instagram.com/" aria-label="Instagram">
            <i className="fab fa-instagram" aria-hidden="true"></i>
          </a>
          <a href="https://www.tiktok.com/" aria-label="TikTok">
            <i className="fab fa-tiktok" aria-hidden="true"></i>
          </a>
        </nav>
      </div>
      <div className="credit">ALL RIGHTS RESERVED.</div>
    </section>
  );
}
