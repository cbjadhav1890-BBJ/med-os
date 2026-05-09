const express = require('express');
const router = express.Router();
const { knex } = require('./db');

router.get('/health', async (req, res) => {
  try {
    await knex.raw('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString(), database: 'disconnected', error: err.message });
  }
});

module.exports = router;