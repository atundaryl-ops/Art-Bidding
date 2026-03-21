const { getDb } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Track auction timers
const auctionTimers = new Map();

function setupSocket(io) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user.role} - ${socket.user.name || socket.user.username}`);

    // Join auction room
    socket.on('join_auction', (auctionId) => {
      socket.join(`auction:${auctionId}`);
      console.log(`[Socket] ${socket.id} joined auction:${auctionId}`);
    });

    // Place bid
    socket.on('place_bid', ({ auctionId, paintingId, amount }) => {
      if (socket.user.role !== 'bidder') {
        return socket.emit('bid_error', { message: 'Only bidders can place bids' });
      }

      const db = getDb();

      // Validate auction is active
      const auction = db.prepare(`SELECT * FROM auctions WHERE id = ? AND status = 'active'`).get(auctionId);
      if (!auction) {
        return socket.emit('bid_error', { message: 'Auction is not active' });
      }

      // Check auction hasn't expired
      if (new Date() > new Date(auction.ends_at)) {
        return socket.emit('bid_error', { message: 'Auction has ended' });
      }

      // Validate painting is in this auction and active
      const painting = db.prepare(`
        SELECT p.* FROM paintings p
        JOIN auction_paintings ap ON ap.painting_id = p.id
        WHERE p.id = ? AND ap.auction_id = ? AND p.status = 'active'
      `).get(paintingId, auctionId);

      if (!painting) {
        return socket.emit('bid_error', { message: 'Painting not found in this auction' });
      }

      // Calculate minimum bid
      const currentBid = painting.current_bid || painting.starting_bid;
      const minBid = painting.current_bid
        ? painting.current_bid + painting.bid_increment
        : painting.starting_bid;

      if (amount < minBid) {
        return socket.emit('bid_error', {
          message: `Bid must be at least ₱${minBid.toLocaleString()}`,
          minBid
        });
      }

      // Prevent bidding on own current winning bid
      if (painting.current_winner_id === socket.user.id) {
        return socket.emit('bid_error', { message: 'You are already the highest bidder' });
      }

      // Record bid
      const bidId = uuidv4();
      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO bids (id, auction_id, painting_id, bidder_id, amount)
          VALUES (?, ?, ?, ?, ?)
        `).run(bidId, auctionId, paintingId, socket.user.id, amount);

        db.prepare(`
          UPDATE paintings SET current_bid = ?, current_winner_id = ? WHERE id = ?
        `).run(amount, socket.user.id, paintingId);
      });
      tx();

      // Get updated painting
      const updated = db.prepare(`
        SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
        FROM paintings p
        LEFT JOIN bidders b ON b.id = p.current_winner_id
        WHERE p.id = ?
      `).get(paintingId);

      // Broadcast to all in auction room
      io.to(`auction:${auctionId}`).emit('bid_accepted', {
        paintingId,
        painting: updated,
        bid: {
          id: bidId,
          amount,
          bidderName: socket.user.name,
          bidderNumber: socket.user.bidderNumber,
          placedAt: new Date().toISOString()
        }
      });

      console.log(`[Bid] ${socket.user.name} bid ₱${amount} on "${updated.title}"`);
    });

    // Admin: start auction timer broadcast
    socket.on('auction_started', (auctionId) => {
      if (socket.user.role !== 'admin') return;

      const db = getDb();
      const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
      if (!auction) return;

      io.to(`auction:${auctionId}`).emit('auction_status', {
        status: 'active',
        auctionId,
        endsAt: auction.ends_at
      });

      // Auto-end timer
      const msLeft = new Date(auction.ends_at) - new Date();
      if (msLeft > 0) {
        const timer = setTimeout(() => {
          autoEndAuction(io, auctionId);
        }, msLeft);
        auctionTimers.set(auctionId, timer);
      }
    });

    // Admin: manually end auction
    socket.on('auction_ended', (auctionId) => {
      if (socket.user.role !== 'admin') return;

      if (auctionTimers.has(auctionId)) {
        clearTimeout(auctionTimers.get(auctionId));
        auctionTimers.delete(auctionId);
      }

      io.to(`auction:${auctionId}`).emit('auction_status', {
        status: 'ended',
        auctionId
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}

function autoEndAuction(io, auctionId) {
  const db = getDb();
  const auction = db.prepare(`SELECT * FROM auctions WHERE id = ? AND status = 'active'`).get(auctionId);
  if (!auction) return;

  db.prepare(`UPDATE auctions SET status = 'ended' WHERE id = ?`).run(auctionId);

  const paintings = db.prepare(`
    SELECT p.* FROM paintings p
    JOIN auction_paintings ap ON ap.painting_id = p.id
    WHERE ap.auction_id = ?
  `).all(auctionId);

  for (const p of paintings) {
    db.prepare(`UPDATE paintings SET status = ? WHERE id = ?`).run(
      p.current_winner_id ? 'sold' : 'unsold', p.id
    );
  }

  io.to(`auction:${auctionId}`).emit('auction_status', { status: 'ended', auctionId });
  console.log(`[Auction] Auto-ended auction ${auctionId}`);
}

module.exports = { setupSocket };
