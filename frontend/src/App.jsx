import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Create from './pages/Create';
import Login from './pages/Login';
import Register from './pages/Register';
import NFTDetail from './pages/NFTDetail';
import Auctions from './pages/Auctions';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import People from './pages/People';
import AuctionDetail from './pages/AuctionDetail';
import { Suspense, lazy } from 'react';

// Lazy load less critical pages
const Profile = lazy(() => import('./pages/Profile'));

const LoadingFallback = () => (
  <div className="page-loader">
    <div className="spinner" />
    <p>Loading...</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Web3Provider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/create" element={<Create />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/nft/:id" element={<NFTDetail />} />
                  <Route path="/auctions" element={<Auctions />} />
                  <Route path="/auction/:id" element={<AuctionDetail />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/people" element={<People />} />
                  <Route path="/profile/:identifier" element={<Profile />} />
                  <Route path="*" element={
                    <div className="empty-state" style={{ paddingTop: '8rem' }}>
                      <div className="empty-icon">🔍</div>
                      <h2>404 — Page Not Found</h2>
                      <a href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</a>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </Web3Provider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
