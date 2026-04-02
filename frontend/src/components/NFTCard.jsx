import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiHeart, FiEye, FiTag } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import toast from 'react-hot-toast';
import axios from 'axios';

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect fill="%23111118" width="400" height="400"/><text fill="%237c3aed" font-size="80" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle">🎭</text></svg>';

const CATEGORY_COLORS = {
  trending: 'badge-gold',
  dank: 'badge-pink',
  crypto: 'badge-primary',
  wholesome: 'badge-green',
  classic: 'badge-primary',
  gaming: 'badge-primary',
  anime: 'badge-pink',
  other: 'badge-primary',
};

const NFTCard = ({ nft, onBuy, index = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const { isConnected, buyNFT } = useWeb3();
  const [liked, setLiked] = useState(nft?.likes?.includes(user?._id));
  const [likeCount, setLikeCount] = useState(nft?.likeCount || nft?.likes?.length || 0);
  const [buying, setBuying] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Please sign in to like NFTs'); return; }
    try {
      const res = await axios.post(`/api/nfts/${nft._id}/like`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch { toast.error('Failed to like'); }
  };

  const handleBuy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isConnected) { toast.error('Connect your wallet first!'); return; }
    if (!isAuthenticated) { toast.error('Please sign in first!'); return; }
    if (onBuy) { onBuy(nft); return; }
    setBuying(true);
    try {
      const receipt = await buyNFT(nft.tokenId, nft.price);
      toast.success('NFT purchased! 🎉');
    } catch (e) {
      toast.error(e.message || 'Transaction failed');
    } finally {
      setBuying(false);
    }
  };

  const priceEth = nft.priceInEth || (nft.price ? (nft.price / 1e18).toFixed(4) : '0');
  const categoryBadge = CATEGORY_COLORS[nft.category] || 'badge-primary';
  const isOwner = user?._id === (nft?.owner?._id || nft?.owner);

  return (
    <motion.div
      className="nft-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -6 }}
    >
      <Link to={`/nft/${nft._id}`} style={{ display: 'block', position: 'relative' }}>
        <div className="nft-img-wrap">
          <img
            src={nft.image || PLACEHOLDER_IMG}
            alt={nft.name}
            className="nft-card-image"
            onError={e => { e.target.src = PLACEHOLDER_IMG; }}
          />
          <div className="nft-card-overlay" />
          {/* Category Badge */}
          <div className="nft-card-badge">
            <span className={`badge ${categoryBadge}`}>{nft.category}</span>
          </div>
          {/* Like Button */}
          <button className={`nft-like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
            <FiHeart fill={liked ? 'currentColor' : 'none'} size={14} />
            <span>{likeCount}</span>
          </button>
        </div>
      </Link>

      <div className="nft-card-body">
        {/* Creator */}
        <div className="nft-creator">
          <div className="avatar-placeholder" style={{ width: 24, height: 24, fontSize: '0.7rem' }}>
            {nft.creator?.avatar ? (
              <img src={nft.creator.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              nft.creator?.username?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <span className="creator-name">
            {nft.creator?.username || 'Unknown'}
            {nft.creator?.isVerified && <MdVerified className="verified-icon" size={12} />}
          </span>
        </div>

        {/* Name */}
        <Link to={`/nft/${nft._id}`} className="nft-name">{nft.name}</Link>

        {/* Price & Actions */}
        <div className="nft-footer">
          <div className="nft-price-wrap">
            <span className="nft-price-label">Price</span>
            <div className="price-tag">
              <SiEthereum size={12} style={{ color: '#7c3aed' }} />
              <span className="nft-price-value">{parseFloat(priceEth).toFixed(4)} ETH</span>
            </div>
          </div>

          <div className="nft-stats">
            <span><FiEye size={12} /> {nft.views || 0}</span>
          </div>
        </div>

        {/* Action Button */}
        {nft.listed && !isOwner && (
          <button
            className="btn btn-primary btn-sm nft-buy-btn"
            onClick={handleBuy}
            disabled={buying}
          >
            <FiTag size={13} />
            {buying ? 'Processing...' : 'Buy Now'}
          </button>
        )}
        {nft.onAuction && (
          <Link to={`/auction/${nft.auctionId}`} className="btn btn-outline btn-sm nft-buy-btn">
            🔨 Place Bid
          </Link>
        )}
        {isOwner && (
          <Link to={`/dashboard`} className="btn btn-secondary btn-sm nft-buy-btn">
            Manage
          </Link>
        )}
      </div>

      <style>{`
        .nft-img-wrap {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          background: var(--bg-secondary);
        }
        .nft-card-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 2;
        }
        .nft-like-btn {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          z-index: 2;
          background: rgba(10,10,15,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: var(--radius-sm);
          padding: 0.3rem 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .nft-like-btn:hover, .nft-like-btn.liked {
          color: #ef4444;
          border-color: rgba(239,68,68,0.3);
        }
        .nft-card-body { padding: 1rem; }
        .nft-creator {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.5rem;
        }
        .creator-name {
          font-size: 0.78rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }
        .nft-name {
          display: block;
          font-family: var(--font-secondary);
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: var(--transition-fast);
        }
        .nft-name:hover { color: var(--accent-secondary); }
        .nft-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 0.75rem;
        }
        .nft-price-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          display: block;
          margin-bottom: 0.15rem;
        }
        .nft-price-value {
          font-weight: 700;
          font-size: 0.9rem;
          font-family: var(--font-secondary);
        }
        .nft-stats {
          display: flex;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          align-items: center;
        }
        .nft-stats span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .nft-buy-btn {
          width: 100%;
          justify-content: center;
          font-size: 0.82rem;
        }
      `}</style>
    </motion.div>
  );
};

export default NFTCard;
