const bcrypt = require('bcryptjs');
const { init, readCollection, writeCollection } = require('../db');

const SALT_ROUNDS = 12;

async function createOrUpdateAdmin() {
  await init();

  const email = process.env.ADMIN_EMAIL || 'admin@campusfind.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.ADMIN_NAME || 'Campus Admin';
  const studentId = process.env.ADMIN_STUDENT_ID || 'ADMIN-0001';

  const users = await readCollection('users');
  const existing = users.find((u) => u.email === email);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  if (existing) {
    existing.name = name;
    existing.studentId = studentId;
    existing.role = 'admin';
    if (process.env.ADMIN_PASSWORD) {
      existing.passwordHash = passwordHash;
    }
    await writeCollection('users', users);
    console.log(`Updated admin account: ${email}`);
    return;
  }

  const id = users.length ? Math.max(...users.map((row) => row.id || 0)) + 1 : 1;

  users.push({
    id,
    email,
    studentId,
    name,
    passwordHash,
    role: 'admin',
    createdAt: new Date().toISOString(),
  });

  await writeCollection('users', users);
  console.log(`Created admin account: ${email}`);
}

createOrUpdateAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
