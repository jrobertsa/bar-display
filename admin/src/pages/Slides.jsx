import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL || '';

const DEFAULT_FORM = { type: 'photo', title: '', duration: '', sort_order: '' };
const PHOTO_TYPES = ['photo', 'announcement'];
const NO_IMAGE_TYPES = ['drawing'];

export default function Slides() {
  const [slides, setSlides]           = useState([]);
  const [globalDuration, setGlobalDuration] = useState('8');
  const [form, setForm]               = useState(DEFAULT_FORM);
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading]     = useState(false);
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef                  = useRef();
  const { toast, showToast }          = useToast();

  const load = async () => {
    const [slidesRes, settingsRes] = await Promise.all([
      axios.get(`${API}/api/slides/all`),
      axios.get(`${API}/api/settings`),
    ]);
    setSlides(slidesRes.data);
    if (settingsRes.data.slide_duration) {
      setGlobalDuration(settingsRes.data.slide_duration);
    }
  };

  useEffect(() => { load(); }, []);

  const pickFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileInput = (e) => pickFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const needsImage = !NO_IMAGE_TYPES.includes(form.type);
    if (needsImage && !imageFile) { showToast('Please select an image', 'error'); return; }

    const fd = new FormData();
    fd.append('type', form.type);
    if (imageFile) fd.append('image', imageFile);
    if (form.title)      fd.append('title',      form.title);
    if (form.duration)   fd.append('duration',   form.duration);
    if (form.sort_order) fd.append('sort_order', form.sort_order);

    try {
      setUploading(true);
      await axios.post(`${API}/api/slides`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Slide uploaded');
      setForm(DEFAULT_FORM);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (slide) => {
    try {
      await axios.put(`${API}/api/slides/${slide.id}`, {
        active: slide.active ? 0 : 1,
      });
      load();
    } catch {
      showToast('Update failed', 'error');
    }
  };

  const moveSortOrder = async (slide, direction) => {
    const current = slide.sort_order ?? 0;
    try {
      await axios.put(`${API}/api/slides/${slide.id}`, {
        sort_order: current + direction,
      });
      load();
    } catch {
      showToast('Update failed', 'error');
    }
  };

  const deleteSlide = async (id) => {
    if (!window.confirm('Delete this slide?')) return;
    try {
      await axios.delete(`${API}/api/slides/${id}`);
      showToast('Slide deleted');
      load();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const saveGlobalDuration = async () => {
    try {
      await axios.put(`${API}/api/settings/slide_duration`, { value: globalDuration });
      showToast('Default duration saved');
    } catch {
      showToast('Save failed', 'error');
    }
  };

  return (
    <>
      <div className="page-title">Slides</div>

      {/* Global duration */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#52525b' }}>
            Default slide duration
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              type="number"
              min="1"
              style={{ width: 80 }}
              value={globalDuration}
              onChange={e => setGlobalDuration(e.target.value)}
            />
            <span style={{ fontSize: 13, color: '#71717a' }}>seconds</span>
            <button className="btn btn-success btn-sm" onClick={saveGlobalDuration}>
              Save
            </button>
          </div>
          <span style={{ fontSize: 12, color: '#a1a1aa', marginLeft: 'auto' }}>
            Individual slides can override this duration below
          </span>
        </div>
      </div>

      {/* Upload form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="modal-title" style={{ fontSize: 16, marginBottom: 16 }}>
          Upload new slide
        </div>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label className="label">Slide Type</label>
            <select
              className="input"
              style={{ width: 200 }}
              value={form.type}
              onChange={e => {
                setForm(f => ({ ...f, type: e.target.value }));
                if (NO_IMAGE_TYPES.includes(e.target.value)) {
                  setImageFile(null);
                  setImagePreview(null);
                }
              }}
            >
              <option value="photo">Photo</option>
              <option value="announcement">Announcement</option>
              <option value="drawing">Drawing</option>
            </select>
          </div>

          {!NO_IMAGE_TYPES.includes(form.type) && <div
            className={`upload-zone${dragOver ? ' drag-over' : ''}`}
            style={{ marginBottom: 16, position: 'relative' }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{ height: 80, borderRadius: 6, objectFit: 'cover', maxWidth: 160 }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#18181b' }}>{imageFile?.name}</div>
                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                    {(imageFile?.size / 1024 / 1024).toFixed(1)} MB — click to change
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Drop an image here or click to browse
                </div>
                <div style={{ fontSize: 12 }}>JPG, PNG, GIF, WebP up to 20 MB</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>}

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Title (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="Shown as overlay on slide"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">
                Duration override (seconds)
              </label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder={`Default: ${globalDuration}s`}
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : '+ Add slide'}
            </button>
          </div>
        </form>
      </div>

      {/* Slide list */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
          All slides
          <span style={{ fontSize: 13, fontWeight: 400, color: '#71717a', marginLeft: 8 }}>
            {slides.length} total
          </span>
        </div>

        {slides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#71717a', fontSize: 14 }}>
            No slides yet — upload one above.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Order</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {slides.map((slide, idx) => (
                <tr key={slide.id}>
                  <td>
                    {slide.image_path ? (
                      <img
                        className="item-thumb"
                        src={`${API}${slide.image_path}`}
                        alt={slide.title || 'slide'}
                      />
                    ) : (
                      <div className="item-thumb-placeholder">📋</div>
                    )}
                  </td>
                  <td style={{ maxWidth: 180 }}>
                    <span style={{ fontWeight: 500 }}>
                      {slide.title || <span style={{ color: '#a1a1aa' }}>—</span>}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      slide.type === 'photo' ? 'badge-yellow' :
                      slide.type === 'drawing' ? 'badge-green' : 'badge-gray'
                    }`}>
                      {slide.type}
                    </span>
                  </td>
                  <td style={{ color: '#52525b', fontSize: 13 }}>
                    {slide.duration
                      ? `${slide.duration}s`
                      : <span style={{ color: '#a1a1aa' }}>default ({globalDuration}s)</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-sm"
                        title="Move up"
                        disabled={idx === 0}
                        onClick={() => moveSortOrder(slide, -1)}
                        style={{ padding: '3px 7px', opacity: idx === 0 ? 0.3 : 1 }}
                      >↑</button>
                      <button
                        className="btn btn-sm"
                        title="Move down"
                        disabled={idx === slides.length - 1}
                        onClick={() => moveSortOrder(slide, 1)}
                        style={{ padding: '3px 7px', opacity: idx === slides.length - 1 ? 0.3 : 1 }}
                      >↓</button>
                    </div>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${slide.active ? 'btn-success' : ''}`}
                      style={!slide.active ? { color: '#71717a' } : {}}
                      onClick={() => toggleActive(slide)}
                    >
                      {slide.active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteSlide(slide.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Toast toast={toast} />
    </>
  );
}
