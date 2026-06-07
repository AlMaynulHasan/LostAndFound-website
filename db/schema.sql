CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  studentId TEXT,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  ownerEmail TEXT,
  type TEXT NOT NULL,
  title TEXT,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  locationDetails TEXT,
  dateLost TEXT,
  category TEXT,
  contactMethod TEXT,
  anonymous INTEGER NOT NULL DEFAULT 0,
  reportedByName TEXT,
  photoPath TEXT,
  returnInfo TEXT,
  returnBy TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  verificationQuestions TEXT,
  returnAdminConfirmedAt TEXT,
  returnAdminConfirmedBy TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  itemId INTEGER NOT NULL,
  claimantId TEXT,
  claimantName TEXT,
  claimantEmail TEXT,
  description TEXT,
  claimedDate TEXT,
  proofPath TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  answers TEXT,
  score TEXT,
  seenByClaimant INTEGER NOT NULL DEFAULT 1,
  returnStatus TEXT,
  acceptedAt TEXT,
  returnWindowEndsAt TEXT,
  returnDueAt TEXT,
  verificationCode TEXT,
  returnRequestedAt TEXT,
  returnCompletedAt TEXT,
  returnReminderSentAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT,
  FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  senderId TEXT,
  senderName TEXT,
  recipientId TEXT,
  recipientName TEXT,
  content TEXT NOT NULL,
  readByRecipient INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_userId ON items(userId);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_createdAt ON items(createdAt);
CREATE INDEX IF NOT EXISTS idx_claims_itemId ON claims(itemId);
CREATE INDEX IF NOT EXISTS idx_claims_claimantId ON claims(claimantId);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipientId);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY NOT NULL,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
