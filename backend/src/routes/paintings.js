const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get all paintings (authenticated)
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const paintings = db.prepare(`
    SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
    FROM paintings p
    LEFT JOIN bidders b ON b.id = p.current_winner_id
    ORDER BY p.created_at
  `).all();
  res.json(paintings);
});

// Get single painting
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const painting = db.prepare(`
    SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
    FROM paintings p
    LEFT JOIN bidders b ON b.id = p.current_winner_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!painting) return res.status(404).json({ error: 'Painting not found' });
  res.json(painting);
});

// Create painting (admin)
router.post('/',
  requireAdmin,
  body('title').trim().notEmpty(),
  body('artist').trim().notEmpty(),
  body('starting_bid').isFloat({ min: 0 }),
  body('bid_increment').optional().isFloat({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, artist, description, image_url, starting_bid, bid_increment } = req.body;
    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO paintings (id, title, artist, description, image_url, starting_bid, bid_increment)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, artist, description || null, image_url || null, starting_bid, bid_increment || 50);

    const painting = db.prepare('SELECT * FROM paintings WHERE id = ?').get(id);
    res.status(201).json(painting);
  }
);

// Update painting (admin)
router.put('/:id',
  requireAdmin,
  body('title').optional().trim().notEmpty(),
  body('artist').optional().trim().notEmpty(),
  body('starting_bid').optional().isFloat({ min: 0 }),
  body('bid_increment').optional().isFloat({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db = getDb();
    const painting = db.prepare('SELECT * FROM paintings WHERE id = ?').get(req.params.id);
    if (!painting) return res.status(404).json({ error: 'Painting not found' });

    const { title, artist, description, image_url, starting_bid, bid_increment } = req.body;

    db.prepare(`
      UPDATE paintings SET
        title = COALESCE(?, title),
        artist = COALESCE(?, artist),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        starting_bid = COALESCE(?, starting_bid),
        bid_increment = COALESCE(?, bid_increment)
      WHERE id = ?
    `).run(title, artist, description, image_url, starting_bid, bid_increment, req.params.id);

    res.json(db.prepare('SELECT * FROM paintings WHERE id = ?').get(req.params.id));
  }
);

// Delete painting (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM paintings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Painting not found' });
  res.json({ success: true });
});

// Get bid history for a painting
router.get('/:id/bids', requireAuth, (req, res) => {
  const db = getDb();
  const bids = db.prepare(`
    SELECT bids.*, b.name as bidder_name, b.bidder_number
    FROM bids
    JOIN bidders b ON b.id = bids.bidder_id
    WHERE bids.painting_id = ?
    ORDER BY bids.placed_at DESC
  `).all(req.params.id);
  res.json(bids);
});

module.exports = router;
