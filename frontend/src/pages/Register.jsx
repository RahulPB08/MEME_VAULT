import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiZap } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) { toast.error('Please fill all fields'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <>
      <Helmet><title>Create Account — MemeVault</title></Helmet>
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
            <h1 className="auth-title">Join MemeVault</h1>
            <p>Create your account and start collecting memes</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>Username</label>
              <div className="input-icon-wrap">
                <FiUser className="input-icon" />
                <input className="input input-with-icon" name="username" type="text" placeholder="memephile420" value={form.username} onChange={f} />
              </div>
            </div>
            <div className="input-group">
              <label>Email</label>
              <div className="input-icon-wrap">
                <FiMail className="input-icon" />
                <input className="input input-with-icon" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={f} />
              </div>
            </div>
            <div className="input-group">
              <label>Password</label>
              <div className="input-icon-wrap">
                <FiLock className="input-icon" />
                <input className="input input-with-icon" name="password" type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={f} style={{ paddingRight: '2.5rem' }} />
                <button type="button" className="input-eye" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <div className="input-icon-wrap">
                <FiLock className="input-icon" />
                <input className="input input-with-icon" name="confirmPassword" type={showPw ? 'text' : 'password'} placeholder="Repeat password" value={form.confirmPassword} onChange={f} />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account 🚀'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in →</Link>
          </p>
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
          .auth-form { display: flex; flex-direction: column; }
          .input-icon-wrap { position: relative; }
          .input-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
          .input-with-icon { padding-left: 2.5rem; }
          .input-eye { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; }
          .auth-switch { text-align: center; margin-top: 1.5rem; font-size: 0.875rem; color: var(--text-muted); }
          .auth-switch a { color: var(--accent-secondary); font-weight: 600; }
        `}</style>
      </div>
    </>
  );
};

export default Register;
