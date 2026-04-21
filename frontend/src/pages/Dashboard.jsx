import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiGrid, FiPlusCircle, FiTag, FiTrendingUp, FiHeart,
  FiShoppingBag, FiList, FiActivity, FiEdit2, FiSave, FiX,
} from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import NFTCard from '../components/NFTCard';
import { resolveImageUrl, makeGatewayFallback } from '../utils/imageUtils';

const StatCard = ({ icon, label, value, color }) => (
  <div className="dash-stat">
    <div className="dash-stat-icon" style={{ background: color }}>{icon}</div>
    <div>
      <p className="dash-stat-value">{value}</p>
      <p className="dash-stat-label">{label}</p>
    </div>
  </div>
);

const TABS = [
  { id: 'created', label: '🎨 Created', icon: <FiGrid /> },
  { id: 'owned', label: '👜 Owned', icon: <FiShoppingBag /> },
  { id: 'listed', label: '🏷️ Listed', icon: <FiTag /> },
  { id: 'activity', label: '📋 Activity', icon: <FiActivity /> },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { account, isConnected, connectWallet } = useWeb3();
  const [tab, setTab] = useState('created');
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchNFTs();
  }, [isAuthenticated, tab]);

  useEffect(() => {
    if (isAuthenticated) {
      axios.get('/api/offers/received', { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } })
        .then(r => setOffers(r.data.offers || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const fetchNFTs = async () => {
    if (tab === 'activity') { fetchActivity(); return; }
    setLoading(true);
    try {
      let url = `/api/users/${user._id}/nfts?type=${tab === 'listed' ? 'owned' : tab}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      let data = res.data.nfts || [];
      if (tab === 'listed') data = data.filter(n => n.listed);
      setNfts(data);
    } catch {
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    setLoading(true);
    try {
      // Get created NFTs and their history
      const res = await axios.get(`/api/users/${user._id}/nfts?type=created`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      const allHistory = [];
      (res.data.nfts || []).forEach(nft => {
        (nft.history || []).forEach(h => {
          allHistory.push({ ...h, nftName: nft.name, nftImage: nft.image, nftId: nft._id });
        });
      });
      allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivity(allHistory);
    } catch {
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ username: editForm.username, bio: editForm.bio });
      setEditMode(false);
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    setEditForm({ username: user?.username || '', bio: user?.bio || '' });
    setEditMode(true);
  };

  const stats = [
    { icon: <FiPlusCircle />, label: 'NFTs Created', value: user?.nftsCreated || 0, color: 'var(--gradient-primary)' },
    { icon: <FiTrendingUp />, label: 'Total Earnings', value: `${(user?.totalEarnings || 0).toFixed(4)} ETH`, color: 'linear-gradient(135deg, #10b981, #059669)' },
    { icon: <FiHeart />, label: 'Followers', value: user?.followers?.length || 0, color: 'linear-gradient(135deg, #ec4899, #be185d)' },
    { icon: <FiTag />, label: 'NFTs Sold', value: user?.nftsSold || 0, color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  ];

  const EVENT_ICONS = { mint: '✨', list: '🏷️', sale: '💰', transfer: '↔️', delist: '🚫', auction: '🔨' };

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
                  {user?.avatar
                    ? <img src={user.avatar} alt={user?.username} className="avatar" style={{ width: 96, height: 96 }} />
                    : user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
              <div className="dash-user-info">
                {editMode ? (
                  <div className="dash-edit-form">
                    <input
                      className="dash-input"
                      placeholder="Username"
                      value={editForm.username}
                      onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    />
                    <textarea
                      className="dash-input"
                      placeholder="Bio (optional)"
                      value={editForm.bio}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      rows={2}
                      style={{ resize: 'none' }}
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="dash-username">
                      {user?.username}
                      {user?.isVerified && <MdVerified style={{ color: 'var(--accent-cyan)', marginLeft: 6 }} />}
                    </h2>
                    <p className="dash-bio">{user?.bio || 'No bio yet — add one!'}</p>
                  </>
                )}
                {account && (
                  <p className="dash-wallet">
                    <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                    {account.slice(0, 10)}...{account.slice(-8)}
                  </p>
                )}
              </div>
              <div className="dash-actions">
                {editMode ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={saving}>
                      <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>
                      <FiX size={14} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={startEdit}>
                      <FiEdit2 size={14} /> Edit Profile
                    </button>
                    <Link to="/create" className="btn btn-primary btn-sm">
                      <FiPlusCircle size={14} /> Create NFT
                    </Link>
                  </>
                )}
                {!isConnected && (
                  <button className="btn btn-outline btn-sm" onClick={connectWallet}>
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
              <div className="offers-list">
                {offers.map(offer => (
                  <div key={offer._id} className="offer-card">
                    <img
                      src={resolveImageUrl(offer.nft?.image)}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                      onError={makeGatewayFallback(offer.nft?.image)}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{offer.nft?.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>from {offer.buyer?.username}</p>
                    </div>
                    <div className="price-tag">
                      <SiEthereum size={11} style={{ color: '#7c3aed' }} />
                      {offer.amountEth || (offer.amount / 1e18).toFixed(4)} ETH
                    </div>
                    <Link to={`/nft/${offer.nft?._id}`} className="btn btn-primary btn-sm">View</Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links Row */}
          <div className="dash-quick-links">
            <Link to="/collections" className="quick-link-card">
              <FiShoppingBag size={20} />
              <span>Browse & Buy NFTs</span>
            </Link>
            <Link to="/auctions" className="quick-link-card">
              <span style={{ fontSize: '1.1rem' }}>🔨</span>
              <span>Live Auctions</span>
            </Link>
            <Link to="/people" className="quick-link-card">
              <span style={{ fontSize: '1.1rem' }}>👥</span>
              <span>Discover People</span>
            </Link>
            <Link to="/explore" className="quick-link-card">
              <FiGrid size={20} />
              <span>Explore All</span>
            </Link>
          </div>

          {/* NFT Tabs */}
          <div className="tabs" style={{ maxWidth: 560, marginBottom: '2rem' }}>
            {TABS.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === 'activity' ? (
            loading ? (
              <div className="spinner" style={{ margin: '4rem auto' }} />
            ) : activity.length > 0 ? (
              <div className="activity-list">
                {activity.map((evt, i) => (
                  <motion.div key={i} className="activity-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="activity-icon">{EVENT_ICONS[evt.event] || '📄'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      {evt.nftImage && (
                        <img
                          src={resolveImageUrl(evt.nftImage)}
                          alt=""
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                          onError={makeGatewayFallback(evt.nftImage)}
                        />
                      )}
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{evt.nftName}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {evt.event}{evt.price ? ` — ${(evt.price / 1e18).toFixed(4)} ETH` : ''}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.timestamp).toLocaleDateString()}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><FiActivity size={40} /></div>
                <h3>No activity yet</h3>
                <p>Your NFT transaction history will appear here.</p>
              </div>
            )
          ) : loading ? (
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
              <div className="empty-icon">{tab === 'created' ? '🎨' : tab === 'listed' ? '🏷️' : '👜'}</div>
              <h3>No {tab} NFTs yet</h3>
              {tab === 'created'
                ? <Link to="/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Your First NFT</Link>
                : tab === 'listed'
                ? <p style={{ color: 'var(--text-muted)' }}>List NFTs from your owned collection to sell them.</p>
                : <Link to="/collections" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse & Buy NFTs</Link>
              }
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
        .dash-cover { height: 140px; position: relative; overflow: hidden; }
        .dash-cover-gradient {
          position: absolute; inset: 0;
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
        .dash-user-info { flex: 1; padding-top: 0.5rem; min-width: 200px; }
        .dash-username { font-size: 1.5rem; display: flex; align-items: center; margin-bottom: 0.3rem; }
        .dash-bio { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.3rem; }
        .dash-wallet { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem; font-family: monospace; }
        .dash-actions { display: flex; gap: 0.75rem; align-self: flex-end; flex-wrap: wrap; }
        .dash-edit-form { display: flex; flex-direction: column; gap: 0.5rem; max-width: 360px; }
        .dash-input {
          background: var(--bg-secondary);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 0.5rem 0.75rem;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          font-family: var(--font-primary);
          transition: var(--transition-fast);
        }
        .dash-input:focus { border-color: var(--accent-primary); }
        .dash-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
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
          color: white; font-size: 1.1rem; flex-shrink: 0;
        }
        .dash-stat-value { font-weight: 800; font-family: var(--font-secondary); font-size: 1.3rem; color: var(--text-primary); }
        .dash-stat-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .dash-offers-section { margin-bottom: 1.5rem; }
        .dash-offers-section h3 { margin-bottom: 0.75rem; font-size: 1rem; }
        .offers-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .offer-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .dash-quick-links {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .quick-link-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          transition: var(--transition-base);
        }
        .quick-link-card:hover {
          border-color: var(--accent-primary);
          color: var(--text-primary);
          background: rgba(124,58,237,0.05);
          transform: translateY(-2px);
        }
        .activity-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .activity-row {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 0.875rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: var(--transition-fast);
        }
        .activity-row:hover { border-color: var(--border-primary); }
        .activity-icon {
          width: 36px; height: 36px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .dash-stats-row { grid-template-columns: repeat(2, 1fr); }
          .dash-quick-links { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .dash-stats-row { grid-template-columns: 1fr; }
          .dash-quick-links { grid-template-columns: repeat(2, 1fr); }
          .dash-profile-content { flex-direction: column; align-items: flex-start; }
          .dash-actions { align-self: flex-start; }
        }
      `}</style>
    </>
  );
};

export default Dashboard;
