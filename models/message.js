const { randomUUID } = require('crypto');
const { get, run, all } = require('../db/sqlite');

function rowToMessage(row) {
  if (!row) return null;
  return { ...row, readByRecipient: !!row.readByRecipient };
}

async function createMessage({ senderId, senderName, recipientId, recipientName, content }) {
  const now = new Date().toISOString();
  const id = randomUUID();
  await run(
    `INSERT INTO messages (id, senderId, senderName, recipientId, recipientName, content, readByRecipient, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, String(senderId), senderName || '', String(recipientId), recipientName || '', content, now, now]
  );
  return rowToMessage(await get('SELECT * FROM messages WHERE id = ?', [id]));
}

async function getConversations(userId) {
  const uid = String(userId);
  const msgs = await all(
    `SELECT * FROM messages WHERE senderId = ? OR recipientId = ? ORDER BY createdAt DESC`,
    [uid, uid]
  );
  const convMap = new Map();
  for (const msg of msgs) {
    const partnerId = msg.senderId === uid ? msg.recipientId : msg.senderId;
    const partnerName = msg.senderId === uid ? msg.recipientName : msg.senderName;
    if (!convMap.has(partnerId)) {
      const unreadRow = await get(
        `SELECT COUNT(*) as count FROM messages WHERE senderId = ? AND recipientId = ? AND readByRecipient = 0`,
        [partnerId, uid]
      );
      convMap.set(partnerId, {
        partnerId, partnerName,
        lastMessage: rowToMessage(msg),
        unreadCount: unreadRow?.count || 0,
      });
    }
  }
  return Array.from(convMap.values());
}

async function getMessages(userId, otherId) {
  const uid = String(userId);
  const oid = String(otherId);
  const msgs = await all(
    `SELECT * FROM messages
     WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
     ORDER BY createdAt ASC`,
    [uid, oid, oid, uid]
  );
  return msgs.map(rowToMessage);
}

async function markConversationRead(userId, otherId) {
  await run(
    `UPDATE messages SET readByRecipient = 1, updatedAt = ?
     WHERE senderId = ? AND recipientId = ? AND readByRecipient = 0`,
    [new Date().toISOString(), String(otherId), String(userId)]
  );
}

async function getUnreadCount(userId) {
  const row = await get(
    `SELECT COUNT(*) as count FROM messages WHERE recipientId = ? AND readByRecipient = 0`,
    [String(userId)]
  );
  return row?.count || 0;
}

async function deleteMessage(messageId, senderId) {
  await run(`DELETE FROM messages WHERE id = ? AND senderId = ?`, [messageId, String(senderId)]);
}

module.exports = { createMessage, getConversations, getMessages, markConversationRead, getUnreadCount, deleteMessage };
