import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL || '';

function getCurrentUserId(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).id;
  } catch {
    return null;
  }
}

const emptyForm = { username: '', password: '', confirm: '' };

export default function Users() {
  const { token } = useAuth();
  const currentUserId = getCurrentUserId(token);

  const [users, setUsers]               = useState([]);
  const [modal, setModal]               = useState(null);   // null | 'create' | user object
  const [form, setForm]                 = useState(emptyForm);
  const [submitting, setSubmitting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);   // user object
  const { toast, showToast }            = useToast();

  const fetchUsers = () =>
    axios.get(`${API}/api/auth/users`).then(r => setUsers(r.data)).catch(() => {});

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit   = u  => { setForm({ username: u.username, password: '', confirm: '' }); setModal(u); };
  const closeModal = ()  => setModal(null);

  const isEditing = modal && modal !== 'create';

  const handleSubmit = async () => {
    if (!form.username.trim()) return showToast('Username is required', 'error');
    if (!isEditing && !form.password) return showToast('Password is required', 'error');
    if (form.password && form.password !== form.confirm)
      return showToast('Passwords do not match', 'error');

    setSubmitting(true);
    try {
      if (!isEditing) {
        await axios.post(`${API}/api/auth/users`, {
          username: form.username.trim(),
          password: form.password,
        });
        showToast('User created');
      } else {
        const payload = { username: form.username.trim() };
        if (form.password) payload.password = form.password;
        await axios.put(`${API}/api/auth/users/${modal.id}`, payload);
        showToast('User updated');
      }
      fetchUsers();
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/api/auth/users/${deleteTarget.id}`);
      showToast('User deleted');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
      setDeleteTarget(null);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={form[key]}
        placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>Admin Users</div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add user</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  {u.username}
                  {u.id === currentUserId && (
                    <span className="badge badge-yellow" style={{ marginLeft: 8 }}>You</span>
                  )}
                </td>
                <td style={{ color: '#71717a', fontSize: 13 }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={u.id === currentUserId}
                      title={u.id === currentUserId ? 'Cannot delete your own account' : ''}
                      onClick={() => setDeleteTarget(u)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#a1a1aa', padding: 32 }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{isEditing ? 'Edit user' : 'Add user'}</div>

            {field('username', 'Username')}
            {field(
              'password',
              isEditing ? 'New password (leave blank to keep current)' : 'Password',
              'password',
              isEditing ? 'Leave blank to keep current' : ''
            )}
            {form.password && field('confirm', 'Confirm password', 'password')}

            <div className="modal-actions">
              <button className="btn" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Delete "{deleteTarget.username}"?</div>
            <p style={{ fontSize: 14, color: '#52525b', marginBottom: 24 }}>
              This cannot be undone. The user will immediately lose access.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
