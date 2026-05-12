import { useState } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MenuPage from './pages/MenuPage';
import Settings from './pages/Settings';
import Slides from './pages/Slides';
import Users from './pages/Users';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'food',      label: 'Food menu', icon: '🍔' },
  { id: 'drinks',    label: 'Drink menu', icon: '🍺' },
  { id: 'slides',    label: 'Slides',    icon: '🖼️' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
  { id: 'users',     label: 'Users',     icon: '👤' },
];

function AdminApp() {
  const { token, logout } = useAuth();
  const [page, setPage]   = useState('dashboard');

  if (!token) return <Login />;

  const renderPage = () => {
    switch (page) {
      case 'food':      return <MenuPage type="food" />;
      case 'drinks':    return <MenuPage type="drinks" />;
      case 'slides':    return <Slides />;
      case 'settings':  return <Settings />;
      case 'users':     return <Users />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-brand">Bar<span>Display</span></div>
        {navItems.map(n => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: '0 12px' }}>
          <button className="nav-item" onClick={logout} style={{ color: '#f87171' }}>
            <span className="nav-icon">→</span> Sign out
          </button>
        </div>
      </nav>
      <main className="main">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  );
}
