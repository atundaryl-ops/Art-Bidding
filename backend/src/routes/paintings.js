const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/database');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
      FROM paintings p
      LEFT JOIN bidders b ON b.id = p.current_winner_id
      ORDER BY p.created_at
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
      FROM paintings p
      LEFT JOIN bidders b ON b.id = p.current_winner_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', requireAdmin,
  body('title').trim().notEmpty(),
  body('artist').trim().notEmpty(),
  body('starting_bid').isFloat({ min: 0 }),
  body('bid_increment').optional().isFloat({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, artist, description, image_url, starting_bid, bid_increment } = req.body;
    try {
      const id = uuidv4();
      await pool.query(
        `INSERT INTO paintings (id, title, artist, description, image_url, starting_bid, bid_increment)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, title, artist, description || null, image_url || null, starting_bid, bid_increment || 50]
      );
      const result = await pool.query('SELECT * FROM paintings WHERE id = $1', [id]);
      res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Failed to create painting' }); }
  }
);

router.put('/:id', requireAdmin,
  body('title').optional().trim().notEmpty(),
  body('artist').optional().trim().notEmpty(),
  body('starting_bid').optional().isFloat({ min: 0 }),
  body('bid_increment').optional().isFloat({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, artist, description, image_url, starting_bid, bid_increment } = req.body;
    try {
      await pool.query(`
        UPDATE paintings SET
          title = COALESCE($1, title),
          artist = COALESCE($2, artist),
          description = COALESCE($3, description),
          image_url = COALESCE($4, image_url),
          starting_bid = COALESCE($5, starting_bid),
          bid_increment = COALESCE($6, bid_increment)
        WHERE id = $7
      `, [title, artist, description, image_url, starting_bid, bid_increment, req.params.id]);
      const result = await pool.query('SELECT * FROM paintings WHERE id = $1', [req.params.id]);
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Failed to update' }); }
  }
);

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM paintings WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Cannot delete painting in use' }); }
});

router.get('/:id/bids', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bids.*, b.name as bidder_name, b.bidder_number
      FROM bids
      JOIN bidders b ON b.id = bids.bidder_id
      WHERE bids.painting_id = $1
      ORDER BY bids.placed_at DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
