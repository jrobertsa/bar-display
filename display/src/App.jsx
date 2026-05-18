import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import PhotoSlide from './components/PhotoSlide';
import MenuSlide from './components/MenuSlide';
import AnnouncementSlide from './components/AnnouncementSlide';
import ClockWidget from './components/ClockWidget';
import WeatherWidget from './components/WeatherWidget';

const API = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [slides, setSlides]           = useState([]);
  const [foodItems, setFoodItems]     = useState([]);
  const [drinkItems, setDrinkItems]   = useState([]);
  const [settings, setSettings]       = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [active, setActive]           = useState(true);
  const [progress, setProgress]       = useState(0);
  const [weather, setWeather]         = useState({ enabled: false });

  const timerRef    = useRef(null);
  const progressRef = useRef(null);
  const startRef    = useRef(null);

  // Build the full slide queue from API data
  const buildQueue = useCallback((rawSlides, food, drinks, cfg = {}) => {
    const queue = [];
    rawSlides.forEach(slide => {
      if (slide.type === 'food')         queue.push({ kind: 'food', slide });
      else if (slide.type === 'drinks')  queue.push({ kind: 'drinks', slide });
      else if (slide.type === 'photo')   queue.push({ kind: 'photo', slide });
      else if (slide.type === 'announcement') queue.push({ kind: 'announcement', slide });
    });

    // If no explicit food/drink slides configured, auto-generate from menu data
    if (!rawSlides.find(s => s.type === 'food') && food.length > 0) {
      queue.push({ kind: 'food', slide: { id: 'auto-food', duration: parseInt(cfg.food_slide_duration) || 12 } });
    }
    if (!rawSlides.find(s => s.type === 'drinks') && drinks.length > 0) {
      queue.push({ kind: 'drinks', slide: { id: 'auto-drinks', duration: parseInt(cfg.drink_slide_duration) || 12 } });
    }

    return queue;
  }, []);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/weather`);
      setWeather(await res.json());
    } catch {
      // widget stays hidden on error
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    try {
      const [slidesRes, foodRes, drinksRes, settingsRes] = await Promise.all([
        fetch(`${API}/api/slides`),
        fetch(`${API}/api/food`),
        fetch(`${API}/api/drinks`),
        fetch(`${API}/api/settings`)
      ]);
      const [rawSlides, food, drinks, cfg] = await Promise.all([
        slidesRes.json(),
        foodRes.json(),
        drinksRes.json(),
        settingsRes.json()
      ]);
      setSlides(buildQueue(rawSlides, food, drinks, cfg));
      setFoodItems(food);
      setDrinkItems(drinks);
      setSettings(cfg);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [buildQueue]);

  // Connect Socket.io
  useEffect(() => {
    const socket = io(API);
    socket.on('menu_updated',   fetchAll);
    socket.on('slides_updated', fetchAll);
    socket.on('settings_updated', () => { fetchAll(); fetchWeather(); });
    return () => socket.disconnect();
  }, [fetchAll, fetchWeather]);

  // Initial load
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Slide timer with progress bar
  useEffect(() => {
    if (slides.length === 0) return;

    const current  = slides[currentIndex];
    const duration = (current?.slide?.duration || parseInt(settings.slide_duration) || 8) * 1000;

    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);

    setActive(true);
    setProgress(0);
    startRef.current = Date.now();

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min((elapsed / duration) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      setActive(false);
      setTimeout(() => {
        setCurrentIndex(i => (i + 1) % slides.length);
      }, 800);
    }, duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [currentIndex, slides, settings.slide_duration]);

  const to12h = (time) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Happy hour check
  const isHappyHour = () => {
    if (!settings.happy_hour_start || !settings.happy_hour_end) return false;
    const now   = new Date();
    const cur   = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = settings.happy_hour_start.split(':').map(Number);
    const [eh, em] = settings.happy_hour_end.split(':').map(Number);
    return cur >= sh * 60 + sm && cur < eh * 60 + em;
  };

  // Render current slide
  const renderSlide = () => {
    if (slides.length === 0) {
      return (
        <div className="no-content">
          <div>No content configured</div>
          <div style={{ fontSize: 16 }}>Add slides from the admin panel</div>
        </div>
      );
    }

    const entry = slides[currentIndex];
    if (!entry) return null;

    const cls = `slide ${active ? 'active' : ''}`;

    switch (entry.kind) {
      case 'photo':
        return <div className={cls} style={{ position: 'absolute', inset: 0 }}>
          <PhotoSlide slide={entry.slide} />
        </div>;

      case 'food':
        return <div className={cls} style={{ position: 'absolute', inset: 0 }}>
          <MenuSlide title="Food Menu" items={foodItems} type="food" />
        </div>;

      case 'drinks':
        return <div className={cls} style={{ position: 'absolute', inset: 0 }}>
          <MenuSlide title="Drink Menu" items={drinkItems} type="drinks" accentColor="#60c0f0" />
        </div>;

      case 'announcement':
        return <div className={cls} style={{ position: 'absolute', inset: 0 }}>
          <AnnouncementSlide slide={entry.slide} />
        </div>;

      default:
        return null;
    }
  };

  return (
    <>
      {isHappyHour() && (
        <div className="happy-hour-banner">
          {settings.happy_hour_title || "IT'S HAPPY HOUR!"} — {to12h(settings.happy_hour_start)} to {to12h(settings.happy_hour_end)}
        </div>
      )}

      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {renderSlide()}
      </div>

      <ClockWidget />
      <WeatherWidget weather={weather} />

      <div
        className="progress-bar"
        style={{ width: `${progress}%`, transitionDuration: '50ms' }}
      />
    </>
  );
}
