import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

const API = axios.create({ baseURL: '/api' });

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('mv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mv_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    if (!localStorage.getItem('mv_token')) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await API.get('/auth/me');
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('mv_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const register = async ({ username, email, password, walletAddress }) => {
    const res = await API.post('/auth/register', { username, email, password, walletAddress });
    localStorage.setItem('mv_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    toast.success('Welcome to MemeVault! 🎉');
    return res.data;
  };

  const login = async ({ email, password }) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('mv_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    toast.success(`Welcome back, ${res.data.user.username}! 🚀`);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('mv_token');
    setToken(null);
    setUser(null);
    toast.success('See you around! 👋');
  };

  const connectWalletToAccount = async (walletAddress) => {
    try {
      const res = await API.put('/auth/connect-wallet', { walletAddress });
      setUser(res.data.user);
      return res.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to connect wallet');
    }
  };

  const updateProfile = async (data) => {
    const res = await API.put('/users/profile', data);
    setUser(res.data.user);
    toast.success('Profile updated!');
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user, token, isLoading,
        isAuthenticated: !!user,
        register, login, logout,
        connectWalletToAccount, updateProfile,
        api: API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
