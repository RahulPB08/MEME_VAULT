import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiZap, FiTrendingUp, FiAward, FiShield } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import NFTCard from '../components/NFTCard';
import { useWeb3 } from '../context/Web3Context';

const CATEGORIES = [
  { id: 'trending', label: '🔥 Trending', icon: '🔥' },
  { id: 'dank', label: '😂 Dank', icon: '😂' },
  { id: 'crypto', label: '🪙 Crypto', icon: '🪙' },
  { id: 'wholesome', label: '💖 Wholesome', icon: '💖' },
  { id: 'classic', label: '👴 Classic', icon: '👴' },
  { id: 'gaming', label: '🎮 Gaming', icon: '🎮' },
  { id: 'anime', label: '✨ Anime', icon: '✨' },
  { id: 'politics', label: '🏛️ Politics', icon: '🏛️' },
];

const FEATURES = [
  { icon: <FiZap />, title: 'Instant Minting', desc: 'Mint your meme NFTs instantly with low gas fees on Ethereum.' },
  { icon: <FiTrendingUp />, title: 'Live Auctions', desc: 'Bid on exclusive memes in real-time English auctions with anti-snipe protection.' },
  { icon: <FiAward />, title: 'Royalties', desc: 'Creators earn royalties on every secondary sale — forever.' },
  { icon: <FiShield />, title: 'Secure Offers', desc: 'Make private offers on any NFT with time-locked escrow contracts.' },
];

