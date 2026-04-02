import { Link } from 'react-router-dom';
import { FiZap, FiTwitter, FiGithub, FiMessageCircle } from 'react-icons/fi';
import { SiDiscord } from 'react-icons/si';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="logo-icon" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                <FiZap />
              </div>
              <span className="logo-text" style={{ fontSize: '1.1rem' }}>
                Meme<span className="logo-vault">Vault</span>
              </span>
            </Link>
            <p className="footer-desc">
              The world's premier NFT marketplace for memes. Trade, collect, and create iconic internet culture on the blockchain.
            </p>
            <div className="footer-socials">
              <a href="#" className="social-btn"><FiTwitter /></a>
              <a href="#" className="social-btn"><SiDiscord /></a>
              <a href="#" className="social-btn"><FiGithub /></a>
              <a href="#" className="social-btn"><FiMessageCircle /></a>
            </div>
          </div>

          <div className="footer-links-col">
            <h4>Marketplace</h4>
            <Link to="/explore">Explore All</Link>
            <Link to="/auctions">Live Auctions</Link>
            <Link to="/collections">Collections</Link>
            <Link to="/create">Create</Link>
          </div>

          <div className="footer-links-col">
            <h4>Resources</h4>
            <a href="#">Help Center</a>
            <a href="#">Platform Status</a>
            <a href="#">Gas Tracker</a>
            <a href="#">Blog</a>
          </div>

          <div className="footer-links-col">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} MemeVault. All rights reserved.</p>
          <p className="footer-chain">
            Built on <span className="gradient-text">Ethereum</span>
          </p>
        </div>
      </div>

      <style>{`
        .footer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-secondary);
          padding: 4rem 0 2rem;
          margin-top: 5rem;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }
        .footer-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.7;
          margin-bottom: 1.5rem;
          max-width: 280px;
        }
        .footer-socials {
          display: flex;
          gap: 0.75rem;
        }
        .social-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 1rem;
          transition: var(--transition-fast);
        }
        .social-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-secondary);
          transform: translateY(-2px);
        }
        .footer-links-col h4 {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }
        .footer-links-col a {
          display: block;
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 0.625rem;
          transition: var(--transition-fast);
        }
        .footer-links-col a:hover {
          color: var(--accent-secondary);
          padding-left: 4px;
        }
        .footer-bottom {
          border-top: 1px solid var(--border-secondary);
          padding-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer-bottom p {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
        }
        @media (max-width: 640px) {
          .footer-grid { grid-template-columns: 1fr; }
          .footer-bottom { justify-content: center; text-align: center; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
