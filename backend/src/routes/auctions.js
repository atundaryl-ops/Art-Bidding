const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/database');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM auctions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/active', requireAuth, async (req, res) => {
  try {
    const auctionResult = await pool.query(`SELECT * FROM auctions WHERE status = 'active' LIMIT 1`);
    if (!auctionResult.rows.length) return res.json(null);
    const auction = auctionResult.rows[0];
    const paintings = await pool.query(`
      SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
      FROM paintings p
      JOIN auction_paintings ap ON ap.painting_id = p.id
      LEFT JOIN bidders b ON b.id = p.current_winner_id
      WHERE ap.auction_id = $1
      ORDER BY p.created_at
    `, [auction.id]);
    res.json({ ...auction, paintings: paintings.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const auctionResult = await pool.query('SELECT * FROM auctions WHERE id = $1', [req.params.id]);
    if (!auctionResult.rows.length) return res.status(404).json({ error: 'Not found' });
    const auction = auctionResult.rows[0];
    const paintings = await pool.query(`
      SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
      FROM paintings p
      JOIN auction_paintings ap ON ap.painting_id = p.id
      LEFT JOIN bidders b ON b.id = p.current_winner_id
      WHERE ap.auction_id = $1
    `, [auction.id]);
    res.json({ ...auction, paintings: paintings.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', requireAdmin,
  body('title').trim().notEmpty(),
  body('duration_minutes').isInt({ min: 1 }),
  body('painting_ids').isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, duration_minutes, painting_ids } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = uuidv4();
      await client.query(
        'INSERT INTO auctions (id, title, duration_minutes) VALUES ($1,$2,$3)',
        [id, title, duration_minutes]
      );
      for (const pid of painting_ids) {
        await client.query(
          'INSERT INTO auction_paintings (auction_id, painting_id) VALUES ($1,$2)',
          [id, pid]
        );
      }
      await client.query('COMMIT');
      const result = await pool.query('SELECT * FROM auctions WHERE id = $1', [id]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Failed to create auction' });
    } finally { client.release(); }
  }
);

router.post('/:id/start', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const auctionResult = await client.query('SELECT * FROM auctions WHERE id = $1', [req.params.id]);
    if (!auctionResult.rows.length) return res.status(404).json({ error: 'Not found' });
    const auction = auctionResult.rows[0];
    if (auction.status !== 'pending') return res.status(400).json({ error: 'Already started or ended' });
    const active = await client.query(`SELECT id FROM auctions WHERE status = 'active'`);
    if (active.rows.length) return res.status(400).json({ error: 'Another auction is already active' });
    const now = new Date();
    const endsAt = new Date(now.getTime() + auction.duration_minutes * 60 * 1000);
    await client.query(
      `UPDATE auctions SET status = 'active', started_at = $1, ends_at = $2 WHERE id = $3`,
      [now, endsAt, auction.id]
    );
    await client.query(`
      UPDATE paintings SET status = 'active'
      WHERE id IN (SELECT painting_id FROM auction_paintings WHERE auction_id = $1)
    `, [auction.id]);
    await client.query('COMMIT');
    const result = await pool.query('SELECT * FROM auctions WHERE id = $1', [auction.id]);
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to start auction' });
  } finally { client.release(); }
});

router.post('/:id/end', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const auctionResult = await client.query('SELECT * FROM auctions WHERE id = $1', [req.params.id]);
    if (!auctionResult.rows.length) return res.status(404).json({ error: 'Not found' });
    if (auctionResult.rows[0].status !== 'active') return res.status(400).json({ error: 'Not active' });
    await client.query(`UPDATE auctions SET status = 'ended' WHERE id = $1`, [req.params.id]);
    await client.query(`
      UPDATE paintings SET status = CASE
        WHEN current_winner_id IS NOT NULL THEN 'sold'
        ELSE 'unsold'
      END
      WHERE id IN (SELECT painting_id FROM auction_paintings WHERE auction_id = $1)
    `, [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to end auction' });
  } finally { client.release(); }
});

router.get('/:id/results', requireAuth, async (req, res) => {
  try {
    const auctionResult = await pool.query('SELECT * FROM auctions WHERE id = $1', [req.params.id]);
    if (!auctionResult.rows.length) return res.status(404).json({ error: 'Not found' });
    const results = await pool.query(`
      SELECT p.id, p.title, p.artist, p.starting_bid, p.current_bid, p.status,
             b.name as winner_name, b.bidder_number as winner_number, b.email as winner_email
      FROM paintings p
      JOIN auction_paintings ap ON ap.painting_id = p.id
      LEFT JOIN bidders b ON b.id = p.current_winner_id
      WHERE ap.auction_id = $1
      ORDER BY p.title
    `, [req.params.id]);
    res.json({ auction: auctionResult.rows[0], results: results.rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
