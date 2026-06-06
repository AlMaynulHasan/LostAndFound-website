const fs = require('fs');
const path = require('path');
const {
  initSchema,
  get,
  all,
  run,
  transaction,
  stringifyJson,
  parseJson,
} = require('./db/sqlite');

const jsonDbFile = path.join(__dirname, 'data', 'db.json');

function normalizeId(id) {
  return id === undefined || id === null ? null : String(id);
}

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
    seenByClaimant: row.seenByClaimant === 1,
  };
}

function rowToItem(row) {
  if (!row) return null;
  return {
    ...row,
    anonymous: row.anonymous === 1,
    verificationQuestions: parseJson(row.verificationQuestions, []),
    claims: [],
  };
}

function rowToMessage(row) {
  if (!row) return null;
  return {
    ...row,
    readByRecipient: row.readByRecipient === 1,
  };
}

function insertUser(user) {
  run(
    `INSERT OR REPLACE INTO users
      (id, email, studentId, name, passwordHash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizeId(user.id),
      (user.email || '').toLowerCase().trim(),
      user.studentId || null,
      user.name || 'User',
      user.passwordHash,
      user.role || 'user',
      user.createdAt || new Date().toISOString(),
      user.updatedAt || user.createdAt || new Date().toISOString(),
    ]
  );
}

function insertItem(item) {
  run(
    `INSERT OR REPLACE INTO items
      (id, userId, ownerEmail, type, title, name, description, location, locationDetails, dateLost,
       category, contactMethod, anonymous, reportedByName, photoPath, returnInfo, returnBy, status,
       verificationQuestions, returnAdminConfirmedAt, returnAdminConfirmedBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(item.id),
      normalizeId(item.userId),
      item.ownerEmail || null,
      item.type || 'lost',
      item.title || item.name || null,
      item.name || 'Untitled item',
      item.description || null,
      item.location || null,
      item.locationDetails || null,
      item.dateLost || null,
      item.category || null,
      item.contactMethod || null,
      item.anonymous ? 1 : 0,
      item.reportedByName || null,
      item.photoPath || null,
      item.returnInfo || null,
      item.returnBy || null,
      item.status || 'reported',
      stringifyJson(item.verificationQuestions || []),
      item.returnAdminConfirmedAt || null,
      item.returnAdminConfirmedBy || null,
      item.createdAt || new Date().toISOString(),
      item.updatedAt || null,
    ]
  );

  (item.claims || []).forEach((claim) => insertClaim(item.id, claim));
}

function insertClaim(itemId, claim) {
  run(
    `INSERT OR REPLACE INTO claims
      (id, itemId, claimantId, claimantName, claimantEmail, description, claimedDate, proofPath, status,
       answers, score, seenByClaimant, returnStatus, acceptedAt, returnWindowEndsAt, returnDueAt,
       verificationCode, returnRequestedAt, returnCompletedAt, returnReminderSentAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizeId(claim.id),
      Number(itemId),
      normalizeId(claim.claimantId),
      claim.claimantName || null,
      claim.claimantEmail || null,
      claim.description || null,
      claim.claimedDate || null,
      claim.proofPath || null,
      claim.status || 'pending',
      stringifyJson(claim.answers || []),
      stringifyJson(claim.score || null),
      claim.seenByClaimant === false ? 0 : 1,
      claim.returnStatus || null,
      claim.acceptedAt || null,
      claim.returnWindowEndsAt || null,
      claim.returnDueAt || null,
      claim.verificationCode || null,
      claim.returnRequestedAt || null,
      claim.returnCompletedAt || null,
      claim.returnReminderSentAt || null,
      claim.createdAt || new Date().toISOString(),
      claim.updatedAt || null,
    ]
  );
}

function insertMessage(message) {
  run(
    `INSERT OR REPLACE INTO messages
      (id, senderId, senderName, recipientId, recipientName, content, readByRecipient, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizeId(message.id),
      normalizeId(message.senderId),
      message.senderName || null,
      normalizeId(message.recipientId),
      message.recipientName || null,
      message.content || '',
      message.readByRecipient ? 1 : 0,
      message.createdAt || new Date().toISOString(),
      message.updatedAt || null,
    ]
  );
}

function importJsonIfEmpty() {
  const userCount = get('SELECT COUNT(*) AS count FROM users').count;
  const itemCount = get('SELECT COUNT(*) AS count FROM items').count;
  const messageCount = get('SELECT COUNT(*) AS count FROM messages').count;
  if (userCount || itemCount || messageCount || !fs.existsSync(jsonDbFile)) return;

  const parsed = JSON.parse(fs.readFileSync(jsonDbFile, 'utf8'));
  const importData = transaction((data) => {
    (data.users || []).forEach(insertUser);
    (data.items || []).forEach(insertItem);
    (data.messages || []).forEach(insertMessage);
  });
  importData(parsed);
}

