const { readCollection } = require('../db');

async function getAdminOverview() {
  const users = await readCollection('users');
  const items = await readCollection('items');
  const messages = await readCollection('messages');
  
  const totalUsers = users.length;
  const totalItems = items.length;
  const totalMessages = messages.length;

  let totalClaims = 0;
  let pendingClaims = 0;
  let itemsWithMultipleClaims = 0;

  items.forEach(item => {
    const claims = item.claims || [];
    if (claims.length > 1) itemsWithMultipleClaims += 1;
    totalClaims += claims.length;
    pendingClaims += claims.filter(claim => claim.status === 'pending').length;
  });

  const lost = items.filter(item => item.type === 'lost').length;
  const found = items.filter(item => item.type === 'found').length;
  const resolved = items.filter(item => item.status === 'resolved').length;
  const open = totalItems - resolved;

  return {
    totalUsers,
    totalItems,
    lost,
    found,
    resolved,
    open,
    totalClaims,
    pendingClaims,
    itemsWithMultipleClaims,
    totalMessages,
  };
}

async function getRecentReports(limit = 8) {
  const items = await readCollection('items');
  return items
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function getRecentUsers(limit = 6) {
  const users = await readCollection('users');
  return users
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

function buildClaimEntries(items, filterFn) {
  const entries = [];
  items.forEach(item => {
    (item.claims || [])
      .filter(claim => (typeof filterFn === 'function' ? filterFn(claim) : true))
      .forEach(claim => {
        entries.push({
          itemId: item.id,
          itemName: item.name,
          itemType: item.type,
          itemStatus: item.status,
          reportedByName: item.reportedByName,
          verificationQuestions: item.verificationQuestions || [],
          claim,
        });
      });
  });
  return entries;
}

async function getRecentClaims(limit = 10) {
  const items = await readCollection('items');
  return buildClaimEntries(items)
    .sort((a, b) => new Date(b.claim.createdAt) - new Date(a.claim.createdAt))
    .slice(0, limit);
}

async function getPendingClaims(limit = 10) {
  const items = await readCollection('items');
  return buildClaimEntries(items, claim => claim.status === 'pending')
    .sort((a, b) => new Date(b.claim.createdAt) - new Date(a.claim.createdAt))
    .slice(0, limit);
}

async function getItemsWithMultipleClaims(limit = 6) {
  const items = await readCollection('items');
  const multi = items
    .filter(item => (item.claims || []).length > 1)
    .map(item => {
      const claims = item.claims || [];
      const pendingCount = claims.filter(claim => claim.status === 'pending').length;
      const topScore = claims.reduce((max, claim) => {
        const total = typeof claim?.score?.total === 'number' ? claim.score.total : 0;
        return total > max ? total : max;
      }, 0);
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        reportedByName: item.reportedByName,
        totalClaims: claims.length,
        pendingCount,
        topScore,
      };
    })
    .sort((a, b) => b.totalClaims - a.totalClaims || b.pendingCount - a.pendingCount);

  return multi.slice(0, limit);
}

module.exports = {
  getAdminOverview,
  getRecentReports,
  getRecentUsers,
  getRecentClaims,
  getPendingClaims,
  getItemsWithMultipleClaims,
};
