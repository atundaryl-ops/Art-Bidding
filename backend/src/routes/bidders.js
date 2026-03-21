const express = require('express');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List all bidders
router.get('/', requireAdmin, (req, res) => {
  const db = getDb();
  const bidders = db.prepare(`
    SELECT id, name, email, phone, bidder_number, created_at FROM bidders ORDER BY bidder_number
  `).all();
  res.json(bidders);
});

// Get single bidder
router.get('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const bidder = db.prepare(`
    SELECT id, name, email, phone, bidder_number, created_at FROM bidders WHERE id = ?
  `).get(req.params.id);
  if (!bidder) return res.status(404).json({ error: 'Bidder not found' });
  res.json(bidder);
});

// Delete bidder
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM bidders WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Bidder not found' });
  res.json({ success: true });
});

module.exports = router;
