import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGrid, FiHeart, FiUsers, FiShare2 } from 'react-icons/fi';
import { MdVerified } from 'react-icons/md';
import { SiEthereum } from 'react-icons/si';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import axios from 'axios';
import NFTCard from '../components/NFTCard';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { identifier } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('created');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/users/${identifier}`);
        setProfile(res.data.user);
        setNfts(res.data.createdNFTs || []);
        setFollowerCount(res.data.user.followers?.length || 0);
        setFollowing(res.data.user.followers?.some(f => f._id === currentUser?._id));
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [identifier, currentUser]);

  useEffect(() => {
    if (!profile) return;
    const fetchNFTs = async () => {
      try {
        const res = await axios.get(`/api/users/${profile._id}/nfts?type=${tab}`);
        setNfts(res.data.nfts || []);
      } catch { setNfts([]); }
    };
    fetchNFTs();
  }, [tab, profile]);

  const handleFollow = async () => {
    if (!isAuthenticated) { 
      toast.error('Please sign in to follow users');
      return; 
    }
    setFollowLoading(true);
    try {
      const res = await axios.post(`/api/users/${profile._id}/follow`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      setFollowing(res.data.following);
      setFollowerCount(res.data.followerCount);
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied! 📋');
  };

  if (loading) return <div className="page-loader" style={{ paddingTop: '5rem' }}><div className="spinner" /></div>;
  if (!profile) return (
    <div className="empty-state" style={{ paddingTop: '8rem' }}>
      <div className="empty-icon">👤</div>
      <h3>User not found</h3>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>The profile you are looking for does not exist.</p>
    </div>
  );

  const isOwnProfile = currentUser?._id === profile._id;

  return (
    <>
      <Helmet>
        <title>{profile.username} — MemeVault</title>
        <meta name="description" content={profile.bio || `${profile.username}'s profile on MemeVault`} />
      </Helmet>

      <div style={{ paddingTop: '4.5rem', paddingBottom: '6rem', minHeight: '100vh' }}>
        {/* Dynamic Cover Section */}
        <div className="premium-cover">
          <div className="mesh-gradient-bg" />
          <div className="cover-glass-overlay" />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div 
            className="premium-profile-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="profile-top-actions">
              <button className="btn btn-icon btn-ghost" onClick={handleShare}>
                <FiShare2 size={18} />
              </button>
            </div>

            <div className="premium-avatar-wrapper">
              <div className="premium-avatar-ring">
                <div className="avatar-placeholder premium-avatar">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.username} />
                  ) : (
                    profile.username[0].toUpperCase()
                  )}
                </div>
              </div>
              {profile.isVerified && (
                <div className="premium-verified-badge">
                  <MdVerified size={18} />
                </div>
              )}
            </div>

            <div className="premium-profile-info">
              <h1 className="premium-username">{profile.username}</h1>
              
              {profile.walletAddress && (
                <div className="premium-wallet-pill">
                  <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                  <span>{profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-6)}</span>
                </div>
              )}

              <p className="premium-bio">
                {profile.bio || 'This creator is keeping an aura of mystery. No bio provided yet.'}
              </p>

              <div className="premium-stats-grid">
                <div className="premium-stat-box">
                  <span className="stat-val gradient-text">{profile.nftsCreated || 0}</span>
                  <span className="stat-lbl">Created</span>
                </div>
                <div className="premium-stat-box">
                  <span className="stat-val">{followerCount}</span>
                  <span className="stat-lbl">Followers</span>
                </div>
                <div className="premium-stat-box">
                  <span className="stat-val">{profile.following?.length || 0}</span>
                  <span className="stat-lbl">Following</span>
                </div>
              </div>

              {!isOwnProfile && isAuthenticated && (
                <button
                  className={`btn btn-xl premium-follow-btn ${following ? 'following' : ''}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  <FiUsers size={16} />
                  {following ? 'Following' : 'Follow Creator'}
                </button>
              )}
              {!isAuthenticated && !isOwnProfile && (
                <button className="btn btn-outline btn-xl" style={{ marginTop: '1.5rem', width: '100%', maxWidth: '280px' }} onClick={() => toast('Sign in to follow', { icon: '🔐' })}>
                  Follow
                </button>
              )}
            </div>
          </motion.div>

          {/* Premium Tabs */}
          <div className="premium-tabs-container">
            <div className="premium-tabs">
              <button 
                className={`premium-tab ${tab === 'created' ? 'active' : ''}`} 
                onClick={() => setTab('created')}
              >
                <FiGrid size={16} /> Created
              </button>
              <button 
                className={`premium-tab ${tab === 'owned' ? 'active' : ''}`} 
                onClick={() => setTab('owned')}
              >
                <FiHeart size={16} /> Owned
              </button>
              <div 
                className="premium-tab-indicator" 
                style={{ transform: `translateX(${tab === 'created' ? '0' : '100%'})` }} 
              />
            </div>
          </div>

          {/* Grid Content */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {nfts.length > 0 ? (
              <div className="grid-4" style={{ marginTop: '2rem' }}>
                {nfts.map((nft, i) => <NFTCard key={nft._id} nft={nft} index={i} />)}
              </div>
            ) : (
              <div className="premium-empty-state">
                <div className="premium-empty-icon">{tab === 'created' ? '🎨' : '👜'}</div>
                <h3>Nothing to see here yet</h3>
                <p>This user hasn't {tab} any NFTs exactly right now.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <style>{`
        /* Premium Background Mesh */
        .premium-cover {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 480px;
          overflow: hidden;
          z-index: 0;
        }
        .mesh-gradient-bg {
          position: absolute;
          inset: -20%;
          background: radial-gradient(circle at 50% 0%, rgba(124,58,237,0.25) 0%, transparent 50%),
                      radial-gradient(circle at 100% 0%, rgba(236,72,153,0.15) 0%, transparent 50%),
                      radial-gradient(circle at 0% 50%, rgba(16,185,129,0.1) 0%, transparent 50%);
          filter: blur(60px);
          animation: floatGradient 20s ease-in-out infinite alternate;
        }
        @keyframes floatGradient {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.05) translate(2%, 5%); }
          100% { transform: scale(1) translate(-2%, -5%); }
        }
        .cover-glass-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 0%, var(--bg-primary) 100%);
        }

        /* Glassmorphic Profile Card */
        .premium-profile-card {
          margin-top: 4rem;
          background: rgba(20, 20, 28, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .profile-top-actions {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
        }

        /* Avatar Design */
        .premium-avatar-wrapper {
          position: relative;
          margin-top: -6rem;
          margin-bottom: 1.5rem;
        }
        .premium-avatar-ring {
          padding: 6px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-pink));
          border-radius: 50%;
          box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
        }
        .premium-avatar {
          width: 140px;
          height: 140px;
          font-size: 3.5rem;
          background: var(--bg-primary);
          border: 4px solid var(--bg-card);
          border-radius: 50%;
          overflow: hidden;
        }
        .premium-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .premium-verified-badge {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: var(--bg-card);
          border-radius: 50%;
          padding: 4px;
          color: var(--accent-cyan);
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Profile Info */
        .premium-profile-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 600px;
        }
        .premium-username {
          font-family: var(--font-secondary);
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }
        .premium-wallet-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
          padding: 0.4rem 1rem;
          border-radius: 100px;
          font-family: monospace;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          transition: var(--transition-base);
        }
        .premium-wallet-pill:hover {
          background: rgba(124, 58, 237, 0.15);
          color: var(--text-primary);
        }
        .premium-bio {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 2.5rem;
          font-weight: 400;
        }

        /* Stats Grid */
        .premium-stats-grid {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          width: 100%;
          justify-content: center;
        }
        .premium-stat-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 1.25rem 2rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
          transition: var(--transition-base);
        }
        .premium-stat-box:hover {
          background: rgba(255,255,255,0.04);
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.1);
        }
        .stat-val {
          font-family: var(--font-secondary);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.2rem;
        }
        .stat-lbl {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }

        /* Call to Action */
        .premium-follow-btn {
          margin-top: 0.5rem;
          width: 100%;
          max-width: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-family: var(--font-secondary);
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4);
        }
        .premium-follow-btn.following {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
          box-shadow: none;
        }
        .premium-follow-btn.following:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        /* Tabs Selection */
        .premium-tabs-container {
          display: flex;
          justify-content: center;
          margin: 3rem 0 0;
        }
        .premium-tabs {
          display: flex;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          padding: 0.35rem;
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .premium-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          z-index: 2;
          transition: var(--transition-base);
          border-radius: 100px;
        }
        .premium-tab:hover { color: var(--text-secondary); }
        .premium-tab.active { color: white; }
        .premium-tab-indicator {
          position: absolute;
          top: 0.35rem; left: 0.35rem; bottom: 0.35rem;
          width: calc(50% - 0.35rem);
          background: var(--gradient-primary);
          border-radius: 100px;
          z-index: 1;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }

        /* Empty State Premium */
        .premium-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          background: rgba(255,255,255,0.01);
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 24px;
          margin-top: 2rem;
          text-align: center;
        }
        .premium-empty-icon {
          font-size: 3.5rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
          filter: grayscale(0.5);
        }
        .premium-empty-state h3 {
          font-family: var(--font-secondary);
          font-size: 1.4rem;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }
        .premium-empty-state p {
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .premium-profile-card { padding: 2rem 1.5rem; }
          .premium-username { font-size: 2rem; }
          .premium-stats-grid { flex-wrap: wrap; }
          .premium-stat-box { min-width: 100px; padding: 1rem; }
        }
      `}</style>
    </>
  );
};

export default Profile;
