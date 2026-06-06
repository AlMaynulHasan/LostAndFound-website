const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Use Render's persistent disk (/data) in production, local ./data otherwise
const dataDir = process.env.NODE_ENV === 'production' && require('fs').existsSync('/data')
  ? '/data'
  : path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'lost2found.sqlite');
const schemaFile = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbFile);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

function initSchema() {
  const schema = fs.readFileSync(schemaFile, 'utf8');
  sqlite.exec(schema);
}

function get(sql, params = []) {
  return sqlite.prepare(sql).get(params);
}

function all(sql, params = []) {
  return sqlite.prepare(sql).all(params);
}

function run(sql, params = []) {
  return sqlite.prepare(sql).run(params);
}

function transaction(fn) {
  return sqlite.transaction(fn);
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function stringifyJson(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

module.exports = {
  sqlite,
  dbFile,
  initSchema,
  get,
  all,
  run,
  transaction,
  parseJson,
  stringifyJson,
};
