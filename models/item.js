const { db } = require('../db');
const xss = require('xss');

function sanitize(str) {
  return xss(String(str || '')).trim();
}

function getNextId(list) {
  if (!list.length) return 1;
  return Math.max(...list.map((row) => row.id || 0)) + 1;
}

async function createItem(item) {
  const { run, get, stringifyJson } = require('../db/sqlite');

  // Sanitize user input to prevent XSS
  const now = new Date().toISOString();

  const result = await run(
    `INSERT INTO items
      (userId, ownerEmail, type, title, name, description, location, locationDetails, dateLost,
       category, contactMethod, anonymous, reportedByName, photoPath, returnInfo, returnBy, status,
       verificationQuestions, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.userId ? String(item.userId) : null,
      item.ownerEmail || null,
      item.type || 'lost',
      sanitize(item.title || item.name || ''),
      sanitize(item.name || 'Untitled'),
      sanitize(item.description || ''),
      sanitize(item.location || ''),
      sanitize(item.locationDetails || ''),
      item.dateLost || null,
      sanitize(item.category || ''),
      sanitize(item.contactMethod || ''),
      item.anonymous ? 1 : 0,
      item.reportedByName || null,
      item.photoPath || null,
      sanitize(item.returnInfo || ''),
      sanitize(item.returnBy || ''),
      item.status || 'reported',
      stringifyJson(item.verificationQuestions || []),
      now,
      now,
    ]
  );

  return result.lastInsertRowid;
}

async function findRecentItems(limit = 20) {
  await db.read();
  const items = db.data?.items || [];
  return items
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function findById(id) {
  await db.read();
  return (db.data?.items || []).find((item) => item.id === Number(id));
}

async function searchItems({ query, category, location, type, status, sort, date }) {
  await db.read();
  let items = (db.data?.items || []).slice();

  if (query) {
    const lower = query.toLowerCase();
    items = items.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      return name.includes(lower) || description.includes(lower);
    });
  }

  if (category) {
    items = items.filter((item) => item.category === category);
  }

  if (location) {
    const lower = location.toLowerCase();
    items = items.filter((item) => (item.location || '').toLowerCase().includes(lower));
  }

  if (type) {
    items = items.filter((item) => item.type === type);
  }

  if (status) {
    items = items.filter((item) => item.status === status);
  }

  if (date) {
    const target = new Date(date).toDateString();
    items = items.filter((item) => {
      const created = new Date(item.createdAt).toDateString();
      return created === target;
    });
  }

  const sorted = items.sort((a, b) => {
    const diff = new Date(b.createdAt) - new Date(a.createdAt);
    return sort === 'oldest' ? -diff : diff;
  });

  return sorted.slice(0, 100);
}

async function findByUserId(userId, options = {}) {
  const { limit = 6, status } = options;
  await db.read();
  let items = (db.data?.items || []).filter((item) => item.userId === userId);
  if (status) {
    items = items.filter((item) => item.status === status);
  }
  return items
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

// Alias for updateStatus
async function updateItemStatus(id, status) {
  return updateStatus(id, status);
}

async function updateStatus(id, status) {
  const { run } = require('../db/sqlite');
  const now = new Date().toISOString();
  const result = await run('UPDATE items SET status = ?, updatedAt = ? WHERE id = ?', [status, now, Number(id)]);
  if (result.changes === 0) return null;
  const item = { id: Number(id), status, updatedAt: now };
  return item;
}

async function addClaim(itemId, claim) {
  const { run, get, stringifyJson } = require('../db/sqlite');
  const now = new Date().toISOString();
  const itemExists = await get('SELECT id FROM items WHERE id = ?', [Number(itemId)]);
  if (!itemExists) return null;
  await run('UPDATE items SET status = ?, updatedAt = ? WHERE id = ?', ['pending_claim', now, Number(itemId)]);
  await run(
    `INSERT INTO claims (id, itemId, claimantId, claimantName, claimantEmail, description,
       claimedDate, proofPath, status, answers, score, seenByClaimant, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      claim.id ? String(claim.id) : require('crypto').randomUUID(),
      Number(itemId),
      claim.claimantId ? String(claim.claimantId) : null,
      claim.claimantName || null,
      claim.claimantEmail || null,
      claim.description || null,
      claim.claimedDate || null,
      claim.proofPath || null,
      claim.status || 'pending',
      stringifyJson(claim.answers || []),
      stringifyJson(claim.score || null),
      now, now,
    ]
  );
  return claim;
}

