export default async function handler(req, res) {
  const { lat, lon, units } = req.query;
  const API_KEY = process.env.API_KEY;
  
  let url = `https://api.openweathermap.org/data/2.5/forecast?appid=${API_KEY}&lat=${lat}&lon=${lon}`;
  if (units) url += `&units=${units}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
