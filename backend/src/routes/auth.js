const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
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
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
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
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, password } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM bidders WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();

    // Generate unique bidder number
    const count = db.prepare('SELECT COUNT(*) as c FROM bidders').get().c;
    const bidderNumber = String(count + 1).padStart(4, '0');

    db.prepare(`
      INSERT INTO bidders (id, name, email, phone, bidder_number, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, email, phone || null, bidderNumber, passwordHash);

    const token = signToken({ role: 'bidder', id, name, bidderNumber });
    res.status(201).json({ token, role: 'bidder', bidderNumber, name });
  }
);

// Bidder login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const db = getDb();

    const bidder = db.prepare('SELECT * FROM bidders WHERE email = ?').get(email);
    if (!bidder) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, bidder.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ role: 'bidder', id: bidder.id, name: bidder.name, bidderNumber: bidder.bidder_number });
    res.json({ token, role: 'bidder', bidderNumber: bidder.bidder_number, name: bidder.name });
  }
);

module.exports = router;
