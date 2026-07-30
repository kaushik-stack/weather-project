const weatherCodes = {
  0: ['Clear', 'clear sky', '01d'], 1: ['Clear', 'mainly clear', '01d'],
  2: ['Clouds', 'partly cloudy', '02d'], 3: ['Clouds', 'overcast', '04d'],
  45: ['Fog', 'fog', '50d'], 48: ['Fog', 'rime fog', '50d'],
  51: ['Drizzle', 'light drizzle', '09d'], 53: ['Drizzle', 'drizzle', '09d'],
  55: ['Drizzle', 'heavy drizzle', '09d'], 61: ['Rain', 'slight rain', '10d'],
  63: ['Rain', 'rain', '10d'], 65: ['Rain', 'heavy rain', '10d'],
  71: ['Snow', 'slight snow', '13d'], 73: ['Snow', 'snow', '13d'],
  75: ['Snow', 'heavy snow', '13d'], 80: ['Rain', 'rain showers', '09d'],
  81: ['Rain', 'rain showers', '09d'], 82: ['Rain', 'violent rain showers', '09d'],
  95: ['Thunderstorm', 'thunderstorm', '11d'], 96: ['Thunderstorm', 'thunderstorm with hail', '11d'],
  99: ['Thunderstorm', 'thunderstorm with hail', '11d']
};

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
  return response.json();
}

function unitParams(units) {
  return units === 'imperial'
    ? 'temperature_unit=fahrenheit&wind_speed_unit=mph'
    : 'temperature_unit=celsius&wind_speed_unit=kmh';
}

async function location(query) {
  if (query.lat && query.lon) return { lat: Number(query.lat), lon: Number(query.lon) };
  if (!query.q) throw new Error('Provide a city or coordinates.');
  const data = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.q)}&count=1&language=en&format=json`);
  if (!data.results?.length) throw new Error('City not found.');
  const place = data.results[0];
  return { lat: place.latitude, lon: place.longitude, name: place.name, country: place.country_code || place.country || '' };
}

async function current(query) {
  const place = await location(query);
  const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure&hourly=visibility&timezone=auto&${unitParams(query.units)}`);
  const c = data.current;
  const code = weatherCodes[c.weather_code] || weatherCodes[0];
  const visibilityIndex = data.hourly.time.findIndex(time => time === c.time);
  return {
    name: place.name || data.timezone?.split('/').pop().replace(/_/g, ' ') || 'Current location',
    sys: { country: place.country || '' }, coord: { lon: place.lon, lat: place.lat },
    weather: [{ main: code[0], description: code[1], icon: code[2] }],
    main: { temp: c.temperature_2m, feels_like: c.apparent_temperature, humidity: c.relative_humidity_2m, pressure: Math.round(c.surface_pressure) },
    wind: { speed: query.units === 'imperial' ? c.wind_speed_10m / 2.23694 : c.wind_speed_10m / 3.6 },
    visibility: visibilityIndex >= 0 ? data.hourly.visibility[visibilityIndex] : undefined
  };
}

async function forecast(query) {
  const { lat, lon } = await location(query);
  const data = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=6&timezone=auto&${unitParams(query.units)}`);
  const list = data.hourly.time.filter((_, i) => i % 3 === 0).map((time, i) => {
    const index = i * 3, code = weatherCodes[data.hourly.weather_code[index]] || weatherCodes[0];
    return { dt: Math.floor(new Date(time).getTime() / 1000), main: { temp: data.hourly.temperature_2m[index] }, weather: [{ main: code[0], description: code[1], icon: code[2] }], pop: (data.hourly.precipitation_probability[index] || 0) / 100 };
  });
  return { list };
}

async function aqi(query) {
  const { lat, lon } = await location(query);
  const data = await json(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
  const value = data.current?.us_aqi || 0;
  return { list: [{ main: { aqi: value <= 50 ? 1 : value <= 100 ? 2 : value <= 150 ? 3 : value <= 200 ? 4 : 5 } }] };
}

module.exports = { current, forecast, aqi };
