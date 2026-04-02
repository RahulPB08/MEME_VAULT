import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGrid, FiList, FiPlusCircle, FiTag, FiTrendingUp, FiHeart } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import NFTCard from '../components/NFTCard';

const StatCard = ({ icon, label, value, color }) => (
  <div className="dash-stat">
    <div className="dash-stat-icon" style={{ background: color }}>{icon}</div>
    <div>
      <p className="dash-stat-value">{value}</p>
      <p className="dash-stat-label">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { account, isConnected, connectWallet } = useWeb3();
  const [tab, setTab] = useState('created');
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchNFTs();
  }, [isAuthenticated, tab]);

  const fetchNFTs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/users/${user._id}/nfts?type=${tab}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      setNfts(res.data.nfts || []);
    } catch {
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      axios.get('/api/offers/received', { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } })
        .then(r => setOffers(r.data.offers || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const stats = [
    { icon: <FiPlusCircle />, label: 'NFTs Created', value: user?.nftsCreated || 0, color: 'var(--gradient-primary)' },
    { icon: <FiTrendingUp />, label: 'Total Earnings', value: `${(user?.totalEarnings || 0).toFixed(4)} ETH`, color: 'linear-gradient(135deg, #10b981, #059669)' },
    { icon: <FiHeart />, label: 'Followers', value: user?.followers?.length || 0, color: 'linear-gradient(135deg, #ec4899, #be185d)' },
    { icon: <FiTag />, label: 'NFTs Sold', value: user?.nftsSold || 0, color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  ];

  return (
    <>
      <Helmet><title>Dashboard — MemeVault</title></Helmet>
      <div style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div className="container">
          {/* Profile Header */}
          <motion.div className="dash-profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="dash-cover">
              <div className="dash-cover-gradient" />
            </div>
            <div className="dash-profile-content">
              <div className="dash-avatar">
                <div className="avatar-placeholder" style={{ width: 96, height: 96, fontSize: '2rem', border: '4px solid var(--bg-primary)' }}>
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user?.username} className="avatar" style={{ width: 96, height: 96 }} />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
              </div>
              <div className="dash-user-info">
                <h2 className="dash-username">
                  {user?.username}
                  {user?.isVerified && <MdVerified style={{ color: 'var(--accent-cyan)', marginLeft: 6 }} />}
                </h2>
                <p className="dash-bio">{user?.bio || 'No bio yet'}</p>
                {account && (
                  <p className="dash-wallet">
                    <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                    {account.slice(0, 10)}...{account.slice(-8)}
                  </p>
                )}
              </div>
              <div className="dash-actions">
                <Link to="/create" className="btn btn-primary">
                  <FiPlusCircle /> Create NFT
                </Link>
                {!isConnected && (
                  <button className="btn btn-outline" onClick={connectWallet}>
                    <SiEthereum size={14} /> Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="dash-stats-row">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </div>

          {/* Received Offers */}
          {offers.length > 0 && (
            <div className="dash-offers-section">
              <h3>🤝 Received Offers ({offers.length})</h3>
              <div className="offers-grid">
                {offers.map(offer => (
                  <div key={offer._id} className="offer-card">
                    <div className="offer-nft-thumb">
                      <img src={offer.nft?.image || ''} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{offer.nft?.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>from {offer.buyer?.username}</p>
                    </div>
                    <div className="price-tag">
                      <SiEthereum size={11} style={{ color: '#7c3aed' }} />
                      {offer.amountEth || (offer.amount / 1e18).toFixed(4)} ETH
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NFT Tabs */}
          <div className="tabs" style={{ maxWidth: 400, marginBottom: '2rem' }}>
            {['created', 'owned'].map(t => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
                {t === 'created' ? '🎨 Created' : '👜 Owned'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="nft-card">
                  <div className="skeleton" style={{ aspectRatio: '1', width: '100%' }} />
                  <div style={{ padding: '1rem', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : nfts.length > 0 ? (
            <div className="grid-4">
              {nfts.map((nft, i) => <NFTCard key={nft._id} nft={nft} index={i} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">{tab === 'created' ? '🎨' : '👜'}</div>
              <h3>No {tab} NFTs yet</h3>
              {tab === 'created' && <Link to="/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Your First NFT</Link>}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .dash-profile {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-xl);
          overflow: hidden;
          margin-bottom: 2rem;
        }
        .dash-cover {
          height: 140px;
          position: relative;
          overflow: hidden;
        }
        .dash-cover-gradient {
          position: absolute;
          inset: 0;
          background: var(--gradient-primary);
          opacity: 0.3;
        }
        .dash-profile-content {
          padding: 0 2rem 2rem;
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .dash-avatar { margin-top: -48px; }
        .dash-user-info { flex: 1; padding-top: 0.5rem; }
        .dash-username { font-size: 1.5rem; display: flex; align-items: center; margin-bottom: 0.3rem; }
        .dash-bio { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.3rem; }
        .dash-wallet { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem; font-family: monospace; }
        .dash-actions { display: flex; gap: 0.75rem; align-self: flex-end; flex-wrap: wrap; }
        .dash-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .dash-stat {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: var(--transition-base);
        }
        .dash-stat:hover { border-color: var(--border-primary); transform: translateY(-2px); }
        .dash-stat-icon {
          width: 44px; height: 44px;
          border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1.1rem;
          flex-shrink: 0;
        }
        .dash-stat-value { font-weight: 800; font-family: var(--font-secondary); font-size: 1.3rem; color: var(--text-primary); }
        .dash-stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .dash-offers-section { margin-bottom: 2rem; }
        .dash-offers-section h3 { margin-bottom: 1rem; font-size: 1.1rem; }
        .offers-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .offer-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 0.875rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        @media (max-width: 1024px) { .dash-stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) {
          .dash-stats-row { grid-template-columns: 1fr; }
          .dash-profile-content { flex-direction: column; align-items: flex-start; }
          .dash-actions { align-self: flex-start; }
        }
      `}</style>
    </>
  );
};

export default Dashboard;
