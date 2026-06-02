const bcrypt = require('bcryptjs');
const { db } = require('../db');

const SALT_ROUNDS = 12;

function getNextUserId() {
  const users = db.data?.users || [];
  if (!users.length) return 1;
  return Math.max(...users.map((u) => parseInt(u.id) || 0)) + 1;
}

async function createUser({ email, studentId, name, password, role = 'user' }) {
  await db.read();
  db.data = db.data || { users: [], items: [], messages: [] };

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = String(getNextUserId());

  const user = {
    id,
    email: (email || '').toLowerCase().trim(),
    studentId,
    name,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.data.users.push(user);
  await db.write();

  return {
    id: user.id,
    email: user.email,
    studentId: user.studentId,
    name: user.name,
    role: user.role,
  };
}

async function findByEmail(email) {
  if (!email) return null;
  await db.read();
  const users = db.data?.users || [];
  return users.find((u) => u.email === email.toLowerCase().trim());
}

async function findById(id) {
  if (!id) return null;
  await db.read();
  const users = db.data?.users || [];
  return users.find((u) => String(u.id) === String(id));
}

async function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  verifyPassword,
};
