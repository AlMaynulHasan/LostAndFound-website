# Development Guide - For Developers

This guide is for developers who want to understand, modify, or extend the Lost2Found application.

## Project Overview

**Lost2Found** is a Node.js + Express web application for reporting and claiming lost/found items on campus.

### Tech Stack
- **Backend:** Node.js + Express.js
- **Database:** lowdb (JSON-based) / MongoDB (production)
- **Frontend:** EJS templates + Vanilla JavaScript
- **Auth:** bcryptjs + express-session
- **File Upload:** Cloudinary or local storage
- **Real-time:** Socket.io (ready for messaging)

---

## Getting Started (Development)

### 1. Setup

```bash
# Clone repo
git clone <repo-url>
cd LostAndFound-website-master

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server (auto-reload)
npm run dev
```

### 2. Run in Development Mode

```bash
npm run dev
```

This uses **nodemon** to auto-restart when you change files.

---

## Project Architecture

### Directory Structure

```
├── app.js                    # Main Express application
├── db.js                     # Database initialization
├── package.json              # Dependencies
│
├── data/
│   └── db.json              # Local JSON database
│
├── models/                  # Data models (lowdb operations)
│   ├── user.js             # User CRUD operations
│   ├── item.js             # Item/Report CRUD operations
│   ├── message.js          # Messaging operations
│   └── admin.js            # Admin functions
│
├── routes/                  # API endpoints
│   ├── index.js            # Home page
│   ├── auth.js             # /auth/* endpoints
│   ├── items.js            # /items/* endpoints
│   ├── chat.js             # /chat/* endpoints
│   ├── dashboard.js        # /dashboard/* endpoints
│   └── admin.js            # /admin/* endpoints
│
├── middleware/             # Custom middleware
│   └── auth.js            # Authentication checks
│
├── views/                  # EJS templates
│   ├── layout.ejs          # Base template
│   ├── index.ejs           # Home page
│   ├── login.ejs           # Login form
│   ├── register.ejs        # Registration form
│   ├── item.ejs            # Item detail page
│   ├── chat.ejs            # Messaging page
│   ├── dashboard.ejs       # User dashboard
│   ├── admin.ejs           # Admin panel
│   └── partials/           # Reusable components
│       ├── header.ejs
│       ├── footer.ejs
│       └── messages.ejs
│
├── public/                 # Static files
│   ├── css/
│   │   └── styles.css      # Main stylesheet
│   ├── js/
│   │   ├── app.js          # Frontend JavaScript
│   │   └── message.js      # Messaging script
│   ├── images/             # Static images
│   └── uploads/            # User uploaded files
│
├── services/               # External services
│   └── cloudinary.js       # Image upload service
│
└── scripts/                # Utility scripts
    ├── create-admin.js     # Create admin user
    ├── fix-item-owners.js
    ├── fix-message-users.js
    ├── fix-photos.js
    ├── import-seed.js      # Seed data
    ├── import-users.js
    └── migrate.js
```

---

## Understanding the Code Flow

### 1. User Registration Flow

```
POST /auth/register
  ↓
routes/auth.js (POST handler)
  ↓
models/user.js → createUser()
  ↓
bcryptjs → hash password
  ↓
db.write() → save to data/db.json
  ↓
Redirect to login
```

### 2. Item Report Flow

```
POST /items/report
  ↓
auth.isLoggedIn (middleware)
  ↓
routes/items.js (POST handler)
  ↓
multer → upload image
  ↓
models/item.js → createItem()
  ↓
db.write() → save to data/db.json
  ↓
Redirect to dashboard
```

### 3. Messaging Flow

```
POST /chat/send
  ↓
auth.isLoggedIn (middleware)
  ↓
routes/chat.js (POST handler)
  ↓
models/message.js → createMessage()
  ↓
db.write() → save to data/db.json
  ↓
JSON response → Frontend updates UI
```

---

## Key Files Explained

### app.js
- **Purpose:** Main Express application setup
- **Contains:** Middleware, route mounting, session setup
- **Key lines:** 
  - Line 36: Database initialization
  - Line 52: Session setup
  - Line ~100+: Route mounting

### db.js
- **Purpose:** Database connection
- **Currently:** Uses lowdb (JSON file)
- **Change for MongoDB:** Replace with mongoose connection