async function updateClaimStatus(itemId, claimId, status) {
  const { run, get, all, stringifyJson } = require('../db/sqlite');
  const now = new Date().toISOString();

  const claim = await get('SELECT * FROM claims WHERE id = ? AND itemId = ?', [String(claimId), Number(itemId)]);
  if (!claim) return null;

  const updates = { status, updatedAt: now, seenByClaimant: (status === 'accepted' || status === 'denied') ? 0 : 1 };

  if (status === 'accepted') {
    const acceptedAt = new Date();
    updates.acceptedAt = acceptedAt.toISOString();
    updates.returnWindowEndsAt = new Date(acceptedAt.getTime() + 72 * 60 * 60 * 1000).toISOString();
    updates.returnDueAt = new Date(acceptedAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    updates.returnStatus = claim.returnStatus || 'none';
    updates.verificationCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    await run('UPDATE items SET status = ?, updatedAt = ? WHERE id = ?', ['reported', now, Number(itemId)]);
  } else if (status === 'denied') {
    const pending = await all('SELECT id FROM claims WHERE itemId = ? AND status = ? AND id != ?', [Number(itemId), 'pending', String(claimId)]);
    if (pending.length === 0) {
      await run('UPDATE items SET status = ?, updatedAt = ? WHERE id = ?', ['reported', now, Number(itemId)]);
    }
  }

  await run(
    `UPDATE claims SET status=?, updatedAt=?, seenByClaimant=?,
       acceptedAt=COALESCE(?,acceptedAt), returnWindowEndsAt=COALESCE(?,returnWindowEndsAt),
       returnDueAt=COALESCE(?,returnDueAt), returnStatus=COALESCE(?,returnStatus),
       verificationCode=COALESCE(?,verificationCode)
     WHERE id = ?`,
    [updates.status, updates.updatedAt, updates.seenByClaimant,
     updates.acceptedAt||null, updates.returnWindowEndsAt||null,
     updates.returnDueAt||null, updates.returnStatus||null,
     updates.verificationCode||null, String(claimId)]
  );

  return await get('SELECT * FROM claims WHERE id = ?', [String(claimId)]);
}

async function getClaimDecisionCountForClaimant(userId) {
  await db.read();
  const items = db.data?.items || [];
  let count = 0;
  items.forEach((item) => {
    (item.claims || []).forEach((claim) => {
      if (
        String(claim.claimantId) === String(userId) &&
        (claim.status === 'accepted' || claim.status === 'denied') &&
        claim.seenByClaimant !== true
      ) {
        count += 1;
      }
    });
  });
  return count;
}

async function markClaimDecisionsSeenForClaimant(userId) {
  const { run } = require('../db/sqlite');
  const result = run(
    `UPDATE claims SET seenByClaimant = 1 WHERE claimantId = ? AND (status = 'accepted' OR status = 'denied') AND seenByClaimant = 0`,
    [String(userId)]
  );
  return result.changes > 0;
}

async function requestClaimReturn(itemId, claimId, userId) {
  await db.read();
  const item = (db.data?.items || []).find((row) => row.id === Number(itemId));
  if (!item || !item.claims) return { ok: false, reason: 'not_found' };
  const claim = item.claims.find((c) => String(c.id) === String(claimId));
  if (!claim) return { ok: false, reason: 'not_found' };
  if (String(claim.claimantId) !== String(userId)) return { ok: false, reason: 'forbidden' };
  if (claim.status !== 'accepted') return { ok: false, reason: 'not_accepted' };

  const windowEnds = claim.returnWindowEndsAt ? new Date(claim.returnWindowEndsAt) : null;
  if (windowEnds && new Date() > windowEnds) return { ok: false, reason: 'window_closed' };

  const now3 = new Date().toISOString();
  const { run: run3 } = require('../db/sqlite');
  run3('UPDATE claims SET returnStatus=?, returnRequestedAt=?, updatedAt=? WHERE id=?', ['requested', now3, now3, String(claimId)]);
  run3('UPDATE items SET status=?, updatedAt=? WHERE id=?', ['return_pending', now3, Number(itemId)]);
  return { ok: true };
}

async function confirmClaimReturn(itemId, claimId, actorUserId) {
  await db.read();
  const item = (db.data?.items || []).find((row) => row.id === Number(itemId));
  if (!item || !item.claims) return { ok: false, reason: 'not_found' };
  const claim = item.claims.find((c) => String(c.id) === String(claimId));
  if (!claim) return { ok: false, reason: 'not_found' };

  const now4 = new Date().toISOString();
  const { run: run4 } = require('../db/sqlite');
  run4('UPDATE claims SET returnStatus=?, returnCompletedAt=?, status=?, updatedAt=? WHERE id=?',
    ['completed', now4, 'returned', now4, String(claimId)]);
  run4('UPDATE items SET status=?, updatedAt=? WHERE id=?', ['reported', now4, Number(itemId)]);
  return { ok: true };
}

async function markReturnReminderSent(itemId, claimId) {
  await db.read();
  const item = (db.data?.items || []).find((row) => row.id === Number(itemId));
  if (!item || !item.claims) return false;
  const claim = item.claims.find((c) => String(c.id) === String(claimId));
  if (!claim) return false;
  const { run: run5 } = require('../db/sqlite');
  run5('UPDATE claims SET returnReminderSentAt=?, updatedAt=? WHERE id=?',
    [new Date().toISOString(), new Date().toISOString(), String(claimId)]);
  return true;
}

async function getClaimRequestsForOwner(userId) {
  await db.read();
  const items = (db.data?.items || []).filter((item) => item.userId === userId);
  const requests = [];
  items.forEach((item) => {
    (item.claims || [])
      .filter((claim) => claim.status === 'pending')
      .forEach((claim) => {
        requests.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          verificationQuestions: item.verificationQuestions || [],
          claim,
        });
      });
  });
  return requests.sort((a, b) => new Date(b.claim.createdAt) - new Date(a.claim.createdAt));
}

