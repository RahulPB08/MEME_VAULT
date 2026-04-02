import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMenu, FiX, FiZap, FiBell, FiUser, FiLogOut, FiPlusCircle, FiGrid } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { account, connectWallet, disconnectWallet, isConnecting, isConnected } = useWeb3();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); }, [location]);

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/auctions', label: 'Auctions' },
    { href: '/create', label: 'Create' },
    { href: '/collections', label: 'Collections' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/explore?search=${encodeURIComponent(searchQuery)}`);
  };

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <FiZap />
          </div>
          <span className="logo-text">Meme<span className="logo-vault">Vault</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar-links hide-mobile">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={`nav-link ${location.pathname.startsWith(link.href) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form className="navbar-search hide-mobile" onSubmit={handleSearch}>
          <div className="search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search memes, creators..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="navbar-actions">
          {/* Wallet */}
          <button
            className={`btn btn-sm ${isConnected ? 'btn-wallet-connected' : 'btn-outline'}`}
            onClick={isConnected ? disconnectWallet : connectWallet}
            disabled={isConnecting}
          >
            <SiEthereum size={14} />
            <span className="hide-mobile">
              {isConnecting ? 'Connecting...' : isConnected ? truncate(account) : 'Connect'}
            </span>
          </button>

          {isAuthenticated ? (
            <>
              <button className="btn btn-sm btn-icon hide-mobile">
                <FiBell size={16} />
              </button>
              <div className="profile-dropdown">
                <button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)}>
                  <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="avatar" style={{ width: 36, height: 36 }} />
                    ) : (
                      user?.username?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      className="profile-menu"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="profile-menu-header">
                        <p className="profile-name">{user?.username}</p>
                        <p className="profile-email">{user?.email}</p>
                      </div>
                      <div className="profile-menu-divider" />
                      <Link to={`/profile/${user?.username}`} className="profile-menu-item">
                        <FiUser size={15} /> My Profile
                      </Link>
                      <Link to="/dashboard" className="profile-menu-item">
                        <FiGrid size={15} /> Dashboard
                      </Link>
                      <Link to="/create" className="profile-menu-item">
                        <FiPlusCircle size={15} /> Create NFT
                      </Link>
                      <div className="profile-menu-divider" />
                      <button className="profile-menu-item danger" onClick={logout}>
                        <FiLogOut size={15} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex gap-2 hide-mobile">
              <Link to="/login" className="btn btn-sm btn-secondary">Sign In</Link>
              <Link to="/register" className="btn btn-sm btn-primary">Sign Up</Link>
            </div>
          )}

          {/* Mobile Menu */}
          <button className="btn btn-icon btn-ghost mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSearch} style={{ padding: '0.75rem 1rem' }}>
              <div className="search-bar">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search memes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
            {navLinks.map(link => (
              <Link key={link.href} to={link.href} className="mobile-nav-link">
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="flex gap-2" style={{ padding: '0.75rem 1rem' }}>
                <Link to="/login" className="btn btn-secondary" style={{ flex: 1 }}>Sign In</Link>
                <Link to="/register" className="btn btn-primary" style={{ flex: 1 }}>Sign Up</Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
