const fs = require('fs');
const path = require('path');
const {
  initSchema,
  get,
  all,
  run,
  parseJson,
  stringifyJson,
} = require('./db/sqlite');

const jsonDbFile = path.join(__dirname, 'data', 'db.json');

// ── Row mappers ────────────────────────────────────────────────────────────

function rowToUser(row) {
  if (!row) return null;
  return { ...row };
}

function rowToClaim(row) {
  if (!row) return null;
  return {
    ...row,
    answers: parseJson(row.answers, []),
    score: parseJson(row.score, null),
    seenByClaimant: row.seenByClaimant === 1 || row.seenByClaimant === true,
  };
}

function rowToItem(row) {
  if (!row) return null;
  return {
    ...row,
    id: Number(row.id),
    anonymous: row.anonymous === 1 || row.anonymous === true,
    verificationQuestions: parseJson(row.verificationQuestions, []),
    claims: [],
  };
}

function rowToMessage(row) {
  if (!row) return null;
  return {
    ...row,
    readByRecipient: row.readByRecipient === 1 || row.readByRecipient === true,
  };
}

// ── Legacy JSON import ─────────────────────────────────────────────────────

async function importJsonIfEmptyAsync() {
  const userRow = await get('SELECT COUNT(*) AS count FROM users');
  const itemRow = await get('SELECT COUNT(*) AS count FROM items');
  if ((userRow?.count || 0) > 0 || (itemRow?.count || 0) > 0) return;
  if (!fs.existsSync(jsonDbFile)) return;

  try {
    const parsed = JSON.parse(fs.readFileSync(jsonDbFile, 'utf8'));
    for (const user of (parsed.users || [])) {
      await run(
        `INSERT OR IGNORE INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [String(user.id), user.email, user.studentId || null, user.name,
         user.passwordHash || user.password || '', user.role || 'user',
         user.createdAt || new Date().toISOString(), user.updatedAt || null]
      );
    }
    for (const item of (parsed.items || [])) {
      await run(
        `INSERT OR IGNORE INTO items
          (id, userId, ownerEmail, type, name, description, location, locationDetails, dateLost,
           category, contactMethod, anonymous, reportedByName, photoPath, returnInfo, returnBy,
           status, verificationQuestions, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [Number(item.id), item.userId ? String(item.userId) : null, item.ownerEmail || null,
         item.type || 'lost', item.name || 'Untitled', item.description || null,
         item.location || null, item.locationDetails || null, item.dateLost || null,
         item.category || null, item.contactMethod || null, item.anonymous ? 1 : 0,
         item.reportedByName || null, item.photoPath || null,
         item.returnInfo || null, item.returnBy || null, item.status || 'reported',
         stringifyJson(item.verificationQuestions || []),
         item.createdAt || new Date().toISOString(), item.updatedAt || null]
      );
    }
    console.log('[DB] Imported legacy JSON data');
  } catch (e) {
    console.warn('[DB] Could not import legacy JSON:', e.message);
  }
}

// ── Admin bootstrap ────────────────────────────────────────────────────────

async function ensureAdminExists() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Campus Admin';
  const studentId = process.env.ADMIN_STUDENT_ID || 'ADMIN-0001';
  if (!email || !password) return;

  const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return;

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const maxRow = await get('SELECT MAX(CAST(id AS INTEGER)) AS maxId FROM users');
  const id = String((maxRow?.maxId || 0) + 1);

  await run(
    `INSERT INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)`,
    [id, email.toLowerCase(), studentId, name, passwordHash, now, now]
  );
  console.log(`[INIT] Admin account created: ${email}`);
}

// ── In-memory db object (used by models that call db.read() / db.write()) ─

const db = {
  data: { users: [], items: [], messages: [] },

  async read() {
    const userRows  = await all('SELECT * FROM users ORDER BY CAST(id AS INTEGER), id');
    const itemRows  = await all('SELECT * FROM items ORDER BY datetime(createdAt) DESC');
    const claimRows = await all('SELECT * FROM claims ORDER BY datetime(createdAt) ASC');
    const msgRows   = await all('SELECT * FROM messages ORDER BY datetime(createdAt) ASC');

    const claimsByItem = new Map();
    claimRows.map(rowToClaim).forEach(claim => {
      const key = Number(claim.itemId);
      if (!claimsByItem.has(key)) claimsByItem.set(key, []);
      claimsByItem.get(key).push(claim);
    });

    this.data = {
      users: userRows.map(rowToUser),
      messages: msgRows.map(rowToMessage),
      items: itemRows.map(rowToItem).map(item => ({
        ...item,
        claims: claimsByItem.get(Number(item.id)) || [],
      })),
    };
  },

  async write() {
    // Full sync: delete and re-insert everything from in-memory data
    await run('DELETE FROM claims');
    await run('DELETE FROM items');

    for (const item of (this.data.items || [])) {
      await run(
        `INSERT OR REPLACE INTO items
          (id, userId, ownerEmail, type, title, name, description, location, locationDetails, dateLost,
           category, contactMethod, anonymous, reportedByName, photoPath, returnInfo, returnBy, status,
           verificationQuestions, returnAdminConfirmedAt, returnAdminConfirmedBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [Number(item.id), item.userId ? String(item.userId) : null, item.ownerEmail || null,
         item.type || 'lost', item.title || item.name || null, item.name || 'Untitled',
         item.description || null, item.location || null, item.locationDetails || null,
         item.dateLost || null, item.category || null, item.contactMethod || null,
         item.anonymous ? 1 : 0, item.reportedByName || null, item.photoPath || null,
         item.returnInfo || null, item.returnBy || null, item.status || 'reported',
         stringifyJson(item.verificationQuestions || []),
         item.returnAdminConfirmedAt || null, item.returnAdminConfirmedBy || null,
         item.createdAt || new Date().toISOString(), item.updatedAt || null]
      );
      for (const claim of (item.claims || [])) {
        await run(
          `INSERT OR REPLACE INTO claims
            (id, itemId, claimantId, claimantName, claimantEmail, description, claimedDate, proofPath,
             status, answers, score, seenByClaimant, returnStatus, acceptedAt, returnWindowEndsAt,
             returnDueAt, verificationCode, returnRequestedAt, returnCompletedAt,
             returnReminderSentAt, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [claim.id ? String(claim.id) : require('crypto').randomUUID(),
           Number(item.id), claim.claimantId ? String(claim.claimantId) : null,
           claim.claimantName || null, claim.claimantEmail || null,
           claim.description || null, claim.claimedDate || null, claim.proofPath || null,
           claim.status || 'pending', stringifyJson(claim.answers || []),
           stringifyJson(claim.score || null), claim.seenByClaimant ? 1 : 0,
           claim.returnStatus || null, claim.acceptedAt || null,
           claim.returnWindowEndsAt || null, claim.returnDueAt || null,
           claim.verificationCode || null, claim.returnRequestedAt || null,
           claim.returnCompletedAt || null, claim.returnReminderSentAt || null,
           claim.createdAt || new Date().toISOString(), claim.updatedAt || null]
        );
      }
    }
  },
};

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  await initSchema();
  await importJsonIfEmptyAsync();
  await ensureAdminExists();
}

module.exports = { init, db };
