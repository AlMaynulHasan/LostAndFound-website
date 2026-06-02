# Lost2Found - Quick Setup Guide

## ⚡ 5-Minute Setup

### Step 1: Download & Navigate
```bash
# Clone the repo
git clone https://github.com/your-username/LostAndFound-website.git
cd LostAndFound-website-master
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Create .env File
Copy `.env.example` to `.env`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Mac/Linux (Terminal):**
```bash
cp .env.example .env
```

### Step 4: Start Server
```bash
npm start
```

### Step 5: Open in Browser
```
http://localhost:3000
```

---

## 🎯 Complete Command Cheat Sheet

### First Time Setup
```bash
# 1. Navigate to project
cd LostAndFound-website-master

# 2. Install all packages
npm install

# 3. Copy environment file
cp .env.example .env        # Mac/Linux
# OR
Copy-Item .env.example .env # Windows PowerShell

# 4. Start the server
npm start

# 5. Open browser
# http://localhost:3000
```

### Start Server (After Setup)
```bash
npm start
```

### Development Mode (Auto-Restart)
```bash
npm run dev
```

### Stop Server
```
Press Ctrl + C in the terminal
```

---

## ✅ Verification Checklist

After running `npm start`, you should see:
```
Lost2Found running at http://localhost:3000
```

Then:
- [ ] Open http://localhost:3000 in browser
- [ ] Click "Register"
- [ ] Create test account (email, name, password)
- [ ] Login with your credentials
- [ ] Click "Report Lost Item" to test
- [ ] See home page with list of items

If you see all of this, you're all set! ✅

---

## 🐛 Quick Troubleshooting

### "Port 3000 is already in use"
```bash
# Edit .env and change PORT=3001
# Then: npm start
```

### "Cannot find module..."
```bash
# Delete and reinstall
rm -r node_modules     # Mac/Linux
rmdir /s node_modules  # Windows

npm install
npm start
```

### "App won't start"
```bash
# Check Node.js version (must be 18+)
node --version

# Make sure .env file exists
# Try again
npm start
```

### Images not uploading
- Update `.env` with real Cloudinary credentials
- Or use demo mode (images stored locally)

---

## 📁 Important Files & Folders

| File/Folder | Purpose |
|-------------|---------|
| `.env` | Environment variables (create this first!) |
| `app.js` | Main server file |
| `data/db.json` | Local database |
| `views/` | Web pages (HTML templates) |
| `routes/` | Website endpoints |
| `public/` | CSS, images, uploads |

---

## 🚀 What to Test After Setup

1. **Register** - Create a test account
2. **Login** - Sign in with your account
3. **Report Item** - Report a lost/found item
4. **Search** - Find items you reported
5. **Message** - Send message to another user (create 2nd account to test)
6. **Dashboard** - Check your items status

---

## 📱 Browser Access

Once server is running:
- **Home:** http://localhost:3000
- **Register:** http://localhost:3000/auth/register
- **Login:** http://localhost:3000/auth/login
- **Search:** http://localhost:3000/items/search

---

## 💾 Data Storage

- **Database:** `data/db.json` (JSON file, no setup needed)
- **Sessions:** In-memory (cleared on restart)
- **Images:** `public/uploads/` (or Cloudinary if configured)

---

## 🔧 Available Commands

```bash
npm start              # Start server (production mode)
npm run dev            # Start with auto-reload (development)
npm run migrate        # Run database migration
npm install            # Install dependencies
npm audit              # Check security issues
npm audit fix          # Fix vulnerabilities
npm cache clean --force # Clear npm cache
```

---

## 📞 Need Help?

1. Check that Node.js version is 18+ → `node --version`
2. Make sure `.env` file exists in project root
3. Check that port 3000 is free
4. Look for error messages in terminal
5. Try deleting `node_modules` and running `npm install` again

---

## ✨ Server Running Successfully? 

If you see:
```
Lost2Found running at http://localhost:3000
```

Then go to: **http://localhost:3000** 🎉

You're ready to use Lost2Found!