async function getClaimHistoryForOwner(userId) {
  await db.read();
  const items = (db.data?.items || []).filter((item) => item.userId === userId);
  const history = [];
  items.forEach((item) => {
    (item.claims || []).forEach((claim) => {
      history.push({
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        itemStatus: item.status,
        verificationQuestions: item.verificationQuestions || [],
        claim,
      });
    });
  });
  return history.sort((a, b) => new Date(b.claim.createdAt) - new Date(a.claim.createdAt));
}

async function getClaimsByClaimant(userId) {
  await db.read();
  const items = db.data?.items || [];
  const claims = [];

  items.forEach((item) => {
    (item.claims || [])
      .filter((claim) => String(claim.claimantId) === String(userId))
      .forEach((claim) => {
        claims.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          itemStatus: item.status,
          ownerName: item.reportedByName,
          claim,
        });
      });
  });

  return claims.sort((a, b) => new Date(b.claim.createdAt) - new Date(a.claim.createdAt));
}

async function getStats() {
  await db.read();
  const items = db.data?.items || [];
  const total = items.length;
  const lost = items.filter((item) => item.type === 'lost').length;
  const found = items.filter((item) => item.type === 'found').length;
  const resolved = items.filter((item) => item.status === 'resolved').length;
  const active = total - resolved;
  return { total, lost, found, resolved, active };
}

async function getUserStats(userId) {
  await db.read();
  const items = (db.data?.items || []).filter((item) => item.userId === userId);
  const total = items.length;
  const resolved = items.filter((item) => item.status === 'resolved').length;
  const active = total - resolved;
  return { total, resolved, active };
}