### models/user.js
```javascript
// Example: Create user
const newUser = await createUser({
  email: 'user@example.com',
  name: 'John Doe',
  studentId: '12345',
  password: 'securePass123',
  role: 'user'  // or 'admin'
});
```

### models/item.js
```javascript
// Example: Create item report
const itemId = await createItem({
  userId: '1',
  reportedByName: 'John Doe',
  name: 'Lost Wallet',
  category: 'accessories',
  type: 'lost',  // or 'found'
  location: 'Library - 3rd Floor',
  description: 'Brown leather wallet',
  imageUrl: '/uploads/wallet.jpg',
  status: 'open'
});
```

### models/message.js
```javascript
// Example: Send message
const msg = await createMessage({
  senderId: '1',
  senderName: 'John Doe',
  recipientId: '2',
  recipientName: 'Jane Smith',
  content: 'Is this your wallet?'
});
```

### routes/auth.js
- Handles: `/auth/register`, `/auth/login`, `/auth/logout`
- Uses: middleware/auth.js for protected routes
- Manages: User sessions, password hashing

### routes/items.js
- Handles: `/items/search`, `/items/report`, `/items/:id`
- Uses: Item model, multer for uploads
- Features: Filtering, sorting, pagination

### routes/chat.js
- Handles: `/chat`, `/chat/messages/:userId`
- Uses: Message model, Socket.io ready
- Features: Conversation history, unread count

### middleware/auth.js
```javascript
// Check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).send('Admin access required');
  }
  next();
};
```

---

## Making Changes

### Adding a New Route

**File: `routes/newfeature.js`**
```javascript
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');

// GET route
router.get('/', (req, res) => {
  res.render('newfeature', { title: 'New Feature' });
});

// POST route
router.post('/', isLoggedIn, (req, res) => {
  // Your code here
  res.redirect('/');
});

module.exports = router;
```

**File: `app.js` (add this line around line 100+)**
```javascript
const newfeatureRoutes = require('./routes/newfeature');
app.use('/newfeature', newfeatureRoutes);
```

### Adding a New Model Function

**File: `models/item.js`** (add this function)
```javascript
async function findByCategory(category) {
  await db.read();
  const items = db.data?.items || [];
  return items.filter((item) => item.category === category);
}

// Export it
module.exports = {
  // ... existing exports
  findByCategory,
};
```

### Creating a New EJS Template

**File: `views/newpage.ejs`**
```ejs
<div class="container">
  <h1><%= title %></h1>
  <p><%= currentUser.name %></p>
  
  <% if (items.length > 0) { %>
    <% items.forEach(item => { %>
      <div class="item">
        <h3><%= item.name %></h3>
        <p><%= item.description %></p>
      </div>
    <% }); %>
  <% } else { %>
    <p>No items found</p>
  <% } %>
</div>
```

---

## Testing Locally

### Manual Testing

1. **Test Registration**
   - Go to http://localhost:3000/auth/register
   - Fill form with test data
   - Verify data saved to `data/db.json`

2. **Test Item Report**
   - Login
   - Click "Report Item"
   - Submit form
   - Check `data/db.json` for new item

3. **Test Messaging**
   - Create 2 accounts
   - User 1: Report an item
   - User 2: Send message about item
   - Verify in chat page

4. **Test Admin**
   - Create admin account (manually edit `data/db.json`)
   - Set `role: 'admin'`
   - Access `/admin` dashboard

### Console Logging

```javascript
// In any route
console.log('Current user:', req.session.user);
console.log('Request body:', req.body);
console.log('Database contents:', db.data);
```

Then check Terminal where you ran `npm start`.

---

## Database Operations

### Reading Data

```javascript
const { db } = require('../db');

// Read users
await db.read();
const users = db.data?.users || [];
const user = users.find(u => u.id === '1');
```

### Writing Data

```javascript
// Modify data
const { db } = require('../db');
await db.read();
db.data.users[0].name = 'Updated Name';
await db.write();
```

### Query Examples

```javascript
// Find by property
const items = items.filter(i => i.status === 'open');

// Sort
const sorted = items.sort((a, b) => 
  new Date(b.createdAt) - new Date(a.createdAt)
);

// Map/Transform
const names = users.map(u => u.name);

// Count
const count = items.length;
const openCount = items.filter(i => i.status === 'open').length;
```

