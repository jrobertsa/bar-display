import { useState, useEffect } from 'react';
import axios from 'axios';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL;

export default function Settings() {
  const [settings, setSettings] = useState({
    bar_name: '', slide_duration: '8',
    happy_hour_start: '16:00', happy_hour_end: '18:00',
    transition_effect: 'fade'
  });
  const { toast, showToast } = useToast();

  useEffect(() => {
    axios.get(`${API}/api/settings`).then(res => {
      setSettings(s => ({ ...s, ...res.data }));
    });
  }, []);

  const save = async (key, value) => {
    try {
      await axios.put(`${API}/api/settings/${key}`, { value });
      showToast('Setting saved');
    } catch {
      showToast('Save failed', 'error');
    }
  };

  const fields = [
    { key: 'bar_name',          label: 'Bar name',                  type: 'text' },
    { key: 'slide_duration',    label: 'Default slide duration (s)', type: 'number' },
    { key: 'happy_hour_start',  label: 'Happy hour start',           type: 'time' },
    { key: 'happy_hour_end',    label: 'Happy hour end',             type: 'time' },
  ];

  return (
    <>
      <div className="page-title">Settings</div>

      <div className="card">
        {fields.map(f => (
          <div className="form-group" key={f.key}>
            <label className="label">{f.label}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                type={f.type}
                value={settings[f.key] || ''}
                onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
              />
              <button className="btn btn-success btn-sm"
                onClick={() => save(f.key, settings[f.key])}>
                Save
              </button>
            </div>
          </div>
        ))}
      </div>

      <Toast toast={toast} />
    </>
  );
}
