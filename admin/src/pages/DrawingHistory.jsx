import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function DrawingHistory({ id, navigate }) {
  const [drawing, setDrawing] = useState(null);
  const [results, setResults] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, rRes] = await Promise.all([
        axios.get(`${API}/api/drawings/${id}`),
        axios.get(`${API}/api/drawings/${id}/results`),
      ]);
      setDrawing(dRes.data);
      setResults(rRes.data);
    } catch { /* silent */ }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-sm" onClick={() => navigate('drawing-entries', id)}>← Back</button>
        <div className="page-title" style={{ margin: 0 }}>
          {drawing ? `${drawing.name} — History` : 'Drawing History'}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Drawn At</th><th>Winner</th><th>Pool Total</th>
              <th>Prize Won</th><th>Rollover</th><th>Result</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#71717a', padding: 32 }}>
                No draws yet
              </td></tr>
            )}
            {results.map(r => (
              <tr key={r.id}>
                <td style={{ color: '#71717a', fontSize: 13 }}>
                  {new Date(r.drawn_at).toLocaleString()}
                </td>
                <td style={{ fontWeight: 500 }}>{r.winner_name || '—'}</td>
                <td>${Number(r.pool_total || 0).toFixed(2)}</td>
                <td style={{ fontWeight: 600, color: r.no_winner ? '#71717a' : '#16a34a' }}>
                  {r.no_winner ? '—' : `$${Number(r.prize_amount).toFixed(2)}`}
                </td>
                <td>${Number(r.rollover_amount || 0).toFixed(2)}</td>
                <td>
                  {r.no_winner
                    ? <span className="badge badge-yellow">No Winner</span>
                    : <span className="badge badge-green">Winner</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
