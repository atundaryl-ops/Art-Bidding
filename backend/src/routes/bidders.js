const express = require('express');
const { pool } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, bidder_number, alias, created_at FROM bidders ORDER BY bidder_number'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bidders' }); }
});

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, bidder_number, alias, created_at FROM bidders WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Bidder not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bidders WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Bidder not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Cannot delete bidder' }); }
});

module.exports = router;
