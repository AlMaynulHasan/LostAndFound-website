const { get, all, run } = require('../db/sqlite');
const { randomUUID } = require('crypto');

function rowToMessage(row) {
  if (!row) return null;
  return { ...row, readByRecipient: !!row.readByRecipient };
}

/**
 * Create a new message between two users.
 */
async function createMessage({ senderId, senderName, recipientId, recipientName, content }) {
  const now = new Date().toISOString();
  const id = randomUUID();

  run(
    `INSERT INTO messages (id, senderId, senderName, recipientId, recipientName, content, readByRecipient, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, String(senderId), senderName || '', String(recipientId), recipientName || '', content, now, now]
  );

  return rowToMessage(get('SELECT * FROM messages WHERE id = ?', [id]));
}

/**
 * Get all conversations for a user.
 * Returns one entry per unique conversation partner with the latest message.
 */
async function getConversations(userId) {
  const uid = String(userId);

  // Get all messages involving this user
  const msgs = all(
    `SELECT * FROM messages
     WHERE senderId = ? OR recipientId = ?
     ORDER BY createdAt DESC`,
    [uid, uid]
  );

  // Build conversation map — one entry per partner
  const convMap = new Map();
  for (const msg of msgs) {
    const partnerId = msg.senderId === uid ? msg.recipientId : msg.senderId;
    const partnerName = msg.senderId === uid ? msg.recipientName : msg.senderName;

    if (!convMap.has(partnerId)) {
      // Count unread messages from partner
      const unreadRow = get(
        `SELECT COUNT(*) as count FROM messages
         WHERE senderId = ? AND recipientId = ? AND readByRecipient = 0`,
        [partnerId, uid]
      );
      convMap.set(partnerId, {
        partnerId,
        partnerName,
        lastMessage: rowToMessage(msg),
        unreadCount: unreadRow?.count || 0,
      });
    }
  }

  return Array.from(convMap.values());
}

/**
 * Get all messages in a conversation between two users.
 */
async function getMessages(userId, otherId) {
  const uid = String(userId);
  const oid = String(otherId);

  const msgs = all(
    `SELECT * FROM messages
     WHERE (senderId = ? AND recipientId = ?)
        OR (senderId = ? AND recipientId = ?)
     ORDER BY createdAt ASC`,
    [uid, oid, oid, uid]
  );

  return msgs.map(rowToMessage);
}

/**
 * Mark all messages from otherId → userId as read.
 */
async function markConversationRead(userId, otherId) {
  const uid = String(userId);
  const oid = String(otherId);
  const now = new Date().toISOString();

  run(
    `UPDATE messages SET readByRecipient = 1, updatedAt = ?
     WHERE senderId = ? AND recipientId = ? AND readByRecipient = 0`,
    [now, oid, uid]
  );
}

/**
 * Get total unread message count for a user.
 */
async function getUnreadCount(userId) {
  const row = get(
    `SELECT COUNT(*) as count FROM messages WHERE recipientId = ? AND readByRecipient = 0`,
    [String(userId)]
  );
  return row?.count || 0;
}

/**
 * Delete a message by ID (only sender can delete).
 */
async function deleteMessage(messageId, senderId) {
  run(
    `DELETE FROM messages WHERE id = ? AND senderId = ?`,
    [messageId, String(senderId)]
  );
}

module.exports = {
  createMessage,
  getConversations,
  getMessages,
  markConversationRead,
  getUnreadCount,
  deleteMessage,
};
