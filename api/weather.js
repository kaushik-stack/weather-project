module.exports = async function handler(req, res) {
  const { q, lat, lon, units } = req.query;
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server weather API key is not configured.' });
  }
  
  let url = `https://api.openweathermap.org/data/2.5/weather?appid=${API_KEY}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  else if (lat && lon) url += `&lat=${lat}&lon=${lon}`;
  if (units) url += `&units=${units}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
