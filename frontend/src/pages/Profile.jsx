import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGrid, FiHeart, FiUsers } from 'react-icons/fi';
import { MdVerified } from 'react-icons/md';
import { SiEthereum } from 'react-icons/si';
import { Helmet } from 'react-helmet-async';
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
    if (!isAuthenticated) { return; }
    setFollowLoading(true);
    try {
      const res = await axios.post(`/api/users/${profile._id}/follow`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      setFollowing(res.data.following);
      setFollowerCount(res.data.followerCount);
    } catch {} finally {
      setFollowLoading(false);
    }
  };

  if (loading) return <div className="page-loader" style={{ paddingTop: '5rem' }}><div className="spinner" /></div>;
  if (!profile) return (
    <div className="empty-state" style={{ paddingTop: '8rem' }}>
      <div className="empty-icon">👤</div>
      <h3>User not found</h3>
    </div>
  );

  const isOwnProfile = currentUser?._id === profile._id;

  return (
    <>
      <Helmet>
        <title>{profile.username} — MemeVault</title>
        <meta name="description" content={profile.bio || `${profile.username}'s profile on MemeVault`} />
      </Helmet>

      <div style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
        {/* Cover */}
        <div className="profile-cover">
          <div className="profile-cover-bg" />
        </div>

        <div className="container">
          <div className="profile-header">
            <div className="profile-avatar-wrap">
              <div className="avatar-placeholder" style={{ width: 120, height: 120, fontSize: '2.5rem', border: '4px solid var(--bg-primary)', marginTop: '-60px' }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="avatar" style={{ width: 120, height: 120 }} />
                ) : (
                  profile.username[0].toUpperCase()
                )}
              </div>
            </div>

            <div className="profile-info">
              <h1 className="profile-username">
                {profile.username}
                {profile.isVerified && <MdVerified style={{ color: 'var(--accent-cyan)', marginLeft: 8 }} />}
              </h1>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              {profile.walletAddress && (
                <p className="profile-wallet">
                  <SiEthereum size={12} style={{ color: '#7c3aed' }} />
                  {profile.walletAddress.slice(0, 12)}...{profile.walletAddress.slice(-8)}
                </p>
              )}
              <div className="profile-stats">
                <div className="profile-stat"><strong>{profile.nftsCreated || 0}</strong><span>Created</span></div>
                <div className="profile-stat"><strong>{followerCount}</strong><span>Followers</span></div>
                <div className="profile-stat"><strong>{profile.following?.length || 0}</strong><span>Following</span></div>
              </div>
            </div>

            {!isOwnProfile && isAuthenticated && (
              <button
                className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                <FiUsers size={14} />
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs" style={{ maxWidth: 360, margin: '2rem 0 1.5rem' }}>
            <button className={`tab ${tab === 'created' ? 'active' : ''}`} onClick={() => setTab('created')}>🎨 Created</button>
            <button className={`tab ${tab === 'owned' ? 'active' : ''}`} onClick={() => setTab('owned')}>👜 Owned</button>
          </div>

          {nfts.length > 0 ? (
            <div className="grid-4">
              {nfts.map((nft, i) => <NFTCard key={nft._id} nft={nft} index={i} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">{tab === 'created' ? '🎨' : '👜'}</div>
              <h3>No {tab} NFTs yet</h3>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .profile-cover {
          height: 200px;
          position: relative;
          overflow: hidden;
          background: var(--bg-secondary);
        }
        .profile-cover-bg {
          position: absolute;
          inset: 0;
          background: var(--gradient-primary);
          opacity: 0.2;
        }
        .profile-header {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-secondary);
        }
        .profile-avatar-wrap { flex-shrink: 0; }
        .profile-info { flex: 1; padding-top: 1rem; }
        .profile-username { font-size: 1.75rem; display: flex; align-items: center; margin-bottom: 0.5rem; }
        .profile-bio { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem; }
        .profile-wallet { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem; font-family: monospace; margin-bottom: 0.75rem; }
        .profile-stats { display: flex; gap: 1.5rem; }
        .profile-stat { display: flex; flex-direction: column; }
        .profile-stat strong { font-size: 1.1rem; font-weight: 800; font-family: var(--font-secondary); color: var(--text-primary); }
        .profile-stat span { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>
    </>
  );
};

export default Profile;
