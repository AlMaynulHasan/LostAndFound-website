/**
 * Custom express-session store backed by Turso (libSQL).
 * Works in both Turso mode and local better-sqlite3 mode.
 */
const session = require('express-session');
const { get, run, all } = require('../db/sqlite');

class TursoSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || 60 * 60 * 24 * 14; // 14 days in seconds
    // Cleanup expired sessions every hour
    setInterval(() => this._cleanup(), 60 * 60 * 1000);
  }

  async _cleanup() {
    try {
      await run('DELETE FROM sessions WHERE expired < ?', [Date.now()]);
    } catch (e) {
      // ignore cleanup errors
    }
  }

  async get(sid, callback) {
    try {
      const row = await get(
        'SELECT sess, expired FROM sessions WHERE sid = ?',
        [sid]
      );
      if (!row) return callback(null, null);
      if (row.expired < Date.now()) {
        await run('DELETE FROM sessions WHERE sid = ?', [sid]);
        return callback(null, null);
      }
      const sess = typeof row.sess === 'string' ? JSON.parse(row.sess) : row.sess;
      callback(null, sess);
    } catch (e) {
      callback(e);
    }
  }

  async set(sid, sess, callback) {
    try {
      const ttl = this.ttl;
      const expired = Date.now() + ttl * 1000;
      const sessStr = JSON.stringify(sess);
      await run(
        `INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired`,
        [sid, sessStr, expired]
      );
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  async destroy(sid, callback) {
    try {
      await run('DELETE FROM sessions WHERE sid = ?', [sid]);
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  async touch(sid, sess, callback) {
    try {
      const expired = Date.now() + this.ttl * 1000;
      await run(
        'UPDATE sessions SET expired = ? WHERE sid = ?',
        [expired, sid]
      );
      callback(null);
    } catch (e) {
      callback(e);
    }
  }

  async length(callback) {
    try {
      const row = await get('SELECT COUNT(*) as count FROM sessions WHERE expired > ?', [Date.now()]);
      callback(null, row?.count || 0);
    } catch (e) {
      callback(e);
    }
  }

  async clear(callback) {
    try {
      await run('DELETE FROM sessions');
      callback(null);
    } catch (e) {
      callback(e);
    }
  }
}

module.exports = TursoSessionStore;
