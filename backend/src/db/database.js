const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bidders (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      email           TEXT UNIQUE NOT NULL,
      phone           TEXT,
      bidder_number   TEXT UNIQUE NOT NULL,
      alias           TEXT,
      password_hash   TEXT NOT NULL,
      created_at      TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS paintings (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      artist            TEXT NOT NULL,
      description       TEXT,
      image_url         TEXT,
      starting_bid      REAL NOT NULL,
      bid_increment     REAL NOT NULL DEFAULT 50,
      current_bid       REAL,
      current_winner_id TEXT REFERENCES bidders(id),
      status            TEXT DEFAULT 'pending'
                          CHECK(status IN ('pending','active','sold','unsold')),
      created_at        TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS auctions (
      id               TEXT PRIMARY KEY,
      title            TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      status           TEXT DEFAULT 'pending'
                         CHECK(status IN ('pending','active','ended')),
      started_at       TIMESTAMP,
      ends_at          TIMESTAMP,
      created_at       TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bids (
      id          TEXT PRIMARY KEY,
      auction_id  TEXT NOT NULL REFERENCES auctions(id),
      painting_id TEXT NOT NULL REFERENCES paintings(id),
      bidder_id   TEXT NOT NULL REFERENCES bidders(id),
      amount      REAL NOT NULL,
      placed_at   TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS auction_paintings (
      auction_id  TEXT NOT NULL REFERENCES auctions(id),
      painting_id TEXT NOT NULL REFERENCES paintings(id),
      PRIMARY KEY (auction_id, painting_id)
    );
  `);
  console.log('✅ Database schema ready');
}

module.exports = { pool, initSchema };
