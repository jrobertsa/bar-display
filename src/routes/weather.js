const router = require('express').Router();
const db = require('../db/database');

const WMO_MAP = {
  0:  { condition: 'Clear',          emoji: '☀️' },
  1:  { condition: 'Mostly Clear',   emoji: '🌤️' },
  2:  { condition: 'Partly Cloudy',  emoji: '⛅' },
  3:  { condition: 'Cloudy',         emoji: '☁️' },
  45: { condition: 'Foggy',          emoji: '🌫️' },
  48: { condition: 'Foggy',          emoji: '🌫️' },
  51: { condition: 'Light Drizzle',  emoji: '🌦️' },
  53: { condition: 'Drizzle',        emoji: '🌦️' },
  55: { condition: 'Heavy Drizzle',  emoji: '🌦️' },
  56: { condition: 'Freezing Drizzle', emoji: '🌦️' },
  57: { condition: 'Freezing Drizzle', emoji: '🌦️' },
  61: { condition: 'Light Rain',     emoji: '🌧️' },
  63: { condition: 'Rainy',          emoji: '🌧️' },
  65: { condition: 'Heavy Rain',     emoji: '🌧️' },
  66: { condition: 'Freezing Rain',  emoji: '🌧️' },
  67: { condition: 'Freezing Rain',  emoji: '🌧️' },
  71: { condition: 'Light Snow',     emoji: '❄️' },
  73: { condition: 'Snowy',          emoji: '❄️' },
  75: { condition: 'Heavy Snow',     emoji: '❄️' },
  77: { condition: 'Snow Grains',    emoji: '❄️' },
  80: { condition: 'Showers',        emoji: '🌧️' },
  81: { condition: 'Showers',        emoji: '🌧️' },
  82: { condition: 'Heavy Showers',  emoji: '🌧️' },
  95: { condition: 'Thunderstorm',   emoji: '⛈️' },
  96: { condition: 'Thunderstorm',   emoji: '⛈️' },
  99: { condition: 'Thunderstorm',   emoji: '⛈️' },
};

let cache = null;

router.get('/', async (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('weather_zip');
    const zip = row?.value?.trim();

    if (!zip) return res.json({ enabled: false });

    const now = Date.now();
    if (cache && cache.zip === zip && now - cache.fetchedAt < 10 * 60 * 1000) {
      return res.json(cache.data);
    }

    const geoRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!geoRes.ok) return res.json({ enabled: false });
    const geo = await geoRes.json();

    const place = geo.places[0];
    const lat = parseFloat(place.latitude);
    const lon = parseFloat(place.longitude);
    const city = `${place['place name']}, ${place['state abbreviation']}`;

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
    );
    if (!weatherRes.ok) return res.json({ enabled: false });
    const weatherData = await weatherRes.json();

    const temp = Math.round(weatherData.current.temperature_2m);
    const code = weatherData.current.weather_code;
    const { condition, emoji } = WMO_MAP[code] || { condition: 'Unknown', emoji: '🌡️' };

    const data = { enabled: true, temp, unit: 'F', condition, emoji, city };
    cache = { zip, data, fetchedAt: now };

    res.json(data);
  } catch {
    res.json({ enabled: false });
  }
});

module.exports = router;
