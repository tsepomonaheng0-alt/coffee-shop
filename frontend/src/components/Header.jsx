import { useEffect, useState } from 'react';
import images from '../images.js';

export default function Header() {
  const [open, setOpen] = useState(false);

  // Close the mobile menu on scroll (same as window.onscroll in the original)
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('scroll', close);
    return () => window.removeEventListener('scroll', close);
  }, []);

  return (
    <header className="header">
      <div
        id="menu-btn"
        className={`fas fa-bars${open ? ' fa-times' : ''}`}
        onClick={() => setOpen((value) => !value)}
      ></div>

      <a href="#home" className="header-logo" aria-label="Coffee home">
        <img src={images['hohooosdfodihsn.png']} alt="Coffee" className="brand-logo" />
      </a>
      <nav className={`navbar${open ? ' active' : ''}`}>
        <a href="#home">Home</a>
        <a href="#menu">Menu</a>
        <a href="#book">Cart</a>
        <a href="#review">Review</a>
      </nav>

      <a href="#" className="btn">Grab <b>now</b></a>
    </header>
  );
}
