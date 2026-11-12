import { createRoot } from 'react-dom/client';
import 'swiper/css/bundle';
import './css/style.css';
import App from './App.jsx';

// Note: <React.StrictMode> is intentionally not used - Swiper 7 crashes when
// StrictMode double-mounts components in development.
createRoot(document.getElementById('root')).render(<App />);
