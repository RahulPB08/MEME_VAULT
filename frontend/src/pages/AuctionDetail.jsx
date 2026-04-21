import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiTrendingUp, FiAlertCircle, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { FaHammer } from 'react-icons/fa';
import { SiEthereum } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';
import { Helmet } from 'react-helmet-async';
import Countdown from 'react-countdown';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';

const AuctionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { account, isConnected, placeBid: web3PlaceBid, formatEth, parseEth } = useWeb3();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [ending, setEnding] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAuction();
  }, [id]);

  const fetchAuction = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/auctions/${id}`);
      setAuction(res.data.auction);
    } catch {
      toast.error('Auction not found');
      navigate('/auctions');
    } finally {
      setLoading(false);
    }
  };

  const isActive = auction && !auction.ended && !auction.cancelled && new Date(auction.endTime) > new Date();
  const isSeller = user?._id === (auction?.seller?._id || auction?.seller);
  const minBidEth = auction?.highestBid > 0
    ? formatEth(BigInt(auction.highestBid) + 1n)
    : auction?.startingPriceEth || formatEth(auction?.startingPrice || 0);

  const handleBid = async () => {
    if (!isConnected) { toast.error('Connect your wallet first'); return; }
    if (!isAuthenticated) { toast.error('Sign in to bid'); return; }
    if (!bidAmount || isNaN(bidAmount) || parseFloat(bidAmount) <= 0) {
      toast.error('Enter a valid bid amount'); return;
    }
    const bidWei = parseEth(bidAmount);
    const minWei = auction.highestBid > 0 ? BigInt(auction.highestBid) + 1n : BigInt(auction.startingPrice);
    if (bidWei < minWei) {
      toast.error(`Bid must be at least ${formatEth(minWei)} ETH`); return;
    }
    setBidding(true);
    try {
      // On-chain bid
      let txHash = '';
      if (auction.auctionId) {
        try {
          const receipt = await web3PlaceBid(auction.auctionId, bidWei);
          txHash = receipt?.hash || '';
        } catch (e) {
          toast.error(e.message || 'On-chain bid failed'); setBidding(false); return;
        }
      }
      // Record in DB
      await axios.post(`/api/auctions/${id}/bid`, {
        amount: Number(bidWei),
        amountEth: bidAmount,
        txHash,
        bidderAddress: account,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } });
      toast.success('🔨 Bid placed successfully!');
      setBidAmount('');
      fetchAuction();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Bid failed');
    } finally {
      setBidding(false);
    }
  };

  const handleEnd = async () => {
    if (!isAuthenticated) return;
    setEnding(true);
    try {
      await axios.put(`/api/auctions/${id}/end`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      toast.success('Auction settled!');
      fetchAuction();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to settle auction');
    } finally {
      setEnding(false);
    }
  };

  const handleCancel = async () => {
    if (!isSeller) return;
    if (!window.confirm('Cancel this auction? NFT will be returned to you.')) return;
    setCancelling(true);
    try {
      await axios.put(`/api/auctions/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      toast.success('Auction cancelled');
      navigate('/auctions');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const CountdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) return <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>⏰ Auction Ended</span>;
    return (
      <div className="ad-countdown">
        {days > 0 && <div className="ad-cd-unit"><span className="ad-cd-val">{days}</span><span className="ad-cd-lab">days</span></div>}
        <div className="ad-cd-unit"><span className="ad-cd-val">{String(hours).padStart(2,'0')}</span><span className="ad-cd-lab">hrs</span></div>
        <div className="ad-cd-unit"><span className="ad-cd-val">{String(minutes).padStart(2,'0')}</span><span className="ad-cd-lab">min</span></div>
        <div className="ad-cd-unit"><span className="ad-cd-val">{String(seconds).padStart(2,'0')}</span><span className="ad-cd-lab">sec</span></div>
      </div>
    );
  };

  if (loading) return <div className="page-loader" style={{ paddingTop: '5rem' }}><div className="spinner" /></div>;
  if (!auction) return null;

  const nft = auction.nft;
  const highestBidEth = auction.highestBidEth || (auction.highestBid ? (auction.highestBid / 1e18).toFixed(6) : null);
  const startingPriceEth = auction.startingPriceEth || (auction.startingPrice / 1e18).toFixed(6);

  return (
    <>
      <Helmet>
        <title>{nft?.name ? `Auction: ${nft.name}` : 'Auction'} — MemeVault</title>
      </Helmet>

      <div style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div className="container">
          <Link to="/auctions" className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <FiArrowLeft /> Back to Auctions
          </Link>

          <div className="ad-layout">
            {/* Left: NFT Image */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="ad-image-col">
              <div className="ad-img-wrap">
                <img
                  src={nft?.image || 'https://placehold.co/600x600/111118/7c3aed?text=🔨'}
                  alt={nft?.name}
                  className="ad-img"
                  onError={e => { e.target.src = 'https://placehold.co/600x600/111118/7c3aed?text=🔨'; }}
                />
                <div className="ad-status-overlay">
                  {auction.ended ? (
                    <span className="badge badge-green"><FiCheckCircle /> Ended</span>
                  ) : auction.cancelled ? (
                    <span className="badge badge-red">Cancelled</span>
                  ) : (
                    <span className="badge badge-green">🟢 Live Auction</span>
                  )}
                </div>
              </div>
              <Link to={`/nft/${nft?._id}`} className="btn btn-outline btn-sm" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                View NFT Detail
              </Link>
            </motion.div>

            {/* Right: Auction Info */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="ad-info-col">
              <div className="ad-nft-category">
                <span className="badge badge-primary">{nft?.category || 'NFT'}</span>
              </div>
              <h1 className="ad-title">{nft?.name || 'Meme NFT'}</h1>

              {/* Seller */}
              <div className="ad-seller">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>by</span>
                <Link to={`/profile/${auction.seller?.username}`} className="ad-seller-link">
                  <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                    {auction.seller?.avatar
                      ? <img src={auction.seller.avatar} alt="" className="avatar" style={{ width: 28, height: 28 }} />
                      : auction.seller?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span>{auction.seller?.username}</span>
                  {auction.seller?.isVerified && <MdVerified size={13} style={{ color: 'var(--accent-cyan)' }} />}
                </Link>
              </div>

              {/* Timer */}
              <div className="ad-timer-box">
                <div className="ad-timer-label">
                  <FiClock size={13} />
                  {auction.ended ? 'Auction Ended' : auction.cancelled ? 'Auction Cancelled' : 'Time Remaining'}
                </div>
                {isActive ? (
                  <Countdown date={new Date(auction.endTime)} renderer={CountdownRenderer} />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {auction.ended ? `Ended ${new Date(auction.endTime).toLocaleDateString()}` : 'Cancelled'}
                  </span>
                )}
              </div>

              {/* Price Info */}
              <div className="ad-price-row">
                <div className="ad-price-box">
                  <span className="ad-price-label">Starting Price</span>
                  <div className="price-tag ad-price-val">
                    <SiEthereum size={14} style={{ color: '#7c3aed' }} />
                    {startingPriceEth} ETH
                  </div>
                </div>
                <div className="ad-price-box">
                  <span className="ad-price-label">{auction.ended && auction.winner ? '🏆 Winning Bid' : 'Highest Bid'}</span>
                  <div className="price-tag ad-price-val" style={{ color: highestBidEth ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    <SiEthereum size={14} style={{ color: highestBidEth ? '#7c3aed' : 'var(--text-muted)' }} />
                    {highestBidEth ? `${highestBidEth} ETH` : 'No bids yet'}
                  </div>
                </div>
              </div>

              {/* Winner */}
              {auction.ended && auction.winner && (
                <div className="ad-winner-box">
                  <FiCheckCircle size={16} style={{ color: '#10b981' }} />
                  <span>Won by <strong>{auction.winner.username}</strong></span>
                </div>
              )}

              {/* Bid Form */}
              {isActive && !isSeller && (
                <div className="ad-bid-form">
                  <div className="ad-bid-label">Place Your Bid</div>
                  <p className="ad-bid-hint">Minimum bid: <strong>{minBidEth} ETH</strong></p>
                  <div className="ad-bid-input-row">
                    <div className="price-tag ad-bid-input-wrap">
                      <SiEthereum size={14} style={{ color: '#7c3aed' }} />
                      <input
                        type="number"
                        min={minBidEth}
                        step="0.0001"
                        placeholder={minBidEth}
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        className="ad-bid-input"
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ETH</span>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleBid}
                      disabled={bidding || !isConnected}
                    >
                      <FaHammer size={14} />
                      {bidding ? 'Bidding...' : 'Place Bid'}
                    </button>
                  </div>
                  {!isConnected && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>
                      <FiAlertCircle size={13} /> Connect your wallet to bid
                    </p>
                  )}
                </div>
              )}

              {/* Seller Actions */}
              {isSeller && isActive && (
                <div className="ad-seller-actions">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>You are the seller</p>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleCancel}
                    disabled={cancelling || (auction.bids?.length > 0)}
                    title={auction.bids?.length > 0 ? 'Cannot cancel with active bids' : ''}
                  >
                    {cancelling ? 'Cancelling...' : '❌ Cancel Auction'}
                  </button>
                  {auction.bids?.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Cannot cancel — active bids exist
                    </p>
                  )}
                </div>
              )}

              {/* End Auction (anyone can call after expiry) */}
              {!isActive && !auction.ended && !auction.cancelled && (
                <button
                  className="btn btn-primary"
                  onClick={handleEnd}
                  disabled={ending}
                >
                  <FiCheckCircle size={14} />
                  {ending ? 'Settling...' : 'Settle Auction'}
                </button>
              )}

              {/* Bid History */}
              {auction.bids && auction.bids.length > 0 && (
                <div className="ad-bids-section">
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                    <FiTrendingUp size={14} style={{ marginRight: 6 }} />
                    Bid History ({auction.bids.length})
                  </h3>
                  <div className="ad-bids-list">
                    {[...auction.bids].reverse().map((bid, i) => (
                      <div key={i} className="ad-bid-row">
                        <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                          {bid.bidder?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="ad-bid-user">{bid.bidder?.username || bid.bidderAddress?.slice(0, 10) || 'Unknown'}</span>
                        <div className="price-tag ad-bid-amount">
                          <SiEthereum size={11} style={{ color: '#7c3aed' }} />
                          {bid.amountEth || (bid.amount / 1e18).toFixed(4)} ETH
                        </div>
                        <span className="ad-bid-time">{new Date(bid.timestamp || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .ad-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: start;
        }
        .ad-image-col {}
        .ad-img-wrap {
          position: relative;
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 1px solid var(--border-card);
          aspect-ratio: 1;
          background: var(--bg-card);
        }
        .ad-img { width: 100%; height: 100%; object-fit: cover; }
        .ad-status-overlay { position: absolute; top: 1rem; left: 1rem; }
        .ad-info-col {}
        .ad-nft-category { margin-bottom: 0.5rem; }
        .ad-title { font-size: 2rem; margin-bottom: 0.75rem; line-height: 1.2; }
        .ad-seller {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .ad-seller-link {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 600;
          color: var(--text-primary);
          transition: color 0.2s;
        }
        .ad-seller-link:hover { color: var(--accent-secondary); }
        .ad-timer-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-secondary);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .ad-timer-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .ad-countdown {
          display: flex;
          gap: 0.75rem;
        }
        .ad-cd-unit {
          text-align: center;
          min-width: 48px;
        }
        .ad-cd-val {
          display: block;
          font-family: var(--font-secondary);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--accent-primary);
          line-height: 1;
        }
        .ad-cd-lab {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ad-price-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .ad-price-box {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 1rem;
        }
        .ad-price-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 0.4rem;
        }
        .ad-price-val {
          font-size: 1.1rem;
          font-weight: 800;
          font-family: var(--font-secondary);
        }
        .ad-winner-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: var(--radius-md);
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          color: #10b981;
          font-size: 0.9rem;
        }
        .ad-bid-form {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .ad-bid-label { font-weight: 700; font-size: 1rem; margin-bottom: 0.5rem; }
        .ad-bid-hint { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem; }
        .ad-bid-input-row { display: flex; gap: 0.75rem; align-items: center; }
        .ad-bid-input-wrap {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 0.6rem 1rem;
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .ad-bid-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 0.95rem;
          font-family: var(--font-secondary);
          font-weight: 700;
          min-width: 0;
        }
        .ad-bid-input::placeholder { color: var(--text-muted); font-weight: 400; }
        .ad-seller-actions { margin-bottom: 1.5rem; }
        .ad-bids-section {
          border-top: 1px solid var(--border-secondary);
          padding-top: 1.25rem;
          margin-top: 1.5rem;
        }
        .ad-bids-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 260px; overflow-y: auto; }
        .ad-bid-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          font-size: 0.82rem;
        }
        .ad-bid-user { flex: 1; font-weight: 600; color: var(--text-primary); }
        .ad-bid-amount { font-weight: 700; }
        .ad-bid-time { color: var(--text-muted); font-size: 0.75rem; }
        @media (max-width: 900px) {
          .ad-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};

export default AuctionDetail;
