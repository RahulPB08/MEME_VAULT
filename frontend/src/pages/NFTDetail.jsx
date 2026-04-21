import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiShare2, FiTag, FiClock, FiUser, FiExternalLink } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { resolveImageUrl, makeGatewayFallback } from '../utils/imageUtils';

const NFTDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { isConnected, buyNFT, resellNFT, cancelListing, createAuction, account, formatEth, parseEth } = useWeb3();
  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [offers, setOffers] = useState([]);
  const [activeTab, setActiveTab] = useState('history');

  const [auctionForm, setAuctionForm] = useState(false);
  const [auctionData, setAuctionData] = useState({ price: '0.1', duration: 1 });
  const [startingAuction, setStartingAuction] = useState(false);

  const [listingForm, setListingForm] = useState(false);
  const [listingPrice, setListingPrice] = useState('0.1');
  const [processingListing, setProcessingListing] = useState(false);

  useEffect(() => {
    const fetchNFT = async () => {
      try {
        const [nftRes, offersRes] = await Promise.all([
          axios.get(`/api/nfts/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } }),
          axios.get(`/api/offers/nft/${id}`),
        ]);
        setNft(nftRes.data.nft);
        setOffers(offersRes.data.offers || []);
      } catch {
        setNft(null);
      } finally {
        setLoading(false);
      }
    };
    fetchNFT();
  }, [id]);

  const handleBuy = async () => {
    if (!isConnected) { toast.error('Connect wallet first!'); return; }
    if (!isAuthenticated) { toast.error('Sign in first!'); return; }
    setBuying(true);
    const tid = toast.loading('Processing purchase...');
    try {
      const receipt = await buyNFT(nft.tokenId, nft.price);
      // Register purchase on backend
      await axios.post(`/api/nfts/${id}/buy`, { transactionHash: receipt?.hash }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` },
      });
      
      toast.dismiss(tid);
      toast.success('NFT purchased! 🎉');
      const res = await axios.get(`/api/nfts/${id}`);
      setNft(res.data.nft);
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e.message || 'Transaction failed');
    } finally {
      setBuying(false);
    }
  };

  const handleStartAuction = async () => {
    if (!isConnected) { toast.error('Connect wallet first!'); return; }
    if (!auctionData.price || parseFloat(auctionData.price) <= 0) { toast.error('Invalid price'); return; }
    
    setStartingAuction(true);
    const tid = toast.loading('Creating auction on-chain...');
    try {
      const startingPriceInWei = parseEth(auctionData.price);
      const reservePriceInWei = 0; // No reserve for simplicity
      const durationInSeconds = Number(auctionData.duration) * 24 * 60 * 60;
      
      const receipt = await createAuction(
        import.meta.env.VITE_MEMEVAULT_ADDRESS,
        nft.tokenId,
        startingPriceInWei,
        reservePriceInWei,
        durationInSeconds
      );
      
      toast.loading('Saving auction to database...', { id: tid });
      
      await axios.post('/api/auctions', {
        nftId: nft._id,
        tokenId: nft.tokenId,
        startingPrice: startingPriceInWei.toString(),
        startingPriceEth: auctionData.price,
        reservePrice: reservePriceInWei.toString(),
        duration: durationInSeconds,
        nftContractAddress: import.meta.env.VITE_MEMEVAULT_ADDRESS,
        transactionHash: receipt.hash,
        sellerAddress: account
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } });
      
      toast.success('Auction started successfully! 🔨', { id: tid });
      setAuctionForm(false);
      
      // reload nft state
      const res = await axios.get(`/api/nfts/${id}`);
      setNft(res.data.nft);
    } catch (e) {
      console.error(e);
      toast.dismiss(tid);
      toast.error('Failed to start auction');
    } finally {
      setStartingAuction(false);
    }
  };

  const handleListFixedPrice = async () => {
    if (!isConnected) { toast.error('Connect wallet first!'); return; }
    if (!listingPrice || parseFloat(listingPrice) <= 0) { toast.error('Invalid price'); return; }

    setProcessingListing(true);
    const tid = toast.loading('Listing on-chain...');
    try {
      const newPriceWei = parseEth(listingPrice);
      const receipt = await resellNFT(nft.tokenId, newPriceWei);
      
      toast.loading('Saving listing...', { id: tid });
      await axios.put(`/api/nfts/${id}`, {
        listed: true,
        price: newPriceWei.toString(),
        priceInEth: listingPrice,
        transactionHash: receipt.hash
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } });
      
      toast.success('NFT Listed for Sale! 🏷️', { id: tid });
      setListingForm(false);
      const res = await axios.get(`/api/nfts/${id}`);
      setNft(res.data.nft);
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e.message || 'Failed to list NFT');
    } finally {
      setProcessingListing(false);
    }
  };

  const handleCancelListing = async () => {
    if (!isConnected) { toast.error('Connect wallet first!'); return; }
    const tid = toast.loading('Cancelling listing on-chain...');
    try {
      await cancelListing(nft.tokenId);
      toast.loading('Updating database...', { id: tid });
      await axios.put(`/api/nfts/${id}`, { listed: false }, { headers: { Authorization: `Bearer ${localStorage.getItem('mv_token')}` } });
      toast.success('Listing cancelled ❌', { id: tid });
      const res = await axios.get(`/api/nfts/${id}`);
      setNft(res.data.nft);
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e.message || 'Failed to cancel listing');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied! 📋');
  };

  if (loading) {
    return (
      <div className="page-loader" style={{ paddingTop: '5rem' }}>
        <div className="spinner" />
        <p>Loading meme NFT...</p>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="empty-state" style={{ paddingTop: '8rem' }}>
        <div className="empty-icon">🔍</div>
        <h3>NFT Not Found</h3>
        <Link to="/explore" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Marketplace</Link>
      </div>
    );
  }

  const isOwner = user?._id === (nft.owner?._id || nft.owner);
  const priceEth = nft.priceInEth || (nft.price ? (parseFloat(nft.price) / 1e18).toFixed(4) : '0');

  return (
    <>
      <Helmet>
        <title>{nft.name} — MemeVault</title>
        <meta name="description" content={nft.description} />
      </Helmet>

      <div style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
        <div className="container">
          <div className="nft-detail-layout">
            {/* Left: Image */}
            <motion.div
              className="nft-detail-img-col"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="nft-detail-img-card">
                <img
                  src={resolveImageUrl(nft.image)}
                  alt={nft.name}
                  className="nft-detail-img"
                  onError={makeGatewayFallback(nft.image)}
                />
              </div>

              {/* Details card */}
              <div className="nft-info-card">
                <div className="nft-info-row">
                  <span>Category</span>
                  <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{nft.category}</span>
                </div>
                <div className="nft-info-row">
                  <span>Views</span>
                  <span>{nft.views || 0}</span>
                </div>
                <div className="nft-info-row">
                  <span>Blockchain</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <SiEthereum size={12} style={{ color: '#7c3aed' }} /> {nft.blockchain || 'Ethereum'}
                  </span>
                </div>
                <div className="nft-info-row">
                  <span>Contract</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {import.meta.env.VITE_MEMEVAULT_ADDRESS.slice(0, 6)}...{import.meta.env.VITE_MEMEVAULT_ADDRESS.slice(-4)}
                  </span>
                </div>
                {nft.tokenId && (
                  <div className="nft-info-row">
                    <span>Token ID</span>
                    <span>#{nft.tokenId}</span>
                  </div>
                )}
                <div className="nft-info-row">
                  <span>Royalty</span>
                  <span>{nft.royaltyPercent || 10}%</span>
                </div>
                {nft.transactionHash && (
                  <div className="nft-info-row">
                    <span>TX Hash</span>
                    <a href={`https://etherscan.io/tx/${nft.transactionHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem' }}>
                      View on Etherscan <FiExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right: Info */}
            <motion.div
              className="nft-detail-info-col"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Tags */}
              {nft.tags?.length > 0 && (
                <div className="flex gap-2" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {nft.tags.map(tag => (
                    <Link key={tag} to={`/explore?search=${tag}`} className="filter-chip">{tag}</Link>
                  ))}
                </div>
              )}

              <h1 className="nft-detail-title">{nft.name}</h1>
              <p className="nft-detail-desc">{nft.description}</p>

              {/* Creator & Owner */}
              <div className="creator-owner-row">
                <div className="co-card">
                  <span className="co-label">Creator</span>
                  <Link to={`/profile/${nft.creator?.username}`} className="co-user">
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                      {nft.creator?.avatar ? <img src={nft.creator.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} /> : nft.creator?.username?.[0]?.toUpperCase()}
                    </div>
                    <span>
                      {nft.creator?.username}
                      {nft.creator?.isVerified && <MdVerified className="verified-icon" size={12} style={{ marginLeft: 3 }} />}
                    </span>
                  </Link>
                </div>
                <div className="co-card">
                  <span className="co-label">Owner</span>
                  <Link to={`/profile/${nft.owner?.username}`} className="co-user">
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                      {nft.owner?.avatar ? <img src={nft.owner.avatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} /> : nft.owner?.username?.[0]?.toUpperCase()}
                    </div>
                    <span>{nft.owner?.username}</span>
                  </Link>
                </div>
              </div>

              {/* Price & Buy / Actions */}
              <div className="nft-purchase-card">
                {nft.listed && (
                  <>
                    <p className="purchase-label">Current Price</p>
                    <div className="purchase-price">
                      <SiEthereum size={24} style={{ color: '#7c3aed' }} />
                      <span className="price-big">{parseFloat(priceEth).toFixed(4)}</span>
                      <span className="price-unit">ETH</span>
                    </div>
                    {!isOwner && (
                      <div className="purchase-actions">
                        <button
                          className="btn btn-primary btn-xl"
                          style={{ flex: 1 }}
                          onClick={handleBuy}
                          disabled={buying}
                        >
                          <FiTag /> {buying ? 'Processing...' : 'Buy Now'}
                        </button>
                        <button className="btn btn-secondary btn-xl" onClick={handleShare}>
                          <FiShare2 />
                        </button>
                      </div>
                    )}
                    {isOwner && (
                      <div className="purchase-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                        <button className="btn btn-secondary btn-xl" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCancelListing}>
                          Cancel Listing ❌
                        </button>
                      </div>
                    )}
                  </>
                )}
                
                {nft.onAuction && (
                  <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <span className="badge badge-gold" style={{ fontSize: '1rem', padding: '0.75rem 2rem', marginBottom: '1.5rem', display: 'inline-block' }}>🔨 Currently On Auction</span>
                    <Link to={`/auction/${nft.auctionId}`} className="btn btn-primary btn-xl" style={{ width: '100%', justifyContent: 'center' }}>
                      Go to Auction Room to Bid
                    </Link>
                  </div>
                )}
                
                {!nft.listed && !nft.onAuction && (
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingBottom: '1.5rem' }}>
                      Not currently listed for direct sale
                    </div>
                    
                    {/* Legacy NFT warning — no tokenId */}
                    {isOwner && !nft.tokenId && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                        <div>
                          <p style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#f87171' }}>Legacy NFT – No Token ID</p>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>This NFT was saved before blockchain integration was finalized. It has no on-chain Token ID, so it cannot be listed or auctioned. Please mint a fresh NFT.</p>
                          <Link to="/create" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>Mint a New NFT →</Link>
                        </div>
                      </div>
                    )}
                    {/* Owner Action: Start Auction / List Form — only when on-chain tokenId exists */}
                    {isOwner && nft.tokenId && (
                      <div className="purchase-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                          <button 
                            className="btn btn-primary btn-xl" 
                            style={{ flex: 1, justifyContent: 'center', padding: '0.75rem 0' }} 
                            onClick={() => { setListingForm(!listingForm); setAuctionForm(false); }}
                          >
                            {listingForm ? 'Cancel' : 'List Fixed Price'}
                          </button>
                          
                          <button 
                            className="btn btn-outline btn-xl" 
                            style={{ flex: 1, justifyContent: 'center', padding: '0.75rem 0' }} 
                            onClick={() => { setAuctionForm(!auctionForm); setListingForm(false); }}
                          >
                            {auctionForm ? 'Cancel' : 'Start Auction 🔨'}
                          </button>
                        </div>

                        {listingForm && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }} 
                             animate={{ opacity: 1, height: 'auto' }} 
                             style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-card)', marginTop: '0.5rem' }}
                           >
                             <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>List for Direct Sale</h4>
                             <div style={{ marginBottom: '1.5rem' }}>
                               <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Sale Price (ETH)</label>
                               <div className="price-tag" style={{ background: 'var(--bg-card)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', border: '1px solid var(--border-primary)', borderRadius: '8px' }}>
                                 <SiEthereum size={14} style={{ color: '#7c3aed' }} />
                                 <input 
                                   type="number" 
                                   style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none' }} 
                                   min="0" 
                                   step="0.0001"
                                   value={listingPrice} 
                                   onChange={e => setListingPrice(e.target.value)} 
                                 />
                               </div>
                             </div>
                             
                             <button 
                               className="btn btn-primary btn-lg" 
                               style={{ width: '100%', justifyContent: 'center' }} 
                               disabled={processingListing} 
                               onClick={handleListFixedPrice}
                             >
                               {processingListing ? 'Processing...' : 'Confirm Listing'}
                             </button>
                           </motion.div>
                        )}
                        
                        {auctionForm && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }} 
                             animate={{ opacity: 1, height: 'auto' }} 
                             style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-card)', marginTop: '0.5rem' }}
                           >
                             <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Create Auction</h4>
                             <div style={{ marginBottom: '1rem' }}>
                               <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Starting Price (ETH)</label>
                               <div className="price-tag" style={{ background: 'var(--bg-card)', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', border: '1px solid var(--border-primary)', borderRadius: '8px' }}>
                                 <SiEthereum size={14} style={{ color: '#7c3aed' }} />
                                 <input 
                                   type="number" 
                                   style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none' }} 
                                   min="0" 
                                   step="0.0001"
                                   value={auctionData.price} 
                                   onChange={e => setAuctionData({...auctionData, price: e.target.value})} 
                                 />
                               </div>
                             </div>
                             
                             <div style={{ marginBottom: '1.5rem' }}>
                               <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Duration</label>
                               <select 
                                 style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', padding: '0.8rem 1rem', color: 'white', outline: 'none' }} 
                                 value={auctionData.duration} 
                                 onChange={e => setAuctionData({...auctionData, duration: e.target.value})}
                               >
                                 <option value={1}>1 Day</option>
                                 <option value={3}>3 Days</option>
                                 <option value={7}>7 Days</option>
                               </select>
                             </div>
                             
                             <button 
                               className="btn btn-primary btn-lg" 
                               style={{ width: '100%', justifyContent: 'center' }} 
                               disabled={startingAuction} 
                               onClick={handleStartAuction}
                             >
                               {startingAuction ? 'Processing...' : 'Confirm & Start Auction'}
                             </button>
                           </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="tabs" style={{ marginTop: '2rem' }}>
                {['history', 'offers'].map(tab => (
                  <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} style={{ textTransform: 'capitalize' }}>
                    {tab === 'history' ? `📜 History` : `🤝 Offers (${offers.length})`}
                  </button>
                ))}
              </div>

              <div className="tab-content">
                {activeTab === 'history' && (
                  <div className="history-list">
                    {nft.history?.length > 0 ? nft.history.map((h, i) => (
                      <div key={i} className="history-item">
                        <span className="history-event badge badge-primary" style={{ textTransform: 'capitalize' }}>{h.event}</span>
                        <span className="history-date">{new Date(h.timestamp).toLocaleDateString()}</span>
                        {h.price > 0 && (
                           <span className="history-price">
                             <SiEthereum size={10} style={{ color: '#7c3aed' }} />
                             {(parseFloat(h.price) / 1e18).toFixed(4)} ETH
                           </span>
                        )}
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-muted)', padding: '1rem', fontSize: '0.875rem' }}>No history yet.</p>
                    )}
                  </div>
                )}
                {activeTab === 'offers' && (
                  <div className="offers-list">
                    {offers.length > 0 ? offers.map(offer => (
                      <div key={offer._id} className="offer-item">
                        <div className="flex items-center gap-2">
                          <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                            {offer.buyer?.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="offer-buyer">{offer.buyer?.username}</span>
                        </div>
                        <span className="offer-amount">
                          <SiEthereum size={10} style={{ color: '#7c3aed' }} />
                          {offer.amountEth || (offer.amount / 1e18).toFixed(4)} ETH
                        </span>
                        <span className="history-date">
                          <FiClock size={11} /> Expires {new Date(offer.expirationTime).toLocaleDateString()}
                        </span>
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-muted)', padding: '1rem', fontSize: '0.875rem' }}>No offers yet.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .nft-detail-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: start;
        }
        .nft-detail-img-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }
        .nft-detail-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
        .nft-info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-top: 1rem;
        }
        .nft-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-secondary);
          color: var(--text-secondary);
        }
        .nft-info-row:last-child { border-bottom: none; }
        .nft-info-row span:last-child { color: var(--text-primary); font-weight: 600; }
        .nft-detail-title { font-size: clamp(1.5rem, 3vw, 2.25rem); margin-bottom: 0.75rem; }
        .nft-detail-desc { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.5rem; }
        .creator-owner-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .co-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 0.875rem;
        }
        .co-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; display: block; margin-bottom: 0.5rem; }
        .co-user { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .co-user:hover { color: var(--accent-secondary); }
        .nft-purchase-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          box-shadow: var(--shadow-glow);
        }
        .purchase-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.5rem; }
        .purchase-price { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1.25rem; }
        .price-big { font-size: 2.5rem; font-weight: 800; font-family: var(--font-secondary); color: var(--text-primary); }
        .price-unit { color: var(--text-muted); font-size: 1rem; }
        .purchase-actions { display: flex; gap: 0.75rem; }
        .tab-content { margin-top: 0.75rem; }
        .history-list, .offers-list { display: flex; flex-direction: column; }
        .history-item, .offer-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-secondary);
          font-size: 0.8rem;
        }
        .history-item:last-child, .offer-item:last-child { border-bottom: none; }
        .history-date { color: var(--text-muted); margin-left: auto; display: flex; align-items: center; gap: 0.25rem; }
        .history-price { display: flex; align-items: center; gap: 0.25rem; font-weight: 700; }
        .offer-buyer { font-weight: 600; }
        .offer-amount { display: flex; align-items: center; gap: 0.25rem; font-weight: 700; color: var(--accent-secondary); }
        @media (max-width: 1024px) { .nft-detail-layout { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .creator-owner-row { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
};

export default NFTDetail;
