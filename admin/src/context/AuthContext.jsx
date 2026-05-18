import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('admin_token');
    if (t) axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return t;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const login = async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/api/auth/login`, { username, password });
      const t = res.data.token;
      localStorage.setItem('admin_token', t);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      setToken(t);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
