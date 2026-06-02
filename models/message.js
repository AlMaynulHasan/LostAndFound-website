const { db } = require('../db');
const { nanoid } = require('nanoid');

function getNextMessageId() {
  const messages = db.data?.messages || [];
  if (!messages.length) return 1;
  return Math.max(...messages.map((m) => parseInt(m.id) || 0)) + 1;
}

exports.createMessage = async (msg) => {
  await db.read();
  db.data = db.data || { users: [], items: [], messages: [] };

  const id = String(getNextMessageId());
  const newMessage = {
    id,
    ...msg,
    readByRecipient: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.data.messages.push(newMessage);
  await db.write();
  return newMessage;
};

exports.getConversations = async (userId) => {
  await db.read();
  const messages = db.data?.messages || [];
  const uId = String(userId);

  const conversationMap = new Map();

  messages.forEach((m) => {
    const sId = String(m.senderId);
    const rId = String(m.recipientId);

    const otherId = sId === uId ? rId : sId;
    const otherName = sId === uId ? m.recipientName : m.senderName;
    const isUnreadForUser = rId === uId && m.readByRecipient !== true;

    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, {
        userId: otherId,
        name: otherName || 'User',
        lastMessage: { content: m.content, createdAt: m.createdAt },
        timestamp: m.createdAt,
        unreadCount: isUnreadForUser ? 1 : 0,
      });
    } else {
      const conv = conversationMap.get(otherId);
      if (new Date(m.createdAt) > new Date(conv.timestamp)) {
        conv.lastMessage = { content: m.content, createdAt: m.createdAt };
        conv.timestamp = m.createdAt;
        conv.name = otherName || conv.name;
      }
      if (isUnreadForUser) {
        conv.unreadCount += 1;
      }
    }
  });

  return Array.from(conversationMap.values()).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
};

exports.getMessages = async (userId, otherId) => {
  await db.read();
  const messages = db.data?.messages || [];
  const uId = String(userId);
  const oId = String(otherId);

  return messages
    .filter(
      (m) =>
        (String(m.senderId) === uId && String(m.recipientId) === oId) ||
        (String(m.senderId) === oId && String(m.recipientId) === uId)
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

exports.markConversationRead = async (userId, otherId) => {
  await db.read();
  const messages = db.data?.messages || [];
  const uId = String(userId);
  const oId = String(otherId);

  messages.forEach((m) => {
    if (String(m.senderId) === oId && String(m.recipientId) === uId) {
      m.readByRecipient = true;
      m.updatedAt = new Date().toISOString();
    }
  });

  await db.write();
};

exports.getUnreadCount = async (userId) => {
  await db.read();
  const messages = db.data?.messages || [];
  const uId = String(userId);

  return messages.filter(
    (m) => String(m.recipientId) === uId && m.readByRecipient !== true
  ).length;
};
