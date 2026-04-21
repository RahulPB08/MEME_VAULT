import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiMenu, FiX, FiZap, FiUser,
  FiLogOut, FiPlusCircle, FiGrid, FiClock, FiTrendingUp,
} from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import axios from 'axios';
import { resolveImageUrl } from '../utils/imageUtils';
import './Navbar.css';

const DEBOUNCE_MS = 280;

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const {
    account, connectWallet, disconnectWallet,
    isConnecting, isConnected, isWrongNetwork, switchToAnvil, requiredChainId,
  } = useWeb3();

  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);

  // ── Live search state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchResults, setSearchResults] = useState({ nfts: [], auctions: [] });
  const [searching, setSearching]       = useState(false);
  const searchRef                       = useRef(null);
  const debounceRef                     = useRef(null);

  // Close panel when navigating
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [location]);

  // Scroll detection
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Click-outside closes search overlay
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced live search
  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSearchResults({ nfts: [], auctions: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const [nftRes, auctionRes] = await Promise.allSettled([
        axios.get(`/api/nfts?search=${encodeURIComponent(q)}&limit=5`),
        axios.get(`/api/auctions?status=active&limit=3`),
      ]);
      const nfts = nftRes.status === 'fulfilled' ? nftRes.value.data.nfts || [] : [];
      // filter auctions by name client-side (no text search on auction API)
      const allAuctions = auctionRes.status === 'fulfilled' ? auctionRes.value.data.auctions || [] : [];
      const auctions = allAuctions.filter(a =>
        a.nft?.name?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 3);
      setSearchResults({ nfts, auctions });
    } catch {
      setSearchResults({ nfts: [], auctions: [] });
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSearchOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), DEBOUNCE_MS);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleResultClick = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const hasResults = searchResults.nfts.length > 0 || searchResults.auctions.length > 0;
  const showPanel  = searchOpen && searchQuery.trim().length >= 2;

  const navLinks = [
    { href: '/explore',     label: 'Explore'     },
    { href: '/collections', label: 'Collections' },
    { href: '/auctions',    label: 'Auctions'    },
    { href: '/people',      label: 'People'      },
    { href: '/create',      label: 'Create'      },
  ];

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner container">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon"><FiZap /></div>
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

        {/* ── Live Search ── */}
        <div className="navbar-search hide-mobile" ref={searchRef}>
          <form className="search-bar" onSubmit={handleSearchSubmit}>
            <FiSearch className="search-icon" />
            <input
              id="navbar-search-input"
              type="search"
              autoComplete="off"
              placeholder="Search memes, creators..."
              value={searchQuery}
              onChange={handleQueryChange}
              onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => { setSearchQuery(''); setSearchOpen(false); setSearchResults({ nfts: [], auctions: [] }); }}
                aria-label="Clear search"
              >
                <FiX size={13} />
              </button>
            )}
          </form>

          {/* Results panel */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                className="search-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {searching && (
                  <div className="search-state">
                    <div className="search-spinner" /> Searching…
                  </div>
                )}

                {!searching && !hasResults && (
                  <div className="search-state muted">
                    No results for "<strong>{searchQuery}</strong>"
                  </div>
                )}

                {!searching && searchResults.nfts.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-label">🎭 NFTs</div>
                    {searchResults.nfts.map(nft => (
                      <Link
                        key={nft._id}
                        to={`/nft/${nft._id}`}
                        className="search-result-row"
                        onClick={handleResultClick}
                      >
                        <img
                          src={resolveImageUrl(nft.image)}
                          alt={nft.name}
                          className="search-result-thumb"
                        />
                        <div className="search-result-info">
                          <span className="search-result-name">{nft.name}</span>
                          <span className="search-result-sub">
                            {nft.priceInEth ? `${parseFloat(nft.priceInEth).toFixed(4)} ETH` : nft.category}
                          </span>
                        </div>
                        {nft.listed && <span className="badge badge-green search-badge">For Sale</span>}
                      </Link>
                    ))}
                  </div>
                )}

                {!searching && searchResults.auctions.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-label">🔨 Live Auctions</div>
                    {searchResults.auctions.map(a => (
                      <Link
                        key={a._id}
                        to={`/auction/${a._id}`}
                        className="search-result-row"
                        onClick={handleResultClick}
                      >
                        <img
                          src={resolveImageUrl(a.nft?.image)}
                          alt={a.nft?.name}
                          className="search-result-thumb"
                        />
                        <div className="search-result-info">
                          <span className="search-result-name">{a.nft?.name}</span>
                          <span className="search-result-sub">
                            Highest: {a.highestBidEth || '0'} ETH
                          </span>
                        </div>
                        <span className="badge badge-gold search-badge">Auction</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* View all results */}
                <div className="search-footer">
                  <button
                    className="search-view-all"
                    onClick={() => {
                      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
                      setSearchOpen(false);
                    }}
                  >
                    <FiSearch size={13} />
                    View all results for "<strong>{searchQuery}</strong>"
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">
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
                    <Link to="/dashboard" className="profile-menu-item"><FiGrid size={15} /> Dashboard</Link>
                    <Link to="/create" className="profile-menu-item"><FiPlusCircle size={15} /> Create NFT</Link>
                    <div className="profile-menu-divider" />
                    <button className="profile-menu-item danger" onClick={logout}>
                      <FiLogOut size={15} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex gap-2 hide-mobile">
              <Link to="/login" className="btn btn-sm btn-secondary">Sign In</Link>
              <Link to="/register" className="btn btn-sm btn-primary">Sign Up</Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
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
            <form onSubmit={handleSearchSubmit} style={{ padding: '0.75rem 1rem' }}>
              <div className="search-bar">
                <FiSearch className="search-icon" />
                <input
                  type="search"
                  placeholder="Search memes..."
                  value={searchQuery}
                  onChange={handleQueryChange}
                  autoComplete="off"
                />
              </div>
            </form>
            {navLinks.map(link => (
              <Link key={link.href} to={link.href} className="mobile-nav-link">{link.label}</Link>
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

      {/* Wrong-network banner */}
      {isWrongNetwork && (
        <div className="wrong-net-banner">
          <span>⚠️ MetaMask is on the wrong network. MemeVault needs <strong>Chain ID {requiredChainId}</strong> (Anvil Local).</span>
          <button
            className="btn btn-sm switch-net-btn"
            onClick={async () => { try { await switchToAnvil(); } catch {} }}
          >
            🔀 Switch Network
          </button>
        </div>
      )}

      <style>{`
        /* Search dropdown */
        .navbar-search { position: relative; }
        .search-clear-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); padding: 0 0.25rem;
          display: flex; align-items: center;
          transition: color 0.15s;
        }
        .search-clear-btn:hover { color: var(--text-primary); }

        .search-dropdown {
          position: absolute;
          top: calc(100% + 0.6rem);
          left: 0;
          width: 420px;
          max-width: 90vw;
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.15);
          overflow: hidden;
          z-index: 9999;
        }
        .search-state {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1.1rem 1rem;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .search-state.muted { color: var(--text-muted); }
        .search-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(124,58,237,0.3);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .search-section { padding: 0.5rem 0; }
        .search-section-label {
          padding: 0.4rem 1rem;
          font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .search-result-row {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.6rem 1rem;
          transition: background 0.12s;
          cursor: pointer;
          color: var(--text-primary);
        }
        .search-result-row:hover { background: rgba(124,58,237,0.08); }
        .search-result-thumb {
          width: 42px; height: 42px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          background: var(--bg-secondary);
          flex-shrink: 0;
        }
        .search-result-info {
          flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem;
        }
        .search-result-name {
          font-weight: 600; font-size: 0.875rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .search-result-sub { font-size: 0.75rem; color: var(--text-muted); }
        .search-badge { font-size: 0.65rem !important; padding: 0.15rem 0.4rem !important; flex-shrink: 0; }

        .search-footer {
          border-top: 1px solid var(--border-secondary);
          padding: 0.5rem;
        }
        .search-view-all {
          display: flex; align-items: center; gap: 0.5rem;
          width: 100%; padding: 0.65rem 0.75rem;
          background: none; border: none; cursor: pointer;
          color: var(--accent-secondary); font-size: 0.82rem;
          border-radius: var(--radius-md);
          transition: background 0.12s;
          text-align: left;
        }
        .search-view-all:hover { background: rgba(124,58,237,0.08); }
        .search-view-all strong { font-weight: 700; }

        /* Wrong network banner */
        .wrong-net-banner {
          background: linear-gradient(90deg, #7f1d1d, #991b1b);
          color: #fecaca;
          display: flex; align-items: center; justify-content: center;
          gap: 1rem; padding: 0.5rem 1rem;
          font-size: 0.82rem;
          position: sticky; top: 64px; z-index: 998;
          flex-wrap: wrap; text-align: center;
        }
        .switch-net-btn {
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
          color: #fff; white-space: nowrap; flex-shrink: 0;
        }
        .switch-net-btn:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </header>
  );
};

export default Navbar;
