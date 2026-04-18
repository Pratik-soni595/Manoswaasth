import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getToken, clearToken } from '../utils/authToken';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const token = getToken();
  const isLoggedIn = !!token;

  const handleLogout = () => {
    clearToken();
    setMenuOpen(false);
    // Hard refresh or redirect to home to clear state completely
    window.location.href = '/login';
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/dosha-quiz', label: 'Dosha Quiz' },
    { to: '/chat', label: 'AI Companion' },
    { to: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
    >
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <motion.div
            className="navbar__logo-icon"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Leaf size={22} />
          </motion.div>
          <span className="navbar__logo-text">Manoswaasth</span>
        </Link>

        <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar__link ${location.pathname === link.to ? 'navbar__link--active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {location.pathname === link.to && (
                <motion.div
                  className="navbar__link-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
          
          {isLoggedIn ? (
            <button className="navbar__login-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link to="/login" className="navbar__login-btn" onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>

        <button className="navbar__menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </motion.nav>
  );
}
