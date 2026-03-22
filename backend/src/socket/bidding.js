const { pool } = require('../db/database');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const auctionTimers = new Map();

function setupSocket(io) {
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

    socket.on('join_auction', (auctionId) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('place_bid', async ({ auctionId, paintingId, amount }) => {
      if (socket.user.role !== 'bidder') {
        return socket.emit('bid_error', { message: 'Only bidders can place bids' });
      }
      try {
        const auctionResult = await pool.query(
          `SELECT * FROM auctions WHERE id = $1 AND status = 'active'`, [auctionId]
        );
        if (!auctionResult.rows.length) {
          return socket.emit('bid_error', { message: 'Auction is not active' });
        }
        const auction = auctionResult.rows[0];
        if (new Date() > new Date(auction.ends_at)) {
          return socket.emit('bid_error', { message: 'Auction has ended' });
        }

        const paintingResult = await pool.query(`
          SELECT p.* FROM paintings p
          JOIN auction_paintings ap ON ap.painting_id = p.id
          WHERE p.id = $1 AND ap.auction_id = $2 AND p.status = 'active'
        `, [paintingId, auctionId]);

        if (!paintingResult.rows.length) {
          return socket.emit('bid_error', { message: 'Painting not found in this auction' });
        }
        const painting = paintingResult.rows[0];

        const minBid = painting.current_bid
          ? painting.current_bid + painting.bid_increment
          : painting.starting_bid;

        if (amount < minBid) {
          return socket.emit('bid_error', {
            message: `Bid must be at least ₱${minBid.toLocaleString()}`,
            minBid
          });
        }

        if (painting.current_winner_id === socket.user.id) {
          return socket.emit('bid_error', { message: 'You are already the highest bidder' });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const bidId = uuidv4();
          await client.query(
            'INSERT INTO bids (id, auction_id, painting_id, bidder_id, amount) VALUES ($1,$2,$3,$4,$5)',
            [bidId, auctionId, paintingId, socket.user.id, amount]
          );
          await client.query(
            'UPDATE paintings SET current_bid = $1, current_winner_id = $2 WHERE id = $3',
            [amount, socket.user.id, paintingId]
          );
          await client.query('COMMIT');

          const updatedResult = await pool.query(`
            SELECT p.*, b.name as winner_name, b.bidder_number as winner_number
            FROM paintings p
            LEFT JOIN bidders b ON b.id = p.current_winner_id
            WHERE p.id = $1
          `, [paintingId]);
          const updated = updatedResult.rows[0];

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
        } catch (err) {
          await client.query('ROLLBACK');
          socket.emit('bid_error', { message: 'Failed to place bid, please try again' });
        } finally { client.release(); }

      } catch (err) {
        console.error('[Bid error]', err);
        socket.emit('bid_error', { message: 'Server error' });
      }
    });

    socket.on('auction_started', async (auctionId) => {
      if (socket.user.role !== 'admin') return;
      try {
        const result = await pool.query('SELECT * FROM auctions WHERE id = $1', [auctionId]);
        if (!result.rows.length) return;
        const auction = result.rows[0];
        io.to(`auction:${auctionId}`).emit('auction_status', {
          status: 'active', auctionId, endsAt: auction.ends_at
        });
        const msLeft = new Date(auction.ends_at) - new Date();
        if (msLeft > 0) {
          const timer = setTimeout(() => autoEndAuction(io, auctionId), msLeft);
          auctionTimers.set(auctionId, timer);
        }
      } catch (err) { console.error(err); }
    });

    socket.on('auction_ended', (auctionId) => {
      if (socket.user.role !== 'admin') return;
      if (auctionTimers.has(auctionId)) {
        clearTimeout(auctionTimers.get(auctionId));
        auctionTimers.delete(auctionId);
      }
      io.to(`auction:${auctionId}`).emit('auction_status', { status: 'ended', auctionId });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}

async function autoEndAuction(io, auctionId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT * FROM auctions WHERE id = $1 AND status = 'active'`, [auctionId]);
    if (!result.rows.length) return;
    await client.query(`UPDATE auctions SET status = 'ended' WHERE id = $1`, [auctionId]);
    await client.query(`
      UPDATE paintings SET status = CASE
        WHEN current_winner_id IS NOT NULL THEN 'sold' ELSE 'unsold'
      END
      WHERE id IN (SELECT painting_id FROM auction_paintings WHERE auction_id = $1)
    `, [auctionId]);
    await client.query('COMMIT');
    io.to(`auction:${auctionId}`).emit('auction_status', { status: 'ended', auctionId });
    console.log(`[Auction] Auto-ended ${auctionId}`);
  } catch (err) {
    await client.query('ROLLBACK');
  } finally { client.release(); }
}

module.exports = { setupSocket };
