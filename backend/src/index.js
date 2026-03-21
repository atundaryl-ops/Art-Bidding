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
const { getDb } = require('./db/database');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || origin.endsWith('.vercel.app') || origin === 'http://localhost:3000') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling'],
  allowEIO3: true
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'https://art-bidding-xm4g.vercel.app',
      'http://localhost:3000'
    ];
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  message: { error: 'Too many requests, please try again later' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later' }
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// Initialize DB
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bidders', bidderRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/auctions', auctionRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup WebSocket bidding
setupSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🎨 Auction Server running on http://localhost:${PORT}`);
  console.log(`   Admin credentials: ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}`);
});