async function findSimilarItems(sourceItem, limit = 3) {
  if (!sourceItem) return [];
  await db.read();
  return (db.data?.items || [])
    .filter((item) => item.id !== sourceItem.id && item.category === sourceItem.category)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function deleteItem(id) {
  const { run } = require('../db/sqlite');
  const result = await run('DELETE FROM items WHERE id = ?', [Number(id)]);
  if (result.changes === 0) return false;
  const deleted = true;
  return true;
}

async function updateItem(id, updates) {
  await db.read();
  const item = (db.data?.items || []).find((row) => row.id === Number(id));
  if (!item) return null;
  const sanitizedUpdates = { ...updates };
  ['name', 'title', 'description', 'location', 'locationDetails', 'category', 'contactMethod', 'returnInfo', 'returnBy'].forEach((field) => {
    if (field in sanitizedUpdates) {
      sanitizedUpdates[field] = sanitize(sanitizedUpdates[field]);
    }
  });
  const { run: run6 } = require('../db/sqlite');
  const now6 = new Date().toISOString();
  const fields = Object.keys(sanitizedUpdates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(sanitizedUpdates), now6, Number(id)];
  run6(`UPDATE items SET ${fields}, updatedAt = ? WHERE id = ?`, values);
  return { id: Number(id), ...sanitizedUpdates, updatedAt: now6 };
}

async function getItemsByUser(userId) {
  await db.read();
  return (db.data?.items || [])
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function markItemReturned(itemId, claimId) {
  await db.read();
  const item = (db.data?.items || []).find((row) => row.id === Number(itemId));
  if (!item || !item.claims) return null;

  const claim = item.claims.find((c) => String(c.id) === String(claimId));
  if (!claim) return null;

  const { run: run7 } = require('../db/sqlite');
  const now7 = new Date().toISOString();
  run7('UPDATE claims SET status=?, returnStatus=?, returnCompletedAt=?, updatedAt=? WHERE id=?',
    ['returned', 'completed', now7, now7, String(claimId)]);
  run7('UPDATE items SET status=?, updatedAt=? WHERE id=?', ['resolved', now7, Number(itemId)]);
  return { ok: true };
}

async function getPendingReturnVerifications() {
  await db.read();
  const items = db.data?.items || [];
  const pendingVerifications = [];

  items.forEach((item) => {
    (item.claims || [])
      .filter((claim) => claim.status === 'accepted')
      .forEach((claim) => {
        pendingVerifications.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          claimantName: claim.claimantName,
          ownerName: item.reportedByName,
          verificationCode: claim.verificationCode,
          returnLocation: item.returnInfo,
          contactMethod: item.contactMethod,
          acceptedAt: claim.acceptedAt,
          claim,
        });
      });
  });
  return pendingVerifications.sort((a, b) => new Date(b.acceptedAt) - new Date(a.acceptedAt));
}

/**
 * Get top helpers for the Wall of Kindness leaderboard.
 * A "helper point" = 1 point per found item reported + 2 points per resolved item.
 * Returns top N users with name, points, badge, and count of returns.
 */
async function getTopHelpers(limit = 6) {
  await db.read();
  const items = db.data?.items || [];

  // Tally points per userId
  const tally = {};
  items.forEach((item) => {
    if (!item.userId) return;
    if (!tally[item.userId]) {
      tally[item.userId] = {
        userId: item.userId,
        name: item.reportedByName || item.ownerName || 'Anonymous',
        foundReported: 0,
        resolved: 0,
        points: 0,
      };
    }
    if (item.type === 'found') {
      tally[item.userId].foundReported += 1;
      tally[item.userId].points += 1;
    }
    if (item.status === 'resolved') {
      tally[item.userId].resolved += 1;
      tally[item.userId].points += 2;
    }
  });

  return Object.values(tally)
    .filter((u) => u.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map((u, idx) => ({
      ...u,
      rank: idx + 1,
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐',
      helperTitle:
        u.points >= 20
          ? 'Campus Champion'
          : u.points >= 10
          ? 'Super Helper'
          : u.points >= 5
          ? 'Kind Helper'
          : 'Helper',
    }));
}

module.exports = {
  createItem,
  updateItemStatus,
  findRecentItems,
  findById,
  searchItems,
  findByUserId,
  updateStatus,
  addClaim,
  updateClaimStatus,
  deleteItem,
  updateItem,
  getStats,
  getUserStats,
  findSimilarItems,
  getItemsByUser,
  getClaimRequestsForOwner,
  getClaimsByClaimant,
  getClaimHistoryForOwner,
  getClaimDecisionCountForClaimant,
  markClaimDecisionsSeenForClaimant,
  requestClaimReturn,
  confirmClaimReturn,
  markReturnReminderSent,
  markItemReturned,
  getPendingReturnVerifications,
  getTopHelpers,
};
