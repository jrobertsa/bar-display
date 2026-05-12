import { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function ItemModal({ item, endpoint, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: '', active: 1
  });
  const [image, setImage]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name:        item.name        || '',
        description: item.description || '',
        price:       item.price       != null ? item.price : '',
        category:    item.category    || '',
        active:      item.active      ?? 1,
      });
      if (item.image_path) setPreview(`${API}${item.image_path}`);
    }
  }, [item]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (image) data.append('image', image);

      if (item?.id) {
        await axios.put(`${API}/api/${endpoint}/${item.id}`, data);
      } else {
        await axios.post(`${API}/api/${endpoint}`, data);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {item?.id ? 'Edit Item' : 'Add Item'}
        </div>

        <div className="form-group">
          <label className="label">Name *</label>
          <input className="input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="label">Price</label>
            <input className="input" type="number" step="0.01" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <input className="input" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="label">Image</label>
          <label className="upload-zone">
            {preview
              ? <img src={preview} alt="" style={{ maxHeight: 120, borderRadius: 8 }} />
              : <span>Click to upload image</span>
            }
            <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
          </label>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={form.active === 1}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked ? 1 : 0 }))} />
            Show on display
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
