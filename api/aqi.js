const { aqi } = require('./_openMeteo');

module.exports = async function handler(req, res) {
  try {
    return res.status(200).json(await aqi(req.query));
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load air quality data.' });
  }
};
