export default function WeatherWidget({ weather }) {
  if (!weather?.enabled) return null;

  return (
    <div className="weather-widget">
      <div className="weather-temp">{weather.temp}°{weather.unit}</div>
      <div className="weather-condition">{weather.emoji}  {weather.condition}</div>
      <div className="weather-city">{weather.city}</div>
    </div>
  );
}
