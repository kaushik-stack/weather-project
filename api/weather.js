const { current } = require('./_openMeteo');

module.exports = async function handler(req, res) {
  try {
    return res.status(200).json(await current(req.query));
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load weather data.' });
  }
};
