const fs = require('fs');
const path = require('path');

// ── Turso (production) vs better-sqlite3 (local) ──────────────────────────
const useTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let _client = null;   // Turso async client
let _sqlite = null;   // better-sqlite3 sync client

if (useTurso) {
  const { createClient } = require('@libsql/client');
  _client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('[DB] Using Turso remote database');
} else {
  const Database = require('better-sqlite3');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbFile = path.join(dataDir, 'lost2found.sqlite');
  _sqlite = new Database(dbFile);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');
  console.log('[DB] Using local SQLite:', dbFile);
}

// ── Schema ─────────────────────────────────────────────────────────────────
const schemaFile = path.join(__dirname, 'schema.sql');

async function initSchema() {
  const schema = fs.readFileSync(schemaFile, 'utf8');
  // Split on semicolons, run each statement
  const stmts = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (useTurso) {
    for (const stmt of stmts) {
      await _client.execute(stmt + ';');
    }
  } else {
    _sqlite.exec(schema);
  }
}

// ── Core query helpers ─────────────────────────────────────────────────────
// All return Promises so callers can await them uniformly.

async function get(sql, params = []) {
  if (useTurso) {
    const rs = await _client.execute({ sql, args: params });
    if (!rs.rows.length) return undefined;
    return rowToObject(rs.columns, rs.rows[0]);
  }
  return _sqlite.prepare(sql).get(params);
}

async function all(sql, params = []) {
  if (useTurso) {
    const rs = await _client.execute({ sql, args: params });
    return rs.rows.map(row => rowToObject(rs.columns, row));
  }
  return _sqlite.prepare(sql).all(params);
}

async function run(sql, params = []) {
  if (useTurso) {
    const rs = await _client.execute({ sql, args: params });
    return { changes: rs.rowsAffected, lastInsertRowid: rs.lastInsertRowid };
  }
  return _sqlite.prepare(sql).run(params);
}

async function transaction(fn) {
  if (useTurso) {
    // Turso: wrap in interactive transaction
    const tx = await _client.transaction('write');
    try {
      await fn(tx);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } else {
    return _sqlite.transaction(fn)();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function rowToObject(columns, row) {
  const obj = {};
  columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function stringifyJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

module.exports = {
  sqlite: _sqlite,   // may be null in Turso mode
  client: _client,   // may be null in local mode
  useTurso,
  initSchema,
  get,
  all,
  run,
  transaction,
  parseJson,
  stringifyJson,
};
