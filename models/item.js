const { readCollection, writeCollection } = require('../db');
const { nanoid } = require('nanoid');

async function createItem(item) {
  const items = await readCollection('items');
  
  const newItem = {
    id: nanoid(),
    ...item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    claims: [],
  };
  
  items.push(newItem);
  await writeCollection('items', items);
  return newItem.id;
}

async function findRecentItems(limit = 20) {
  const items = await readCollection('items');
  return items
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function findById(id) {
  if (!id) return null;
  const items = await readCollection('items');
  return items.find(item => item.id === id) || null;
}

async function searchItems({ query, category, location, type, status, sort, date }) {
  let items = await readCollection('items');

  if (query) {
    const q = query.toLowerCase();
    items = items.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }

  if (category) {
    items = items.filter(item => item.category === category);
  }

  if (location) {
    const loc = location.toLowerCase();
    items = items.filter(item => item.location && item.location.toLowerCase().includes(loc));
  }

  if (type) {
    items = items.filter(item => item.type === type);
  }

  if (status) {
    items = items.filter(item => item.status === status);
  }

  if (date) {
    const startDate = new Date(date);
    if (!Number.isNaN(startDate.getTime())) {
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      items = items.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= startDate && itemDate < endDate;
      });
    }
  }

  const sortOrder = sort === 'oldest' ? 1 : -1;
  items = items.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortOrder === -1 ? dateB - dateA : dateA - dateB;
  });

  return items.slice(0, 100);
}

