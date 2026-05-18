import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL || '';

const EMPTY_FORM = { name: '', type: 'weekly', entry_fee: '1.00', prize_percentage: '80', draw_date: '', rollover: '0' };

function statusBadge(status) {
  if (status === 'open')   return <span className="badge badge-green">Open</span>;
  if (status === 'drawn')  return <span className="badge badge-yellow">Drawn</span>;
  return <span className="badge badge-gray">{status}</span>;
}

function typeBadge(type) {
  if (type === 'daily')   return <span className="badge badge-gray">Daily</span>;
  if (type === 'weekly')  return <span className="badge badge-yellow">Weekly</span>;
  if (type === 'monthly') return <span className="badge badge-green">Monthly</span>;
  return <span className="badge badge-gray">{type}</span>;
}

export default function DrawingManager({ navigate }) {
  const [drawings, setDrawings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editDrawing, setEditDrawing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  const fetchDrawings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/drawings`);
      setDrawings(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  const openNew = () => {
    setEditDrawing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditDrawing(d);
    setForm({
      name: d.name,
      type: d.type,
      entry_fee: d.entry_fee,
      prize_percentage: d.prize_percentage,
      draw_date: d.draw_date ? d.draw_date.slice(0, 16) : '',
      rollover: d.rollover_amount || '0',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editDrawing) {
        await axios.put(`${API}/api/drawings/${editDrawing.id}`, {
          name: form.name, type: form.type,
          entry_fee: form.entry_fee, prize_percentage: form.prize_percentage,
          draw_date: form.draw_date || null,
        });
      } else {
        await axios.post(`${API}/api/drawings`, {
          name: form.name, type: form.type,
          entry_fee: form.entry_fee, prize_percentage: form.prize_percentage,
          draw_date: form.draw_date || null, pool_total: form.rollover,
        });
      }
      showToast('Saved');
      setShowModal(false);
      fetchDrawings();
    } catch {
      showToast('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="page-title" style={{ margin: 0 }}>🎰 Drawings</div>
        <button className="btn btn-primary" onClick={openNew}>+ New Drawing</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Status</th>
              <th>Entries</th><th>Paid</th><th>Pool Total</th>
              <th>Draw Date</th><th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {drawings.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#71717a', padding: 32 }}>
                No drawings yet — create your first one
              </td></tr>
            )}
            {drawings.map(d => (
              <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate('drawing-entries', d.id)}>
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td>{typeBadge(d.type)}</td>
                <td>{statusBadge(d.status)}</td>
                <td>{d.entry_count || 0}</td>
                <td>{d.paid_count || 0}</td>
                <td style={{ fontWeight: 600 }}>${Number(d.pool_total || 0).toFixed(2)}</td>
                <td style={{ color: '#71717a', fontSize: 13 }}>
                  {d.draw_date ? new Date(d.draw_date).toLocaleString() : '—'}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm" onClick={() => openEdit(d)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editDrawing ? 'Edit Drawing' : 'New Drawing'}</div>

            <div className="form-group">
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Draw Date</label>
                <input className="input" type="datetime-local" value={form.draw_date}
                  onChange={e => set('draw_date', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="label">Entry Fee ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.entry_fee}
                  onChange={e => set('entry_fee', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Prize % of Pool</label>
                <input className="input" type="number" min="1" max="100" value={form.prize_percentage}
                  onChange={e => set('prize_percentage', e.target.value)} />
              </div>
            </div>

            {!editDrawing && (
              <div className="form-group">
                <label className="label">Opening Rollover ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.rollover}
                  onChange={e => set('rollover', e.target.value)} />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
