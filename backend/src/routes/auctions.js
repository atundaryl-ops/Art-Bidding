const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get all auctions
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const auctions = db.prepare('SELECT * FROM auctions ORDER BY created_at DESC').all();
  res.json(auctions);
});

// Get active auction with paintings
router.get('/active', requireAuth, (req, res) => {
  const db = getDb();
  const auction = db.prepare(`SELECT * FROM auctions WHERE status = 'active' LIMIT 1`).get();
  if (!auction) return res.json(null);

  const paintings = db.prepare(`
    SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
    FROM paintings p
    JOIN auction_paintings ap ON ap.painting_id = p.id
    LEFT JOIN bidders b ON b.id = p.current_winner_id
    WHERE ap.auction_id = ?
    ORDER BY p.created_at
  `).all(auction.id);

  res.json({ ...auction, paintings });
});

// Get single auction
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  const paintings = db.prepare(`
    SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
    FROM paintings p
    JOIN auction_paintings ap ON ap.painting_id = p.id
    LEFT JOIN bidders b ON b.id = p.current_winner_id
    WHERE ap.auction_id = ?
  `).all(auction.id);

  res.json({ ...auction, paintings });
});

// Create auction (admin)
router.post('/',
  requireAdmin,
  body('title').trim().notEmpty(),
  body('duration_minutes').isInt({ min: 1 }),
  body('painting_ids').isArray({ min: 1 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, duration_minutes, painting_ids } = req.body;
    const db = getDb();
    const id = uuidv4();

    const insertAuction = db.prepare(`
      INSERT INTO auctions (id, title, duration_minutes) VALUES (?, ?, ?)
    `);
    const insertPainting = db.prepare(`
      INSERT INTO auction_paintings (auction_id, painting_id) VALUES (?, ?)
    `);

    const tx = db.transaction(() => {
      insertAuction.run(id, title, duration_minutes);
      for (const pid of painting_ids) {
        insertPainting.run(id, pid);
      }
    });
    tx();

    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id);
    res.status(201).json(auction);
  }
);

// Start auction (admin)
router.post('/:id/start', requireAdmin, (req, res) => {
  const db = getDb();
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.status !== 'pending') return res.status(400).json({ error: 'Auction already started or ended' });

  // Only one active auction at a time
  const active = db.prepare(`SELECT id FROM auctions WHERE status = 'active'`).get();
  if (active) return res.status(400).json({ error: 'Another auction is already active' });

  const now = new Date();
  const endsAt = new Date(now.getTime() + auction.duration_minutes * 60 * 1000);

  db.prepare(`
    UPDATE auctions SET status = 'active', started_at = ?, ends_at = ? WHERE id = ?
  `).run(now.toISOString(), endsAt.toISOString(), auction.id);

  // Set all paintings in this auction to active
  const paintings = db.prepare('SELECT painting_id FROM auction_paintings WHERE auction_id = ?').all(auction.id);
  for (const p of paintings) {
    db.prepare(`UPDATE paintings SET status = 'active' WHERE id = ?`).run(p.painting_id);
  }

  res.json(db.prepare('SELECT * FROM auctions WHERE id = ?').get(auction.id));
});

// End auction (admin)
router.post('/:id/end', requireAdmin, (req, res) => {
  const db = getDb();
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });
  if (auction.status !== 'active') return res.status(400).json({ error: 'Auction is not active' });

  db.prepare(`UPDATE auctions SET status = 'ended' WHERE id = ?`).run(auction.id);

  // Finalize painting statuses
  const paintings = db.prepare(`
    SELECT p.* FROM paintings p
    JOIN auction_paintings ap ON ap.painting_id = p.id
    WHERE ap.auction_id = ?
  `).all(auction.id);

  for (const p of paintings) {
    const status = p.current_winner_id ? 'sold' : 'unsold';
    db.prepare(`UPDATE paintings SET status = ? WHERE id = ?`).run(status, p.id);
  }

  res.json({ success: true });
});

// Get auction results
router.get('/:id/results', requireAuth, (req, res) => {
  const db = getDb();
  const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
  if (!auction) return res.status(404).json({ error: 'Auction not found' });

  const results = db.prepare(`
    SELECT p.id, p.title, p.artist, p.starting_bid, p.current_bid, p.status,
           b.name as winner_name, b.bidder_number as winner_number, b.email as winner_email
    FROM paintings p
    JOIN auction_paintings ap ON ap.painting_id = p.id
    LEFT JOIN bidders b ON b.id = p.current_winner_id
    WHERE ap.auction_id = ?
    ORDER BY p.title
  `).all(auction.id);

  res.json({ auction, results });
});

module.exports = router;
