const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/database');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// Admin login
router.post('/admin/login',
  body('username').notEmpty(),
  body('password').notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { username, password } = req.body;
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ role: 'admin', username });
    res.json({ token, role: 'admin' });
  }
);

// Bidder register
router.post('/register',
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('alias').optional().trim(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, phone, alias, password } = req.body;
    try {
      const existing = await pool.query('SELECT id FROM bidders WHERE email = $1', [email]);
      if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });
      const passwordHash = await bcrypt.hash(password, 12);
      const id = uuidv4();
      const count = await pool.query('SELECT COUNT(*) as c FROM bidders');
      const bidderNumber = String(parseInt(count.rows[0].c) + 1).padStart(4, '0');
      await pool.query(
        `INSERT INTO bidders (id, name, email, phone, bidder_number, alias, password_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, name, email, phone || null, bidderNumber, alias || null, passwordHash]
      );
      const token = signToken({ role: 'bidder', id, name, bidderNumber, alias: alias || null });
      res.status(201).json({ token, role: 'bidder', bidderNumber, name, alias: alias || null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Bidder login
router.post('/login',
  body('email').notEmpty(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM bidders WHERE email = $1', [email.toLowerCase()]);
      const bidder = result.rows[0];
      if (!bidder) return res.status(401).json({ error: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, bidder.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      const token = signToken({ role: 'bidder', id: bidder.id, name: bidder.name, bidderNumber: bidder.bidder_number, alias: bidder.alias });
      res.json({ token, role: 'bidder', bidderNumber: bidder.bidder_number, name: bidder.name, alias: bidder.alias });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;
