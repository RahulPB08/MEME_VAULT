import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiTrendingUp } from 'react-icons/fi';
import { FaHammer } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import Countdown from 'react-countdown';

const AuctionCard = ({ auction, index }) => {
  const endTime = new Date(auction.endTime);
  const isActive = !auction.ended && !auction.cancelled && endTime > new Date();

  const CountdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) return <span style={{ color: 'var(--accent-red)' }}>Auction Ended</span>;
    return (
      <div className="countdown">
        {days > 0 && (
          <div className="countdown-unit">
            <span className="countdown-value">{days}</span>
            <span className="countdown-label">d</span>
          </div>
        )}
        <div className="countdown-unit">
          <span className="countdown-value">{String(hours).padStart(2, '0')}</span>
          <span className="countdown-label">h</span>
        </div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(minutes).padStart(2, '0')}</span>
          <span className="countdown-label">m</span>
        </div>
        <div className="countdown-unit">
          <span className="countdown-value">{String(seconds).padStart(2, '0')}</span>
          <span className="countdown-label">s</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="auction-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
    >
      <Link to={`/auction/${auction._id}`}>
        <div className="auction-img-wrap">
          <img
            src={auction.nft?.image || 'https://placehold.co/400x400/111118/7c3aed?text=🔨'}
            alt={auction.nft?.name}
            className="auction-img"
            onError={e => { e.target.src = 'https://placehold.co/400x400/111118/7c3aed?text=🔨'; }}
          />
          <div className="auction-status-badge">
            {isActive ? <span className="badge badge-green">🟢 Live</span> : <span className="badge badge-red">Ended</span>}
          </div>
        </div>
        <div className="auction-body">
          <p className="auction-nft-name">{auction.nft?.name || 'Meme NFT'}</p>
          <div className="auction-seller">
            <FaHammer size={12} />
            <span>by {auction.seller?.username || 'Unknown'}</span>
          </div>

          <div className="auction-bids-row">
            <div className="auction-price-col">
              <span className="auction-label">Highest Bid</span>
              <div className="price-tag">
                <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                <span>{auction.highestBidEth || (auction.highestBid ? (parseFloat(auction.highestBid) / 1e18).toFixed(4) : '—')} ETH</span>
              </div>
            </div>
            <div className="auction-price-col">
              <span className="auction-label">Start Price</span>
              <div className="price-tag" style={{ color: 'var(--text-muted)' }}>
                <SiEthereum size={12} style={{ color: 'var(--text-muted)' }} />
                <span>{auction.startingPriceEth || (parseFloat(auction.startingPrice || 0) / 1e18).toFixed(4)} ETH</span>
              </div>
            </div>
          </div>

          <div className="auction-timer">
            <FiClock size={13} style={{ color: 'var(--accent-secondary)' }} />
            {isActive ? (
              <Countdown date={endTime} renderer={CountdownRenderer} />
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {auction.cancelled ? 'Cancelled' : 'Auction Ended'}
              </span>
            )}
          </div>

          <div className="auction-bids-count">
            <FiTrendingUp size={12} />
            {auction.bids?.length || 0} bids
          </div>
        </div>
      </Link>

      <style>{`
        .auction-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: var(--transition-base);
          cursor: pointer;
        }
        .auction-card:hover {
          border-color: rgba(168,85,247,0.4);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(168,85,247,0.2);
        }
        .auction-img-wrap { position: relative; overflow: hidden; aspect-ratio: 1; }
        .auction-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .auction-card:hover .auction-img { transform: scale(1.05); }
        .auction-status-badge { position: absolute; top: 0.75rem; left: 0.75rem; }
        .auction-body { padding: 1rem; }
        .auction-nft-name { font-weight: 700; font-family: var(--font-secondary); margin-bottom: 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .auction-seller { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.75rem; }
        .auction-bids-row { display: flex; gap: 0; margin-bottom: 0.75rem; }
        .auction-price-col { flex: 1; }
        .auction-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; display: block; margin-bottom: 0.25rem; }
        .auction-timer { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .auction-bids-count { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem; }
      `}</style>
    </motion.div>
  );
};

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/auctions?status=${status}&page=${page}&limit=12`);
        setAuctions(res.data.auctions || []);
        setTotalPages(res.data.pagination?.pages || 1);
      } catch {
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [status, page]);

  return (
    <>
      <Helmet>
        <title>Live Auctions — MemeVault</title>
        <meta name="description" content="Bid on exclusive meme NFTs in live auctions." />
      </Helmet>

      <div style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
        <div className="auction-page-header">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1>🔨 Live <span className="gradient-text">Auctions</span></h1>
              <p>Bid on rare meme NFTs with real-time English auctions. Anti-snipe protection included.</p>
            </motion.div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem' }}>
          <div className="tabs" style={{ maxWidth: 400, marginBottom: '2rem' }}>
            {['active', 'ended', 'cancelled'].map(s => (
              <button
                key={s}
                className={`tab ${status === s ? 'active' : ''}`}
                onClick={() => { setStatus(s); setPage(1); }}
                style={{ textTransform: 'capitalize' }}
              >
                {s === 'active' ? '🟢 Active' : s === 'ended' ? '✅ Ended' : '❌ Cancelled'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="nft-card">
                  <div className="skeleton" style={{ aspectRatio: '1', width: '100%' }} />
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 18, width: '50%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : auctions.length > 0 ? (
            <div className="grid-4">
              {auctions.map((auction, i) => (
                <AuctionCard key={auction._id} auction={auction} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔨</div>
              <h3>No {status} auctions</h3>
              <p>Check back later or create your own auction!</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(pg => (
                <button key={pg} className={`page-btn ${pg === page ? 'active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .auction-page-header {
          background: linear-gradient(180deg, rgba(168,85,247,0.08) 0%, transparent 100%);
          padding: 3rem 0 2rem;
          border-bottom: 1px solid var(--border-secondary);
        }
        .auction-page-header h1 { margin-bottom: 0.5rem; }
        .auction-page-header p { color: var(--text-secondary); }
      `}</style>
    </>
  );
};

export default Auctions;