function hydrateItems(items) {
  const claims = all('SELECT * FROM claims ORDER BY datetime(createdAt) ASC');
  const byItem = new Map();
  claims.forEach((claimRow) => {
    const claim = rowToClaim(claimRow);
    const key = Number(claim.itemId);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(claim);
  });
  return items.map((item) => ({
    ...item,
    claims: byItem.get(Number(item.id)) || [],
  }));
}

async function init() {
  initSchema();
  importJsonIfEmpty();
  await ensureAdminExists();
}

async function ensureAdminExists() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Campus Admin';
  const studentId = process.env.ADMIN_STUDENT_ID || 'ADMIN-0001';

  if (!email || !password) return; // skip if not configured

  const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) return; // already exists

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  const id = String((get('SELECT MAX(CAST(id AS INTEGER)) AS maxId FROM users')?.maxId || 0) + 1);

  run(
    `INSERT INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)`,
    [id, email.toLowerCase(), studentId, name, passwordHash, now, now]
  );
  console.log(`[INIT] Admin account created: ${email}`);
}

const db = {
  data: { users: [], items: [], messages: [] },
  async read() {
    const users = all('SELECT * FROM users ORDER BY CAST(id AS INTEGER), id').map(rowToUser);
    const items = hydrateItems(all('SELECT * FROM items ORDER BY datetime(createdAt) DESC').map(rowToItem));
    const messages = all('SELECT * FROM messages ORDER BY datetime(createdAt) ASC').map(rowToMessage);
    this.data = { users, items, messages };
  },
  async write() {
    // Sync in-memory data back to SQLite
    const { insertItem, insertClaim } = (() => {
      // Inline the sync logic using the existing insert functions
      const syncItems = transaction((items) => {
        run('DELETE FROM items');
        run('DELETE FROM claims');
        items.forEach((item) => {
          run(
            `INSERT OR REPLACE INTO items
              (id, userId, ownerEmail, type, title, name, description, location, locationDetails, dateLost,
               category, contactMethod, anonymous, reportedByName, photoPath, returnInfo, returnBy, status,
               verificationQuestions, returnAdminConfirmedAt, returnAdminConfirmedBy, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              Number(item.id),
              item.userId ? String(item.userId) : null,
              item.ownerEmail || null,
              item.type || 'lost',
              item.title || item.name || null,
              item.name || 'Untitled',
              item.description || null,
              item.location || null,
              item.locationDetails || null,
              item.dateLost || null,
              item.category || null,
              item.contactMethod || null,
              item.anonymous ? 1 : 0,
              item.reportedByName || null,
              item.photoPath || null,
              item.returnInfo || null,
              item.returnBy || null,
              item.status || 'reported',
              stringifyJson(item.verificationQuestions || []),
              item.returnAdminConfirmedAt || null,
              item.returnAdminConfirmedBy || null,
              item.createdAt || new Date().toISOString(),
              item.updatedAt || null,
            ]
          );
          (item.claims || []).forEach((claim) => {
            run(
              `INSERT OR REPLACE INTO claims
                (id, itemId, claimantId, claimantName, claimantEmail, description, claimedDate, proofPath, status,
                 answers, score, seenByClaimant, returnStatus, acceptedAt, returnWindowEndsAt, returnDueAt,
                 verificationCode, returnRequestedAt, returnCompletedAt, returnReminderSentAt, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                claim.id ? String(claim.id) : null,
                Number(item.id),
                claim.claimantId ? String(claim.claimantId) : null,
                claim.claimantName || null,
                claim.claimantEmail || null,
                claim.description || null,
                claim.claimedDate || null,
                claim.proofPath || null,
                claim.status || 'pending',
                stringifyJson(claim.answers || []),
                stringifyJson(claim.score || null),
                claim.seenByClaimant ? 1 : 0,
                claim.returnStatus || null,
                claim.acceptedAt || null,
                claim.returnWindowEndsAt || null,
                claim.returnDueAt || null,
                claim.verificationCode || null,
                claim.returnRequestedAt || null,
                claim.returnCompletedAt || null,
                claim.returnReminderSentAt || null,
                claim.createdAt || new Date().toISOString(),
                claim.updatedAt || null,
              ]
            );
          });
        });
      });
      return { syncItems };
    })();
    syncItems(this.data.items || []);
  },
};

module.exports = {
  init,
  db,
};
