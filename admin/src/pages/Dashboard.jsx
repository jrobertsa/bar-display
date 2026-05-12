import { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const [stats, setStats] = useState({ food: 0, drinks: 0, slides: 0 });

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/food/all`),
      axios.get(`${API}/api/drinks/all`),
      axios.get(`${API}/api/slides/all`),
    ]).then(([food, drinks, slides]) => {
      setStats({
        food:   food.data.length,
        drinks: drinks.data.length,
        slides: slides.data.length,
      });
    });
  }, []);

  return (
    <>
      <div className="page-title">Dashboard</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Food items',  value: stats.food,   icon: '🍔' },
          { label: 'Drink items', value: stats.drinks, icon: '🍺' },
          { label: 'Slides',      value: stats.slides, icon: '🖼️' },
        ].map(s => (
          <div className="card" key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Display status</span>
        </div>
        <div style={{ fontSize: 13, color: '#71717a' }}>
          Any changes you make to menus, slides, or settings will appear on the TV instantly.
        </div>
        <div style={{ marginTop: 12 }}>
<button
            className="btn btn-sm"
            onClick={() => window.open(`${API}/display`, '_blank')}
          >
            Open display preview ↗
          </button>
        </div>
      </div>
    </>
  );
}
