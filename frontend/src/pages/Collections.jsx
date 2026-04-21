import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiGrid, FiList } from 'react-icons/fi';
import { SiEthereum } from 'react-icons/si';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import NFTCard from '../components/NFTCard';

const CATEGORIES = ['all', 'trending', 'dank', 'crypto', 'wholesome', 'classic', 'gaming', 'anime', 'politics', 'other'];
const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'popular', label: 'Most Viewed' },
  { value: 'most-liked', label: 'Most Liked' },
];

const Collections = () => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showOnlyListed, setShowOnlyListed] = useState(true);

  useEffect(() => {
    fetchNFTs();
  }, [category, sort, page, showOnlyListed]);

  const fetchNFTs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 12,
        sort,
        ...(category !== 'all' && { category }),
        ...(showOnlyListed && { listed: 'true' }),
      });
      const res = await axios.get(`/api/nfts?${params}`);
      setNfts(res.data.nfts || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotal(res.data.pagination?.total || 0);
    } catch {
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setLoading(true);
    axios.get(`/api/nfts?search=${encodeURIComponent(search)}&page=1&limit=12&sort=${sort}${showOnlyListed ? '&listed=true' : ''}`)
      .then(res => {
        setNfts(res.data.nfts || []);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotal(res.data.pagination?.total || 0);
      })
      .catch(() => setNfts([]))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <Helmet>
        <title>Collections — MemeVault</title>
        <meta name="description" content="Browse and buy meme NFTs from the MemeVault marketplace." />
      </Helmet>

      <div style={{ paddingTop: '5rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div className="collections-header">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1>🖼️ <span className="gradient-text">Collections</span></h1>
              <p>Browse and buy meme NFTs from the marketplace. {total > 0 && <span className="badge badge-primary">{total} NFTs</span>}</p>
            </motion.div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem' }}>
          {/* Search + Filters */}
          <div className="collections-toolbar">
            <form onSubmit={handleSearch} style={{ flex: 1 }}>
              <div className="search-bar" style={{ maxWidth: 400 }}>
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search memes, tags, creators..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </form>
            <div className="collections-filters">
              <label className="filter-toggle">
                <input
                  type="checkbox"
                  checked={showOnlyListed}
                  onChange={e => { setShowOnlyListed(e.target.checked); setPage(1); }}
                />
                <span>For Sale Only</span>
              </label>
              <select
                className="filter-select"
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1); }}
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="category-pills">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-pill ${category === cat ? 'active' : ''}`}
                onClick={() => { setCategory(cat); setPage(1); }}
                style={{ textTransform: 'capitalize' }}
              >
                {cat === 'all' ? '🌐 All' : cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid-4">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="nft-card">
                  <div className="skeleton" style={{ aspectRatio: '1', width: '100%' }} />
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 18, width: '80%', borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 36, borderRadius: 8, marginTop: '0.25rem' }} />
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
              <div className="empty-icon">🎭</div>
              <h3>No memes found</h3>
              <p>Try adjusting your filters or {' '}
                <Link to="/create" style={{ color: 'var(--accent-secondary)' }}>create the first one!</Link>
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1).map(pg => (
                <button key={pg} className={`page-btn ${pg === page ? 'active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>
              ))}
              {totalPages > 7 && <span style={{ color: 'var(--text-muted)', padding: '0 0.5rem' }}>...</span>}
              {totalPages > 7 && (
                <button className={`page-btn ${page === totalPages ? 'active' : ''}`} onClick={() => setPage(totalPages)}>{totalPages}</button>
              )}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .collections-header {
          background: linear-gradient(180deg, rgba(124,58,237,0.08) 0%, transparent 100%);
          padding: 3rem 0 2rem;
          border-bottom: 1px solid var(--border-secondary);
        }
        .collections-header h1 { margin-bottom: 0.5rem; }
        .collections-header p { color: var(--text-secondary); display: flex; align-items: center; gap: 0.75rem; }
        .collections-toolbar {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .collections-filters {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-secondary);
          user-select: none;
        }
        .filter-toggle input { accent-color: var(--accent-primary); width: 16px; height: 16px; cursor: pointer; }
        .filter-select {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          color: var(--text-primary);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
          outline: none;
          transition: var(--transition-fast);
        }
        .filter-select:focus { border-color: var(--accent-primary); }
        .category-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }
        .cat-pill {
          padding: 0.4rem 1rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-secondary);
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .cat-pill:hover { border-color: var(--accent-primary); color: var(--text-primary); }
        .cat-pill.active {
          background: var(--gradient-primary);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 0 16px rgba(124,58,237,0.35);
        }
      `}</style>
    </>
  );
};

export default Collections;
