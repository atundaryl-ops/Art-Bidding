const path          = require('path');
const SqliteWrapper = require('./sqlite-wrapper');

const DB_PATH = path.join(__dirname, '../../auction.db');
let db;

function getDb() {
  if (!db) {
    db = new SqliteWrapper(DB_PATH);
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bidders (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      email           TEXT UNIQUE NOT NULL,
      phone           TEXT,
      bidder_number   TEXT UNIQUE NOT NULL,
      password_hash   TEXT NOT NULL,
      created_at      DATETIME DEFAULT (datetime('now'))
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
      created_at        DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auctions (
      id               TEXT PRIMARY KEY,
      title            TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      status           TEXT DEFAULT 'pending'
                         CHECK(status IN ('pending','active','ended')),
      started_at       DATETIME,
      ends_at          DATETIME,
      created_at       DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bids (
      id          TEXT PRIMARY KEY,
      auction_id  TEXT NOT NULL REFERENCES auctions(id),
      painting_id TEXT NOT NULL REFERENCES paintings(id),
      bidder_id   TEXT NOT NULL REFERENCES bidders(id),
      amount      REAL NOT NULL,
      placed_at   DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auction_paintings (
      auction_id  TEXT NOT NULL REFERENCES auctions(id),
      painting_id TEXT NOT NULL REFERENCES paintings(id),
      PRIMARY KEY (auction_id, painting_id)
    );
  `);
}

module.exports = { getDb };
