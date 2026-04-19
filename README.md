# Lost2Found - Campus Lost & Found Platform

A simple web application to report, search, and claim lost and found items on campus.

## ✨ Features

- **User Registration & Login** - Secure authentication with bcrypt hashing
- **Report Items** - Post lost or found items with descriptions
- **Search & Filter** - Find items by name, category, location, type, and date
- **Claims System** - Claimants can submit claims with verification questions
- **Verification** - Item owners set verification questions to confirm ownership
- **Dashboard** - Track your reported items and claims
- **Admin Panel** - Manage claims, users, and view statistics
- **Messaging** - Direct messaging between users
- **JSON Storage** - All data persists in JSON files (no database setup needed)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on Node 24)

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Visit **http://localhost:3000** in your browser.

### Configuration (Optional)

Create a `.env` file for optional settings:

```bash
# Session security (recommended to change)
SESSION_SECRET=your-random-secret-key

# Image uploads (optional - Cloudinary)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Server port
PORT=3000
NODE_ENV=development
```

## 📁 Project Structure

```
├── app.js                 # Main Express server
├── db.js                  # JSON file database layer
├── data/                  # JSON data storage
│   ├── users.json
│   ├── items.json
│   ├── messages.json
│   └── sessions.json
├── models/               # Data access logic
│   ├── user.js
│   ├── item.js
│   ├── message.js
│   └── admin.js
├── routes/               # API routes
│   ├── auth.js
│   ├── items.js
│   ├── chat.js
│   ├── dashboard.js
│   └── admin.js
├── views/                # EJS templates
│   ├── layout.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── report.ejs
│   └── ...
├── public/               # CSS, JS, uploads
│   ├── css/
│   ├── js/
│   └── uploads/
└── services/             # External services
    └── cloudinary.js

```

## 🔑 Key Features Explained

### Authentication
- Users register with email, name, and student ID
- Passwords hashed with bcryptjs (12 rounds)
- Session-based authentication

### Item Reporting
- Report lost or found items with:
  - Title, description, category
  - Location and date
  - Optional photo (via Cloudinary)
  - Verification questions (for ownership confirmation)

### Claims & Verification
- Claimants submit claims on items
- System calculates confidence score based on:
  - Answer accuracy (40 points max)
  - Proof provided (40 points max)
  - Timeline match (20 points max)
- Item owner accepts/denies claims
- Accepted claimants have 72-hour return window

### Admin Dashboard
- View statistics (total users, items, claims)
- Manage pending claims
- View recent items and users
- Handle multi-claim items

## 📝 Default Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage with recent items |
| `/auth/register` | User registration |
| `/auth/login` | User login |
| `/items/report` | Report new item |
| `/items/search` | Search items |
| `/items/lost` | Browse lost items |
| `/items/found` | Browse found items |
| `/items/returned` | View resolved items |
| `/dashboard` | User dashboard |
| `/chat` | Direct messaging |
| `/admin` | Admin panel (admin only) |

## 🛠 Development

### Available Scripts

```bash
npm start         # Start development server
npm run dev       # Start with auto-reload (requires nodemon)
npm run migrate   # Run migrations (if needed)
```

### Watch Mode (Optional)
Install nodemon globally:
```bash
npm install -g nodemon
npm run dev
```

## 🗄️ Database (JSON-Based)

Data is stored in `data/` directory as JSON files:

- **users.json** - User accounts (email, hashed passwords, roles)
- **items.json** - Lost/found items with claims
- **messages.json** - Direct messages between users
- **sessions.json** - Session data (in-memory)

No database setup required! ✅

## 🔒 Security Notes

⚠️ **For Production:**
- Add CSRF protection
- Implement input sanitization
- Add rate limiting
- Use HTTPS only
- Add helmet middleware
- Validate all user inputs
- Keep `.env` secrets secure
- Use environment variables, not hardcoded values

## 📸 Cloudinary Setup (Optional)

For image uploads:
1. Create account at https://cloudinary.com
2. Get API credentials
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

## 🐛 Troubleshooting

**Port 3000 already in use:**
```bash
# Use a different port
PORT=3001 npm start
```

**Session errors:**
- Clear browser cookies and restart

**JSON file locked:**
- Restart the server

## 📄 License

MIT

## 👨‍💻 Contributing

Feel free to fork and submit pull requests!

---

**Lost2Found** - Making campus safer, one item at a time! 🎓

