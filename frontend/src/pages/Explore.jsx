import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiGrid, FiList, FiChevronDown } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import NFTCard from '../components/NFTCard';

const CATEGORIES = ['all', 'trending', 'dank', 'crypto', 'wholesome', 'classic', 'gaming', 'anime', 'politics', 'other'];
const SORT_OPTIONS = [
  { value: 'newest', label: '🕐 Newest First' },
  { value: 'price-asc', label: '💰 Price: Low to High' },
  { value: 'price-desc', label: '💎 Price: High to Low' },
  { value: 'popular', label: '🔥 Most Viewed' },
];

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'all';

  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState('newest');
  const [listed, setListed] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchNFTs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, sort });
      if (search) params.append('search', search);
      if (category !== 'all') params.append('category', category);
      if (listed) params.append('listed', listed);

      const res = await axios.get(`/api/nfts?${params}`);
      setNfts(res.data.nfts || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch {
      setNfts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search, category, sort, listed]);
  useEffect(() => { fetchNFTs(); }, [page, search, category, sort, listed]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(e.target.search.value);
  };

  return (
    <>
      <Helmet>
        <title>Explore Meme NFTs — MemeVault</title>
        <meta name="description" content="Browse and buy meme NFTs in the MemeVault marketplace." />
      </Helmet>

      <div style={{ paddingTop: '5rem' }}>
        {/* Header */}
        <div className="explore-header">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1>Explore <span className="gradient-text">All Memes</span></h1>
              <p>Discover rare and iconic meme NFTs from creators worldwide.</p>
            </motion.div>
          </div>
        </div>

        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="explore-searchbar">
            <div className="search-bar" style={{ flex: 1, maxWidth: 500 }}>
              <FiSearch style={{ color: 'var(--text-muted)' }} />
              <input
                name="search"
                type="text"
                placeholder="Search memes, creators, tags..."
                defaultValue={initialSearch}
              />
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <FiFilter /> Filters {filterOpen ? '▲' : '▼'}
            </button>
          </form>

          {/* Filter Panel */}
          {filterOpen && (
            <motion.div
              className="filter-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="filter-row">
                <span className="filter-label">Sort By:</span>
                <select className="input" value={sort} onChange={e => setSort(e.target.value)} style={{ width: 'auto' }}>
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-row">
                <span className="filter-label">Listing:</span>
                <button className={`filter-chip ${listed === '' ? 'active' : ''}`} onClick={() => setListed('')}>All</button>
                <button className={`filter-chip ${listed === 'true' ? 'active' : ''}`} onClick={() => setListed('true')}>Listed</button>
                <button className={`filter-chip ${listed === 'false' ? 'active' : ''}`} onClick={() => setListed('false')}>Not Listed</button>
              </div>
            </motion.div>
          )}

          {/* Category Filters */}
          <div className="scroll-row" style={{ margin: '1.5rem 0' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-chip ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
                style={{ textTransform: 'capitalize' }}
              >
                {cat === 'all' ? '🌐 All' : cat}
              </button>
            ))}
          </div>

          {/* Results Header */}
          <div className="results-header">
            <span className="results-count">
              {loading ? 'Loading...' : `${nfts.length} results`}
            </span>
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              ><FiGrid /></button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              ><FiList /></button>
            </div>
          </div>

          {/* NFT Grid */}
          {loading ? (
            <div className="grid-4">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="nft-card">
                  <div className="skeleton" style={{ aspectRatio: '1', width: '100%' }} />
                  <div style={{ padding: '1rem', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="skeleton" style={{ height: 14, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 18, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : nfts.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid-4' : 'list-view'}>
              {nfts.map((nft, i) => (
                <NFTCard key={nft._id} nft={nft} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No memes found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, page - 2) + i;
                if (pg > totalPages) return null;
                return (
                  <button key={pg} className={`page-btn ${pg === page ? 'active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>
                );
              })}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .explore-header {
          background: linear-gradient(180deg, rgba(124,58,237,0.08) 0%, transparent 100%);
          padding: 3rem 0 2rem;
          border-bottom: 1px solid var(--border-secondary);
        }
        .explore-header h1 { margin-bottom: 0.5rem; }
        .explore-header p { color: var(--text-secondary); }
        .explore-searchbar {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .filter-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin-top: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          overflow: hidden;
        }
        .filter-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .results-count {
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
        }
        .view-toggle { display: flex; gap: 0.25rem; }
        .view-btn {
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .view-btn.active, .view-btn:hover { border-color: var(--accent-primary); color: var(--accent-secondary); }
        .list-view { display: flex; flex-direction: column; gap: 1rem; }
      `}</style>
    </>
  );
};

export default Explore;
