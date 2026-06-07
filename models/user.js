const bcrypt = require('bcryptjs');
const { get, run, all } = require('../db/sqlite');

const SALT_ROUNDS = 12;

function rowToUser(row) {
  return row ? { ...row } : null;
}

async function getNextUserId() {
  const row = await get('SELECT MAX(CAST(id AS INTEGER)) AS maxId FROM users');
  return String((row?.maxId || 0) + 1);
}

async function createUser({ email, studentId, name, password, role = 'user' }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();
  const id = await getNextUserId();

  await run(
    `INSERT INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, (email || '').toLowerCase().trim(), studentId, name, passwordHash, role, now, now]
  );

  return { id, email: (email || '').toLowerCase().trim(), studentId, name, role };
}

async function findByEmail(email) {
  if (!email) return null;
  return rowToUser(await get('SELECT * FROM users WHERE email = ?', [(email || '').toLowerCase().trim()]));
}

async function findById(id) {
  if (!id) return null;
  return rowToUser(await get('SELECT * FROM users WHERE id = ?', [String(id)]));
}

async function findAdmins() {
  const rows = await all('SELECT * FROM users WHERE role = ? ORDER BY name', ['admin']);
  return rows.map(rowToUser);
}

async function upsertUser({ id, email, studentId, name, passwordHash, role = 'user', createdAt, updatedAt }) {
  const userId = id ? String(id) : await getNextUserId();
  const now = new Date().toISOString();
  await run(
    `INSERT INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email, studentId = excluded.studentId,
       name = excluded.name, passwordHash = excluded.passwordHash,
       role = excluded.role, updatedAt = excluded.updatedAt`,
    [userId, (email || '').toLowerCase().trim(), studentId || null,
     name || 'User', passwordHash, role,
     createdAt || now, updatedAt || now]
  );
  return findById(userId);
}

async function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

module.exports = { createUser, findByEmail, findById, findAdmins, upsertUser, verifyPassword };
