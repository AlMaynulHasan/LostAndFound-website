#!/usr/bin/env node
/**
 * One-time admin account creation script.
 * Usage: node scripts/create-admin.js
 */
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');

// Init SQLite
const { initSchema, get, run } = require('../db/sqlite');
initSchema();

const email = process.env.ADMIN_EMAIL || 'admin@lostfound.com';
const password = process.env.ADMIN_PASSWORD || 'Admin123';
const name = process.env.ADMIN_NAME || 'Campus Admin';
const studentId = process.env.ADMIN_STUDENT_ID || 'ADMIN-0001';

async function main() {
  const hash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) {
    run('UPDATE users SET passwordHash = ?, role = ?, name = ?, updatedAt = ? WHERE email = ?',
      [hash, 'admin', name, now, email.toLowerCase()]);
    console.log(`✅ Admin updated: ${email}`);
  } else {
    const maxRow = get('SELECT MAX(CAST(id AS INTEGER)) AS m FROM users');
    const id = String((maxRow?.m || 0) + 1);
    run('INSERT INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
      [id, email.toLowerCase(), studentId, name, hash, 'admin', now, now]);
    console.log(`✅ Admin created: ${email}`);
  }
  console.log(`   Login at /auth/login with password: ${password}`);
  process.exit(0);
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
