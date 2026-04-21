import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiUsers, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import { MdVerified } from 'react-icons/md';
import { SiEthereum } from 'react-icons/si';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserCard = ({ user, currentUser, onFollowChange }) => {
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(
    user.followers?.some(f => (typeof f === 'object' ? f._id : f) === currentUser?._id)
  );
  const [followerCount, setFollowerCount] = useState(user.followers?.length || 0);
  const [loading, setLoading] = useState(false);
  const isOwn = currentUser?._id === user._id;

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Sign in to follow users'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`/api/users/${user._id}/follow`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      setFollowing(res.data.following);
      setFollowerCount(res.data.followerCount);
      onFollowChange?.(user._id, res.data.following);
      toast.success(res.data.following ? `Following ${user.username}` : `Unfollowed ${user.username}`);
    } catch {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="people-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/profile/${user.username}`} className="people-card-link">
        <div className="people-avatar-wrap">
          <div className="avatar-placeholder" style={{ width: 72, height: 72, fontSize: '1.6rem' }}>
            {user.avatar
              ? <img src={user.avatar} alt={user.username} className="avatar" style={{ width: 72, height: 72 }} />
              : user.username[0].toUpperCase()}
          </div>
          {user.isVerified && (
            <div className="people-verified"><MdVerified size={16} /></div>
          )}
        </div>
        <div className="people-info">
          <h3 className="people-name">{user.username}</h3>
          {user.bio && <p className="people-bio">{user.bio.slice(0, 70)}{user.bio.length > 70 ? '…' : ''}</p>}
          <div className="people-stats">
            <span><strong>{user.nftsCreated || 0}</strong> NFTs</span>
            <span><strong>{followerCount}</strong> Followers</span>
            {user.totalEarnings > 0 && (
              <span><SiEthereum size={10} style={{ color: '#7c3aed' }} /> {parseFloat(user.totalEarnings).toFixed(3)}</span>
            )}
          </div>
        </div>
      </Link>
      {!isOwn && (
        <button
          className={`btn btn-sm ${following ? 'btn-secondary' : 'btn-primary'} people-follow-btn`}
          onClick={handleFollow}
          disabled={loading}
        >
          {following ? <FiUserCheck size={14} /> : <FiUserPlus size={14} />}
          {loading ? '...' : following ? 'Following' : 'Follow'}
        </button>
      )}
    </motion.div>
  );
};

const People = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async (q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 16, ...(q && { search: q }) });
      const res = await axios.get(`/api/users?${params}`);
      setUsers(res.data.users || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(search);
  };

  return (
    <>
      <Helmet>
        <title>People — MemeVault</title>
        <meta name="description" content="Discover and follow meme NFT creators on MemeVault." />
      </Helmet>

      <div style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div className="people-header">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1>👥 Discover <span className="gradient-text">Creators</span></h1>
              <p>Find and follow talented meme artists from around the world.
                {total > 0 && <span className="badge badge-primary" style={{ marginLeft: 8 }}>{total} Creators</span>}
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem' }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ maxWidth: 480, marginBottom: '2rem' }}>
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search creators by name or bio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ marginLeft: 8, flexShrink: 0 }}>Search</button>
            </div>
          </form>

          {/* Grid */}
          {loading ? (
            <div className="people-grid">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="people-card">
                  <div className="skeleton" style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="skeleton" style={{ height: 16, width: '50%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="people-grid">
              {users.map((u, i) => (
                <UserCard key={u._id} user={u} currentUser={currentUser} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><FiUsers size={48} /></div>
              <h3>No creators found</h3>
              <p>Try a different search term.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1).map(pg => (
                <button key={pg} className={`page-btn ${pg === page ? 'active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .people-header {
          background: linear-gradient(180deg, rgba(236,72,153,0.08) 0%, transparent 100%);
          padding: 3rem 0 2rem;
          border-bottom: 1px solid var(--border-secondary);
        }
        .people-header h1 { margin-bottom: 0.5rem; }
        .people-header p { color: var(--text-secondary); }
        .people-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .people-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: var(--transition-base);
          position: relative;
        }
        .people-card:hover {
          border-color: rgba(236,72,153,0.3);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .people-card-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 0;
        }
        .people-avatar-wrap { position: relative; flex-shrink: 0; }
        .people-verified {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--bg-primary);
          border-radius: 50%;
          color: var(--accent-cyan);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        }
        .people-info { flex: 1; min-width: 0; }
        .people-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .people-bio {
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-bottom: 0.35rem;
        }
        .people-stats {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          flex-wrap: wrap;
        }
        .people-stats span { display: flex; align-items: center; gap: 0.2rem; }
        .people-stats strong { color: var(--text-primary); font-weight: 700; }
        .people-follow-btn { flex-shrink: 0; }
      `}</style>
    </>
  );
};

export default People;
