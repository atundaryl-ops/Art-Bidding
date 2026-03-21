/**
 * SqliteWrapper — wraps node-sqlite3-wasm to match better-sqlite3 API.
 * Pure WebAssembly, zero native compilation. Works on Windows/macOS/Linux.
 *
 * Supported API (matches better-sqlite3):
 *   db.exec(sql)
 *   db.prepare(sql).run(...params)  → { changes, lastInsertRowid }
 *   db.prepare(sql).get(...params)  → object | undefined
 *   db.prepare(sql).all(...params)  → object[]
 *   db.transaction(fn)              → wrapped fn
 */
const { Database } = require('node-sqlite3-wasm');

class Statement {
  constructor(db, sql) {
    this._db  = db;
    this._sql = sql;
  }

  _params(args) {
    if (!args.length) return undefined;
    // If single plain object → named params as array of values isn't supported;
    // node-sqlite3-wasm uses positional arrays, so convert named params
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      return Object.values(args[0]).map(v => v === undefined ? null : v);
    }
    return args.map(v => v === undefined ? null : v);
  }

  run(...args) {
    const p = this._params(args);
    this._db._db.run(this._sql, p);
    return { changes: this._db._db.changes, lastInsertRowid: this._db._db.lastInsertRowid };
  }

  get(...args) {
    const p = this._params(args);
    const r = this._db._db.get(this._sql, p); return r === null ? undefined : r;
  }

  all(...args) {
    const p = this._params(args);
    return this._db._db.all(this._sql, p);
  }
}

class SqliteWrapper {
  constructor(filePath) {
    this._filePath = filePath;
    this._db = new Database(filePath);
    this._db.exec('PRAGMA foreign_keys = ON');
  }

  exec(sql) {
    this._db.exec(sql);
    return this;
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  transaction(fn) {
    return (...args) => {
      this._db.exec('BEGIN');
      try {
        const result = fn(...args);
        this._db.exec('COMMIT');
        return result;
      } catch (err) {
        try { this._db.exec('ROLLBACK'); } catch (_) {}
        throw err;
      }
    };
  }

  close() {
    this._db.close();
  }
}

module.exports = SqliteWrapper;
