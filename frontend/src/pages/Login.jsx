import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiZap } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      await login(form);
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Sign In — MemeVault</title></Helmet>
      <div className="auth-page">
        <div className="auth-glow" />
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-logo">
            <div className="logo-icon" style={{ width: 48, height: 48, fontSize: '1.3rem', margin: '0 auto 0.75rem' }}>
              <FiZap />
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p>Sign in to your MemeVault account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <div className="input-icon-wrap">
                <FiMail className="input-icon" />
                <input
                  className="input input-with-icon"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-icon-wrap">
                <FiLock className="input-icon" />
                <input
                  className="input input-with-icon"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" className="input-eye" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one →</Link>
          </p>

          {/* Demo hint */}
          <div className="demo-hint">
            <p>Demo: register with any email & password</p>
          </div>
        </motion.div>

        <style>{`
          .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            background: var(--gradient-hero);
            padding: 2rem 1rem;
          }
          .auth-glow {
            position: absolute;
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%);
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            filter: blur(60px);
            pointer-events: none;
          }
          .auth-card {
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: var(--radius-xl);
            padding: 2.5rem;
            width: 100%;
            max-width: 420px;
            position: relative;
            box-shadow: var(--shadow-glow), var(--shadow-lg);
          }
          .auth-logo { text-align: center; margin-bottom: 2rem; }
          .auth-title { font-size: 1.75rem; margin-bottom: 0.25rem; }
          .auth-logo p { color: var(--text-muted); font-size: 0.875rem; }
          .auth-form { display: flex; flex-direction: column; gap: 0; }
          .input-icon-wrap { position: relative; }
          .input-icon {
            position: absolute;
            left: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
          }
          .input-with-icon { padding-left: 2.5rem; }
          .input-eye {
            position: absolute;
            right: 0.875rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
            display: flex;
            align-items: center;
          }
          .input-eye:hover { color: var(--text-primary); }
          .auth-switch {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.875rem;
            color: var(--text-muted);
          }
          .auth-switch a { color: var(--accent-secondary); font-weight: 600; }
          .demo-hint {
            margin-top: 1rem;
            padding: 0.75rem;
            background: rgba(124,58,237,0.08);
            border: 1px solid rgba(124,58,237,0.2);
            border-radius: var(--radius-md);
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
          }
        `}</style>
      </div>
    </>
  );
};

export default Login;
