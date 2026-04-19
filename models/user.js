const bcrypt = require('bcryptjs');
const { readCollection, writeCollection } = require('../db');
const { nanoid } = require('nanoid');

const SALT_ROUNDS = 12;

async function createUser({ email, studentId, name, password, role = 'user' }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const users = await readCollection('users');
  
  const user = {
    id: nanoid(),
    email: (email || '').toLowerCase().trim(),
    studentId,
    name,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  users.push(user);
  await writeCollection('users', users);

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
  const users = await readCollection('users');
  const user = users.find(u => u.email === email.toLowerCase().trim());
  return user || null;
}

async function findById(id) {
  if (!id) return null;
  const users = await readCollection('users');
  const user = users.find(u => u.id === id);
  return user || null;
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
