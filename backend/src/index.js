require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const bidderRoutes = require('./routes/bidders');
const paintingRoutes = require('./routes/paintings');
const auctionRoutes = require('./routes/auctions');
const { setupSocket } = require('./socket/bidding');
const { initSchema } = require('./db/database');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling'],
  allowEIO3: true
});

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginOpenerPolicy: false }));
app.use(cors({ origin: '*', credentials: false }));
app.options('*', cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bidders', bidderRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/auctions', auctionRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup WebSocket
setupSocket(io);

const PORT = process.env.PORT || 4000;

// Init DB then start server
initSchema()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🎨 Auction Server running on http://localhost:${PORT}`);
      console.log(`   Admin: ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
