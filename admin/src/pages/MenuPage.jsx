import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ItemModal from '../components/ItemModal';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL || '';

export default function MenuPage({ type }) {
  const endpoint  = type === 'food' ? 'food' : 'drinks';
  const label     = type === 'food' ? 'Food' : 'Drinks';
  const icon      = type === 'food' ? '🍔' : '🍺';

  const [items, setItems]       = useState([]);
  const [modalItem, setModalItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { toast, showToast }    = useToast();

  const fetchItems = useCallback(async () => {
    const res = await axios.get(`${API}/api/${endpoint}/all`);
    setItems(res.data);
  }, [endpoint]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await axios.delete(`${API}/api/${endpoint}/${id}`);
      showToast('Item deleted');
      fetchItems();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleToggle = async (item) => {
    try {
      const data = new FormData();
      data.append('active', item.active ? 0 : 1);
      await axios.put(`${API}/api/${endpoint}/${item.id}`, data);
      fetchItems();
    } catch {
      showToast('Update failed', 'error');
    }
  };

  const openAdd  = () => { setModalItem({}); setShowModal(true); };
  const openEdit = (item) => { setModalItem(item); setShowModal(true); };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="page-title" style={{ margin: 0 }}>{icon} {label} Menu</div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add item</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 60 }}></th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#71717a', padding: 32 }}>
                  No items yet — add your first one
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  {item.image_path
                    ? <img className="item-thumb" src={`${API}${item.image_path}`} alt="" />
                    : <div className="item-thumb-placeholder">{icon}</div>
                  }
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                      {item.description.slice(0, 60)}{item.description.length > 60 ? '…' : ''}
                    </div>
                  )}
                </td>
                <td style={{ color: '#71717a' }}>{item.category || '—'}</td>
                <td style={{ fontWeight: 600 }}>
                  {item.price != null ? `$${Number(item.price).toFixed(2)}` : '—'}
                </td>
                <td>
                  <span
                    className={`badge ${item.active ? 'badge-green' : 'badge-gray'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggle(item)}
                    title="Click to toggle"
                  >
                    {item.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ItemModal
          item={modalItem}
          endpoint={endpoint}
          onClose={() => setShowModal(false)}
          onSaved={() => { showToast('Saved successfully'); fetchItems(); }}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
