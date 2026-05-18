import { useState, useEffect } from 'react';
import axios from 'axios';
import { Toast, useToast } from '../components/Toast';

const API = import.meta.env.VITE_API_URL || '';

export default function Settings() {
  const [settings, setSettings] = useState({
    bar_name: '', slide_duration: '8',
    happy_hour_start: '16:00', happy_hour_end: '18:00',
    happy_hour_title: "IT'S HAPPY HOUR!",
    transition_effect: 'fade',
    food_slide_duration: '12', drink_slide_duration: '12',
    weather_zip: '', show_clock: 'true', show_weather: 'true',
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

  const toggle = async (key) => {
    const next = settings[key] === 'true' ? 'false' : 'true';
    setSettings(s => ({ ...s, [key]: next }));
    await save(key, next);
  };

  const fields = [
    { key: 'bar_name',             label: 'Bar name',                    type: 'text' },
    { key: 'slide_duration',       label: 'Default slide duration (s)',   type: 'number' },
    { key: 'food_slide_duration',  label: 'Food menu slide duration (s)', type: 'number' },
    { key: 'drink_slide_duration', label: 'Drink menu slide duration (s)', type: 'number' },
    { key: 'show_clock',           label: 'Show clock',                   type: 'toggle' },
    { key: 'weather_zip',          label: 'Weather zip code',             type: 'text' },
    { key: 'show_weather',         label: 'Show weather',                 type: 'toggle' },
    { key: 'happy_hour_start',     label: 'Happy hour start',             type: 'time' },
    { key: 'happy_hour_end',       label: 'Happy hour end',               type: 'time' },
    { key: 'happy_hour_title',     label: 'Happy hour banner title',      type: 'text' },
  ];

  return (
    <>
      <div className="page-title">Settings</div>

      <div className="card">
        {fields.map(f => (
          <div className="form-group" key={f.key}>
            <label className="label">{f.label}</label>
            {f.type === 'toggle' ? (
              <div>
                <button
                  className={`btn btn-sm ${settings[f.key] === 'true' ? 'btn-success' : ''}`}
                  onClick={() => toggle(f.key)}
                >
                  {settings[f.key] === 'true' ? 'On' : 'Off'}
                </button>
              </div>
            ) : (
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
            )}
          </div>
        ))}
      </div>

      <Toast toast={toast} />
    </>
  );
}
