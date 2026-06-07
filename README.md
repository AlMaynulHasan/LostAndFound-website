# Lost2Found — Campus Lost & Found Platform

> **Live:** [https://lost2found-chv7.onrender.com](https://lost2found-chv7.onrender.com)

A full-stack campus lost & found web application built for students. Report lost or found items, claim them with verification, and coordinate safe returns — all in one place.

---

## ✨ Features

### For Students
- **Report Lost or Found items** with photos, category, campus location dropdown
- **Smart claim system** — separate flows for "I found this" vs "This is mine"
- **Verification questions** — set by item owner to filter fake claims
- **Real-time chat** — message finders/owners directly on the platform
- **Dashboard** — track your posts, incoming claims, and claim history
- **Wall of Kindness** — leaderboard rewarding students who return items

### Platform
- 🔐 Secure authentication with student ID format validation
- 📧 Email notifications (claim submitted, accepted, denied)
- ⏰ Auto-archive items after 30 days (23-day reminder)
- 📱 Mobile-friendly with bottom navigation bar
- 🌙 Dark mode support
- 🖼️ Cloudinary image upload with auto-optimization (800px, quality:auto)
- 🗂️ Category-aware placeholder icons when no photo uploaded

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Views | EJS + express-ejs-layouts |
| Database | Turso (libSQL / SQLite cloud) |
| Session Store | Custom Turso-backed session store |
| Image Upload | Cloudinary (multer-storage-cloudinary) |
| Email | Nodemailer (Gmail SMTP) |
| Scheduling | node-cron |
| Security | helmet, express-rate-limit, xss, CSRF (signed cookie) |
| Deployment | Render.com |

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Clone
```bash
git clone https://github.com/AlMaynulHasan/LostAndFound-website.git
cd LostAndFound-website
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
NODE_ENV=development
PORT=3000
SESSION_SECRET=any-random-secret-string

# Database — leave blank to use local SQLite (data/lost2found.sqlite)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Cloudinary (optional — local disk used if not set)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=lost2found

# Email (optional — emails skipped if not set)
MAIL_USER=your@gmail.com
MAIL_PASS=your-gmail-app-password

# Admin account (auto-created on first boot)
ADMIN_EMAIL=admin@campus.edu
ADMIN_PASSWORD=yourpassword
ADMIN_NAME=Admin
ADMIN_STUDENT_ID=ADMIN-0001
```

> **Local mode:** Without Turso credentials, the app uses a local SQLite file at `data/lost2found.sqlite` — no external setup needed.

### 4. Run
```bash
npm start
# or with auto-restart:
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

Admin account is auto-created on first boot using `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 📁 Project Structure

```
LostAndFound-website/
├── app.js                  # Express app setup, middleware, startup
├── db.js                   # In-memory db object + init/write helpers
│
├── db/
│   ├── sqlite.js           # Dual-mode: Turso (prod) / better-sqlite3 (local)
│   └── schema.sql          # Tables: users, items, claims, messages, sessions
│
├── models/
│   ├── user.js             # createUser, findByEmail, findById
│   ├── item.js             # createItem, addClaim, updateClaimStatus, etc.
│   ├── message.js          # createMessage, getConversations, getMessages
│   └── admin.js            # Admin-specific queries
│
├── routes/
│   ├── index.js            # Home page + top helpers (Wall of Kindness)
│   ├── auth.js             # Register, login, logout
│   ├── items.js            # Report, search, claim, accept/deny, resolve
│   ├── chat.js             # Messaging + SSE real-time stream
│   ├── dashboard.js        # User dashboard
│   └── admin.js            # Admin panel
│
├── services/
│   ├── mailer.js           # Nodemailer email helpers
│   ├── cronJobs.js         # Auto-expiry cron (daily 08:00)
│   ├── cloudinary.js       # Cloudinary config + default upload options
│   └── tursoSessionStore.js # express-session store backed by Turso
│
├── views/
│   ├── layout.ejs          # Base layout (nav, footer, scripts)
│   ├── index.ejs           # Homepage (recent items + Wall of Kindness)
│   ├── report.ejs          # Lost/Found report form (tab switcher)
│   ├── item.ejs            # Item detail + claim wizard
│   ├── dashboard.ejs       # User dashboard (tabs: active/resolved/claims)
│   ├── chat.ejs            # Real-time chat UI
│   ├── search.ejs          # Search + filter results
│   └── partials/
│       ├── header.ejs
│       ├── category-icon.ejs  # Category-based SVG placeholder icons
│       └── ...
│
├── public/
│   ├── css/styles.css
│   └── js/app.js
│
├── scripts/
│   └── create-admin.js     # Manual admin creation script
│
├── render.yaml             # Render.com deployment config
└── .env.example            # Environment variable template
```

---

## 🌐 Deployment (Render.com)

The app is deployed on [Render.com](https://render.com) using `render.yaml`.

### Environment variables required on Render:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Random secret string |
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `MAIL_USER` | Gmail address |
| `MAIL_PASS` | Gmail App Password |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |
| `ADMIN_NAME` | Admin display name |

---

## 🔒 Security

- **CSRF protection** — signed cookie-based token on all POST forms
- **Helmet** — security headers including CSP
- **Rate limiting** — 100 req/15min globally, 10 req/15min on auth routes
- **XSS sanitization** — all user input sanitized before saving
- **Student ID validation** — 16-digit campus format enforced
- **No hardcoded credentials** — all secrets via environment variables

---

## 📋 API Routes Summary

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Homepage |
| `GET/POST` | `/auth/register` | Register |
| `GET/POST` | `/auth/login` | Login |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/items/search` | Search items |
| `GET/POST` | `/items/report` | Report lost/found item |
| `GET` | `/items/:id` | Item detail |
| `POST` | `/items/:id/claim` | Submit claim |
| `POST` | `/items/:id/claim/:claimId/accept` | Accept claim |
| `POST` | `/items/:id/claim/:claimId/deny` | Deny claim |
| `POST` | `/items/:id/resolve` | Mark as returned |
| `GET` | `/chat` | Chat list |
| `GET` | `/chat/:userId` | Chat with user |
| `POST` | `/chat/send` | Send message |
| `GET` | `/dashboard` | User dashboard |
| `GET` | `/health` | Health check (returns `{status:"ok"}`) |

---

## 🧪 Testing the Full Flow

1. Register two accounts in different browsers (or incognito)
2. **User A:** Report a lost item with verification questions
3. **User B:** Find the item → click "I Found This!" → fill the claim form
4. **User A:** Go to Dashboard → review claim → Accept
5. **User A & B:** Chat to arrange pickup
6. **User A:** Click "Mark as Returned" after handover

---

## 📄 License

MIT — free to use and modify.