async function findByUserId(userId, options = {}) {
  const { limit = 6, status: filterStatus } = options;
  let items = await readCollection('items');
  
  items = items.filter(item => item.userId === String(userId));
  
  if (filterStatus) {
    items = items.filter(item => item.status === filterStatus);
  }
  
  return items
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function updateStatus(id, newStatus) {
  if (!id) return null;
  const items = await readCollection('items');
  const item = items.find(i => i.id === id);
  if (!item) return null;
  
  item.status = newStatus;
  item.updatedAt = new Date().toISOString();
  
  await writeCollection('items', items);
  return item;
}

async function markReturnAdminConfirmed(id, adminId) {
  if (!id) return null;
  const items = await readCollection('items');
  const item = items.find(i => i.id === id);
  if (!item) return null;
  
  if (!item.returnAdminConfirmedAt) {
    item.returnAdminConfirmedAt = new Date().toISOString();
  }
  item.returnAdminConfirmedBy = adminId ? String(adminId) : item.returnAdminConfirmedBy;
  item.updatedAt = new Date().toISOString();
  
  await writeCollection('items', items);
  return item;
}

async function markReturnUserConfirmed(id, userId) {
  if (!id) return null;
  const items = await readCollection('items');
  const item = items.find(i => i.id === id);
  if (!item) return null;
  
  item.returnUserConfirmedAt = new Date().toISOString();
  item.returnUserConfirmedBy = userId ? String(userId) : item.returnUserConfirmedBy;
  item.status = 'resolved';
  item.updatedAt = new Date().toISOString();
  
  await writeCollection('items', items);
  return item;
}

async function addClaim(itemId, claim) {
  if (!itemId) return null;
  const items = await readCollection('items');
  const item = items.find(i => i.id === itemId);
  if (!item) return null;
  
  item.claims = item.claims || [];
  const claimWithId = {
    id: nanoid(),
    ...claim,
    createdAt: new Date().toISOString(),
  };
  item.claims.push(claimWithId);
  item.status = 'pending_claim';
  item.updatedAt = new Date().toISOString();
  
  await writeCollection('items', items);
  return claimWithId;
}

async function updateClaimStatus(itemId, claimId, newStatus) {
  if (!itemId) return null;
  const items = await readCollection('items');
  const item = items.find(i => i.id === itemId);
  if (!item || !item.claims) return null;

  const claim = item.claims.find(c => String(c.id) === String(claimId));
  if (!claim) return null;

  claim.status = newStatus;
  claim.updatedAt = new Date().toISOString();
  
  if (newStatus === 'accepted' || newStatus === 'denied') {
    claim.seenByClaimant = false;
  }
  
  if (newStatus === 'accepted') {
    const acceptedAt = new Date();
    const returnWindowEndsAt = new Date(acceptedAt.getTime() + 72 * 60 * 60 * 1000);
    const returnDueAt = new Date(acceptedAt.getTime() + 5 * 24 * 60 * 60 * 1000);
    claim.acceptedAt = acceptedAt.toISOString();
    claim.returnWindowEndsAt = returnWindowEndsAt.toISOString();
    claim.returnDueAt = returnDueAt.toISOString();
    if (!claim.returnStatus) claim.returnStatus = 'none';
    item.status = 'resolved';
  } else if (newStatus === 'denied') {
    const hasPending = item.claims.some(c => c.status === 'pending');
    if (!hasPending) {
      item.status = 'reported';
    }
  }

  item.updatedAt = new Date().toISOString();
  await writeCollection('items', items);
  return claim;
}

async function getClaimDecisionCountForClaimant(userId) {
  const uId = String(userId);
  const items = await readCollection('items');
  let count = 0;
  
  items.forEach(item => {
    (item.claims || []).forEach(claim => {
      if (String(claim.claimantId) === uId &&
          (claim.status === 'accepted' || claim.status === 'denied') &&
          claim.seenByClaimant !== true) {
        count += 1;
      }
    });
  });
  
  return count;
}

async function markClaimDecisionsSeenForClaimant(userId) {
  const uId = String(userId);
  const items = await readCollection('items');
  let changed = false;
  
  items.forEach(item => {
    (item.claims || []).forEach(claim => {
      if (String(claim.claimantId) === uId &&
          (claim.status === 'accepted' || claim.status === 'denied') &&
          claim.seenByClaimant !== true) {
        claim.seenByClaimant = true;
        changed = true;
      }
    });
  });
  
  if (changed) {
    await writeCollection('items', items);
  }
  
  return changed;
}

async function requestClaimReturn(itemId, claimId, userId) {
  if (!itemId) return { ok: false, reason: 'not_found' };
  
  const items = await readCollection('items');
  const item = items.find(i => i.id === itemId);
  if (!item || !item.claims) return { ok: false, reason: 'not_found' };
  
  const claim = item.claims.find(c => String(c.id) === String(claimId));
  if (!claim) return { ok: false, reason: 'not_found' };
  if (String(claim.claimantId) !== String(userId)) return { ok: false, reason: 'forbidden' };
  if (claim.status !== 'accepted') return { ok: false, reason: 'not_accepted' };

  const windowEnds = claim.returnWindowEndsAt ? new Date(claim.returnWindowEndsAt) : null;
  if (windowEnds && new Date() > windowEnds) return { ok: false, reason: 'window_closed' };

  claim.returnStatus = 'requested';
  claim.returnRequestedAt = new Date().toISOString();
  item.status = 'return_pending';
  item.updatedAt = new Date().toISOString();
  
  await writeCollection('items', items);
  return { ok: true, claim, item };
}

async function confirmClaimReturn(itemId, claimId) {
  if (!itemId) return { ok: false, reason: 'not_found' };
  
  const items = await readCollection('items');
  const item = items.find(i => i.id === itemId);
  if (!item || !item.claims) return { ok: false, reason: 'not_found' };
  
  const claim = item.claims.find(c => String(c.id) === String(claimId));
  if (!claim) return { ok: false, reason: 'not_found' };

  claim.returnStatus = 'completed';
  claim.returnCompletedAt = new Date().toISOString();
  claim.status = 'returned';
  claim.updatedAt = new Date().toISOString();
  item.status = 'reported';
  item.updatedAt = new Date().toISOString();
  
  await writeCollection('items', items);
  return { ok: true, claim, item };
}

async function markReturnReminderSent(itemId, claimId) {
  if (!itemId) return false;
  
  const items = await readCollection('items');
  const item = items.find(i => i.id === itemId);
  if (!item || !item.claims) return false;
  
  const claim = item.claims.find(c => String(c.id) === String(claimId));
  if (!claim) return false;
  
  claim.returnReminderSentAt = new Date().toISOString();
  await writeCollection('items', items);
  return true;
}

async function getClaimRequestsForOwner(userId) {
  const items = await readCollection('items');
  const requests = [];
  
  items.forEach(item => {
    (item.claims || [])
      .filter(claim => claim.status === 'pending')
      .forEach(claim => {
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
  const items = await readCollection('items');
  const history = [];
  
  items.forEach(item => {
    (item.claims || []).forEach(claim => {
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
  const uId = String(userId);
  const items = await readCollection('items');
  const claims = [];

  items.forEach(item => {
    (item.claims || [])
      .filter(claim => String(claim.claimantId) === uId)
      .forEach(claim => {
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
  const items = await readCollection('items');
  const total = items.length;
  const lost = items.filter(i => i.type === 'lost').length;
  const found = items.filter(i => i.type === 'found').length;
  const resolved = items.filter(i => i.status === 'resolved').length;
  const active = total - resolved;
  
  return { total, lost, found, resolved, active };
}

async function getUserStats(userId) {
  const items = await readCollection('items');
  const userItems = items.filter(i => i.userId === String(userId));
  const total = userItems.length;
  const resolved = userItems.filter(i => i.status === 'resolved').length;
  const active = total - resolved;
  
  return { total, resolved, active };
}

async function findSimilarItems(sourceItem, limit = 3) {
  if (!sourceItem) return [];
  
  const items = await readCollection('items');
  return items
    .filter(item => item.id !== sourceItem.id && item.category === sourceItem.category)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function deleteItem(id) {
  if (!id) return false;
  
  const items = await readCollection('items');
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return false;
  
  items.splice(index, 1);
  await writeCollection('items', items);
  return true;
}

async function updateItem(id, updates) {
  if (!id) return null;
  
  const items = await readCollection('items');
  const item = items.find(i => i.id === id);
  if (!item) return null;
  
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  await writeCollection('items', items);
  return item;
}

async function getItemsByUser(userId) {
  const items = await readCollection('items');
  return items
    .filter(item => item.userId === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  createItem,
  findRecentItems,
  findById,
  searchItems,
  findByUserId,
  updateStatus,
  markReturnAdminConfirmed,
  markReturnUserConfirmed,
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
};