---

## Common Tasks

### Add New Item Status

1. **Update item form** in `views/report.ejs`
2. **Update model** if needed
3. **Test** form submission

### Add New User Role

1. **Update role in** `models/user.js`
2. **Create middleware** for authorization
3. **Add role check** to protected routes

### Add New Search Filter

**File: `models/item.js`**
```javascript
async function searchByKeyword(keyword) {
  await db.read();
  const items = db.data?.items || [];
  const lower = keyword.toLowerCase();
  return items.filter(item => 
    item.name.toLowerCase().includes(lower) ||
    item.description.toLowerCase().includes(lower)
  );
}
```

**File: `routes/items.js`**
```javascript
router.get('/search', async (req, res) => {
  const { keyword } = req.query;
  const results = await findByKeyword(keyword);
  res.json(results);
});
```

---

## Upgrading to MongoDB

### Step 1: Update db.js

```javascript
const mongoose = require('mongoose');

async function init() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  
  await mongoose.connect(uri);
  return mongoose;
}

module.exports = { mongoose, init };
```

### Step 2: Rewrite Models Using Mongoose

```javascript
const { mongoose } = require('../db');

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createUser(data) {
  return User.create(data);
}

async function findByEmail(email) {
  return User.findOne({ email });
}

module.exports = { createUser, findByEmail };
```

### Step 3: Update package.json

```json
{
  "dependencies": {
    "mongoose": "^8.0.0",
    "connect-mongo": "^5.1.0"
  }
}
```

---

## Performance Tips

1. **Index frequently queried fields** in MongoDB
2. **Paginate results** for large datasets
3. **Cache static data** in memory
4. **Use lean()** in MongoDB for faster reads
5. **Profile** with `console.time()` / `console.timeEnd()`

---

## Debugging Tips

### Check what's happening

```javascript
// In route handler
console.log('Request came to route');
console.log('Body:', req.body);
console.log('User:', req.session.user);
console.log('Database:', db.data);
```

### Check database content

```bash
# View the JSON database
cat data/db.json

# On Windows
type data\db.json
```

### Clear database and restart

```bash
# Delete database
rm data/db.json  # Mac/Linux
del data\db.json # Windows

# Restart server
npm run dev
```

---

## Git Workflow

```bash
# Create a new branch for features
git checkout -b feature/new-feature

# Make changes
# ... edit files ...

# Commit changes
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/new-feature

# Create Pull Request on GitHub
```

---

## Code Style

- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and models
- Use **UPPERCASE** for constants
- Comment complex logic
- Keep functions small and focused

Example:
```javascript
// ✅ Good
const userEmail = 'user@example.com';
const User = require('./models/user');
const MAX_PASSWORD_LENGTH = 128;

// ❌ Avoid
const UEmail = 'user@example.com';
const user = require('./models/user');
const max_password_length = 128;
```

---

## Environment Variables

### Development
```
NODE_ENV=development
PORT=3000
SESSION_SECRET=dev-secret-123
```

### Production
```
NODE_ENV=production
PORT=3000 (auto-set by platform)
SESSION_SECRET=strong-random-string-here
CLOUDINARY_CLOUD_NAME=your-real-cloud-name
CLOUDINARY_API_KEY=real-api-key
CLOUDINARY_API_SECRET=real-api-secret
```

---

## Useful npm Commands

```bash
npm install package-name     # Install package
npm uninstall package-name   # Remove package
npm audit                    # Check vulnerabilities
npm audit fix                # Auto-fix issues
npm start                    # Production mode
npm run dev                  # Development mode
npm test                     # Run tests (if configured)
```

---

## Resources

- **Express Docs:** https://expressjs.com
- **EJS Docs:** https://ejs.co
- **lowdb Docs:** https://github.com/typicode/lowdb
- **Mongoose Docs:** https://mongoosejs.com
- **bcryptjs Docs:** https://github.com/dcodeIO/bcrypt.js

---

## Getting Help

1. Check the code comments
2. Review similar functionality in the codebase
3. Check Express/EJS documentation
4. Add `console.log()` statements
5. Read GitHub issues/discussions

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Test locally
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

---

Happy coding! 🚀
