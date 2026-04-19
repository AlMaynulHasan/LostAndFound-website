const { readCollection, writeCollection } = require('../db');
const { nanoid } = require('nanoid');

exports.createMessage = async (msg) => {
  const messages = await readCollection('messages');
  
  const newMessage = {
    id: nanoid(),
    ...msg,
    readByRecipient: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  messages.push(newMessage);
  await writeCollection('messages', messages);
  return newMessage;
};

exports.getConversations = async (userId) => {
  const uId = String(userId);
  const messages = await readCollection('messages');
  
  // Filter messages involving this user and sort by date
  const userMessages = messages
    .filter(m => String(m.senderId) === uId || String(m.recipientId) === uId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const conversationMap = new Map();

  userMessages.forEach(m => {
    const sId = String(m.senderId);
    const rId = String(m.recipientId);

    const otherId = sId === uId ? rId : sId;
    const otherName = sId === uId ? m.recipientName : m.senderName;
    const isUnreadForUser = rId === uId && !m.readByRecipient;

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
  const uId = String(userId);
  const oId = String(otherId);
  
  const messages = await readCollection('messages');
  
  return messages
    .filter(m => 
      (String(m.senderId) === uId && String(m.recipientId) === oId) ||
      (String(m.senderId) === oId && String(m.recipientId) === uId)
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

exports.markConversationRead = async (userId, otherId) => {
  const uId = String(userId);
  const oId = String(otherId);
  
  const messages = await readCollection('messages');
  let changed = false;
  
  messages.forEach(m => {
    if (String(m.senderId) === oId && String(m.recipientId) === uId && !m.readByRecipient) {
      m.readByRecipient = true;
      changed = true;
    }
  });
  
  if (changed) {
    await writeCollection('messages', messages);
  }
};

exports.getUnreadCount = async (userId) => {
  const uId = String(userId);
  const messages = await readCollection('messages');
  
  return messages.filter(m => 
    String(m.recipientId) === uId && !m.readByRecipient
  ).length;
};