const Home = () => {
  const { connectWallet, isConnected, isConnecting } = useWeb3();
  const [trendingNFTs, setTrendingNFTs] = useState([]);
  const [stats, setStats] = useState({ totalNFTs: 0, totalSold: 0, totalListed: 0, totalUsers: 0 });
  const [topCreators, setTopCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nftRes, statsRes, creatorsRes] = await Promise.all([
          axios.get('/api/nfts/trending'),
          axios.get('/api/nfts/stats'),
          axios.get('/api/users/top-creators'),
        ]);
        setTrendingNFTs(nftRes.data.nfts || []);
        setStats(statsRes.data.stats || {});
        setTopCreators(creatorsRes.data.creators || []);
      } catch (e) {
        // If API is offline, show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <Helmet>
        <title>MemeVault — Meme NFT Marketplace</title>
        <meta name="description" content="Buy, sell, and auction meme NFTs on MemeVault — the world's premier meme NFT marketplace." />
      </Helmet>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-glow" />
        <div className="hero-bg-glow hero-bg-glow-2" />
        <div className="container hero-content">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <span className="hero-tag">✨ The Premier Meme NFT Marketplace</span>
            <h1 className="hero-title">
              Own the{' '}
              <span className="gradient-text">Internet's Legacy</span>
              <br />One Meme at a Time
            </h1>
            <p className="hero-subtitle">
              Discover, collect, and trade iconic memes as NFTs. Where internet culture
              meets blockchain permanence. The vault never forgets.
            </p>
            <div className="hero-actions">
              <Link to="/explore" className="btn btn-primary btn-xl">
                Explore Marketplace <FiArrowRight />
              </Link>
              {!isConnected && (
                <button className="btn btn-secondary btn-xl" onClick={connectWallet} disabled={isConnecting}>
                  <SiEthereum size={18} />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
              <Link to="/create" className="btn btn-outline btn-xl">
                Create NFT
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalNFTs?.toLocaleString() || '0'}+</span>
                <span className="hero-stat-label">Total Memes</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalSold?.toLocaleString() || '0'}+</span>
                <span className="hero-stat-label">Memes Sold</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalUsers?.toLocaleString() || '0'}+</span>
                <span className="hero-stat-label">Creators</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            <div className="hero-card-stack">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`hero-stack-card hero-stack-card-${i}`}>
                  <div className="hero-card-inner">
                    <div style={{ fontSize: '3rem', textAlign: 'center', padding: '2rem' }}>
                      {['🐕', '🚀', '😂'][i]}
                    </div>
                    <div style={{ padding: '0 1rem 1rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {['Doge #4201', 'To The Moon!', 'Distracted BF'][i]}
                      </p>
                      <div className="flex items-center gap-2" style={{ marginTop: '0.5rem' }}>
                        <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                          {['2.5', '1.8', '3.1'][i]} ETH
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="tag">Browse by Category</span>
            <h2>Find Your Favorite <span className="gradient-text">Meme Style</span></h2>
          </div>
          <div className="category-grid">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/explore?category=${cat.id}`} className="category-card">
                  <span className="category-emoji">{cat.icon}</span>
                  <span className="category-label">{cat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING NFTs ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <span className="tag">🔥 Hot Right Now</span>
            <h2>Trending <span className="gradient-text">Meme NFTs</span></h2>
            <p>The most coveted memes on the blockchain right now.</p>
          </div>

          {loading ? (
            <div className="grid-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="nft-card">
                  <div className="skeleton" style={{ aspectRatio: '1', width: '100%' }} />
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="skeleton" style={{ height: 14, borderRadius: 4, width: '60%' }} />
                    <div className="skeleton" style={{ height: 18, borderRadius: 4, width: '80%' }} />
                    <div className="skeleton" style={{ height: 36, borderRadius: 8, marginTop: '0.5rem' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingNFTs.length > 0 ? (
            <div className="grid-4">
              {trendingNFTs.map((nft, i) => (
                <NFTCard key={nft._id} nft={nft} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎭</div>
              <h3>No memes yet!</h3>
              <p>Be the first to mint a meme NFT.</p>
              <Link to="/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create NFT</Link>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/explore" className="btn btn-outline btn-lg">
              View All Memes <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <span className="tag">Why MemeVault</span>
            <h2>Built for <span className="gradient-text">Meme Collectors</span></h2>
          </div>
          <div className="grid-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                className="feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP CREATORS ── */}
      {topCreators.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header">
              <span className="tag">🏆 Top Creators</span>
              <h2>Meet the <span className="gradient-text">Meme Masters</span></h2>
            </div>
            <div className="grid-4">
              {topCreators.slice(0, 8).map((creator, i) => (
                <motion.div
                  key={creator._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/profile/${creator.username}`} className="creator-card">
                    <div className="creator-rank">#{i + 1}</div>
                    <div className="creator-avatar-wrap">
                      <div className="avatar-placeholder" style={{ width: 60, height: 60, fontSize: '1.4rem' }}>
                        {creator.avatar ? (
                          <img src={creator.avatar} alt={creator.username} className="avatar" style={{ width: 60, height: 60 }} />
                        ) : (
                          creator.username[0].toUpperCase()
                        )}
                      </div>
                    </div>
                    <p className="creator-name">
                      {creator.username}
                      {creator.isVerified && <MdVerified className="verified-icon" size={14} />}
                    </p>
                    <p className="creator-nfts">{creator.nftsCreated} NFTs created</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-glow" />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2>Ready to Vault Your Memes?</h2>
              <p>Join thousands of creators and collectors on the blockchain.</p>
              <div className="hero-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
                <Link to="/create" className="btn btn-primary btn-xl">Start Creating</Link>
                <Link to="/explore" className="btn btn-secondary btn-xl">Explore Memes</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <style>{`
        /* Hero */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding-top: 5rem;
          position: relative;
          overflow: hidden;
          background: var(--gradient-hero);
        }
        .hero-bg-glow {
          position: absolute;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
          top: -100px;
          left: -200px;
          filter: blur(60px);
          pointer-events: none;
        }
        .hero-bg-glow-2 {
          background: radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%);
          top: unset;
          left: unset;
          bottom: -100px;
          right: -200px;
        }
        .hero-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          padding: 4rem 1.5rem;
        }
        .hero-tag {
          display: inline-block;
          background: rgba(124,58,237,0.15);
          color: var(--accent-secondary);
          padding: 0.45rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          border: 1px solid rgba(124,58,237,0.25);
          margin-bottom: 1.25rem;
        }
        .hero-title {
          margin-bottom: 1.25rem;
          line-height: 1.1;
        }
        .hero-subtitle {
          font-size: 1.05rem;
          line-height: 1.7;
          margin-bottom: 2rem;
          max-width: 520px;
        }
        .hero-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }
        .hero-stats {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .hero-stat { text-align: center; }
        .hero-stat-value {
          display: block;
          font-family: var(--font-secondary);
          font-size: 1.5rem;
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-stat-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .hero-stat-divider {
          width: 1px;
          height: 30px;
          background: var(--border-secondary);
        }

        /* Hero Card Stack */
        .hero-visual { display: flex; justify-content: center; align-items: center; }
        .hero-card-stack {
          position: relative;
          width: 280px;
          height: 380px;
        }
        .hero-stack-card {
          position: absolute;
          width: 240px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-primary);
          box-shadow: var(--shadow-glow);
          overflow: hidden;
          transition: var(--transition-slow);
        }
        .hero-card-inner { background: var(--bg-card); }
        .hero-stack-card-0 {
          top: 0; left: 0; z-index: 3;
          transform: rotate(-5deg);
          animation: float 4s ease-in-out infinite;
        }
        .hero-stack-card-1 {
          top: 40px; left: 40px; z-index: 2;
          transform: rotate(2deg);
          animation: float 4s ease-in-out infinite 0.5s;
        }
        .hero-stack-card-2 {
          top: 80px; left: 15px; z-index: 1;
          transform: rotate(-2deg);
          animation: float 4s ease-in-out infinite 1s;
          opacity: 0.7;
        }

        /* Categories */
        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1.5rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          transition: var(--transition-base);
          cursor: pointer;
        }
        .category-card:hover {
          border-color: var(--accent-primary);
          background: rgba(124,58,237,0.05);
          transform: translateY(-3px);
          box-shadow: var(--shadow-glow);
        }
        .category-emoji { font-size: 2rem; }
        .category-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }

        /* Features */
        .features-section { background: var(--bg-secondary); }
        .feature-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 1.75rem;
          transition: var(--transition-base);
        }
        .feature-card:hover {
          border-color: var(--border-primary);
          box-shadow: var(--shadow-glow);
        }
        .feature-icon {
          width: 48px; height: 48px;
          background: var(--gradient-primary);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: white;
          margin-bottom: 1rem;
        }
        .feature-title { font-size: 1rem; margin-bottom: 0.5rem; }
        .feature-desc { font-size: 0.875rem; color: var(--text-muted); line-height: 1.6; }

        /* Creator Card */
        .creator-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          text-align: center;
          transition: var(--transition-base);
          display: block;
          position: relative;
        }
        .creator-card:hover {
          border-color: var(--border-primary);
          transform: translateY(-4px);
          box-shadow: var(--shadow-glow);
        }
        .creator-rank {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border-radius: var(--radius-full);
          padding: 0.2rem 0.5rem;
        }
        .creator-avatar-wrap { display: flex; justify-content: center; margin-bottom: 0.75rem; }
        .creator-name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .creator-nfts { font-size: 0.78rem; color: var(--text-muted); }

        /* CTA */
        .cta-section { padding: 4rem 0; }
        .cta-card {
          background: var(--gradient-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          padding: 4rem 2rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-card h2 { margin-bottom: 0.75rem; }
        .cta-card p { color: var(--text-secondary); font-size: 1.05rem; }

        @media (max-width: 1024px) {
          .hero-content { grid-template-columns: 1fr; gap: 2rem; padding: 2rem 1.5rem; }
          .hero-visual { display: none; }
        }
        @media (max-width: 640px) {
          .hero-actions { flex-direction: column; }
          .hero-actions .btn { width: 100%; justify-content: center; }
          .category-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </>
  );
};

export default Home;
