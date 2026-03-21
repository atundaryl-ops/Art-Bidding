# 🎨 ArtBid — Live Auction System

A full-stack real-time art auction platform built with React + Node.js/Express + Socket.io.

---

## Architecture

```
auction-system/
├── backend/          # Node.js + Express + Socket.io + SQLite
│   └── src/
│       ├── db/       # SQLite database + schema
│       ├── middleware/  # JWT auth
│       ├── routes/   # REST API routes
│       └── socket/   # WebSocket bidding logic
└── frontend/         # React + Vite + Tailwind
    └── src/
        ├── api/      # Axios client
        ├── components/  # UI components
        ├── context/  # Auth + Socket contexts
        ├── hooks/    # useCountdown
        └── pages/    # Login, Register, Auction, Admin
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env        # Edit credentials!
npm install
npm run dev                 # Runs on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # Runs on http://localhost:3000
```

---

## Environment Variables (backend/.env)

| Variable         | Description                              | Default        |
|------------------|------------------------------------------|----------------|
| PORT             | Server port                              | 4000           |
| JWT_SECRET       | **Change this in production!**           | (required)     |
| ADMIN_USERNAME   | Admin login username                     | admin          |
| ADMIN_PASSWORD   | Admin login password                     | admin123       |
| CLIENT_URL       | Frontend URL (for CORS)                  | http://localhost:3000 |

---

## Security Features

- ✅ JWT authentication (8h expiry)
- ✅ bcrypt password hashing (12 rounds)
- ✅ Helmet.js security headers
- ✅ CORS restricted to CLIENT_URL only
- ✅ Rate limiting (100 req/15min general, 20 req/15min on auth)
- ✅ Input validation with express-validator
- ✅ SQL injection prevention via parameterized queries
- ✅ Role-based access (admin vs bidder)
- ✅ Socket.io JWT auth middleware
- ✅ Request body size limit (10kb)
- ✅ SQLite WAL mode + foreign keys enforced

---

## User Flows

### Admin
1. Log in at `/login` → Admin tab
2. Go to **Paintings** tab → Add paintings (title, artist, start bid, increment, image URL)
3. Go to **Auctions** tab → Create auction (select paintings + set duration)
4. Click **Start** → Bidders are instantly notified via WebSocket
5. Monitor live bids; manually end early or let timer auto-end
6. View **Results** tab for winner summary and revenue

### Bidder
1. Register at `/register` → get a bidder number (e.g. #0001)
2. Log in at `/login` → Bidder tab
3. See live auction with countdown timer
4. Click **Bid** on any painting → enter amount → submit
5. Real-time notifications when outbid or winning
6. See results when auction ends

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register bidder |
| POST | /api/auth/login | Bidder login |
| POST | /api/auth/admin/login | Admin login |

### Paintings (requires auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/paintings | List all |
| POST | /api/paintings | Create (admin) |
| PUT | /api/paintings/:id | Update (admin) |
| DELETE | /api/paintings/:id | Delete (admin) |
| GET | /api/paintings/:id/bids | Bid history |

### Auctions (requires auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auctions | List all |
| GET | /api/auctions/active | Active auction + paintings |
| POST | /api/auctions | Create (admin) |
| POST | /api/auctions/:id/start | Start (admin) |
| POST | /api/auctions/:id/end | End (admin) |
| GET | /api/auctions/:id/results | Results |

### WebSocket Events
| Event (emit) | Direction | Description |
|-------------|-----------|-------------|
| join_auction | client→server | Join auction room |
| place_bid | client→server | Place a bid |
| auction_started | admin→server | Notify start |
| auction_ended | admin→server | Notify end |
| bid_accepted | server→clients | Bid broadcast |
| bid_error | server→client | Bid rejected |
| auction_status | server→clients | Status change |

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a long random string (32+ chars)
- [ ] Change `ADMIN_PASSWORD` to something strong
- [ ] Set `CLIENT_URL` to your actual frontend domain
- [ ] Use a reverse proxy (Nginx) in front of Node.js
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Consider PostgreSQL for larger scale
- [ ] Set up proper logging (Winston/Pino)
- [ ] Add database backups
