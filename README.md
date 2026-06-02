# Lost2Found - Campus Lost & Found Application

A web application to report and search for lost and found items on campus with user authentication, real-time messaging, and admin dashboard.

## Features

- 👤 User registration and authentication
- 📝 Report lost or found items with photos
- 🔍 Advanced search and filtering
- 💬 Real-time messaging between users
- 📊 Admin dashboard with analytics
- 🎯 Claim management system
- ✅ Item status tracking (open, pending, resolved)

## Prerequisites

Before you start, make sure you have:

- **Node.js** version 18 or higher (tested on Node 24)
  - Download from: https://nodejs.org/
  - Check installation: `node --version`
- **npm** (comes with Node.js)
  - Check installation: `npm --version`
- **Git** (optional, for cloning the repo)
  - Download from: https://git-scm.com/

## Installation & Setup

### Step 1: Clone or Download the Repository

**Option A: Using Git (Recommended)**
```bash
git clone https://github.com/your-username/LostAndFound-website.git
cd LostAndFound-website-master
```

**Option B: Download as ZIP**
1. Click "Code" → "Download ZIP" on GitHub
2. Extract the ZIP file
3. Open Command Prompt/PowerShell in the extracted folder

### Step 2: Install Dependencies

Navigate to the project folder in your terminal and run:

```bash
npm install
```

This will install all required packages (Express, EJS, lowdb, etc.)

### Step 3: Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=demo_key
CLOUDINARY_API_SECRET=demo_secret
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
CLOUDINARY_FOLDER=lost2found
NODE_ENV=development
PORT=3000
```

**Note:** For image uploads, get real Cloudinary credentials from: https://cloudinary.com/

### Step 4: Run the Server

```bash
npm start
```

You should see:
```
Lost2Found running at http://localhost:3000
```

### Step 5: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## Using the Application

### For Users:

1. **Register/Login**
   - Click "Register" to create a new account
   - Enter email, name, student ID, and password
   - Login with your credentials

2. **Report an Item**
   - Click "Report Lost Item" or "Report Found Item"
   - Fill in item details (name, category, description)
   - Upload a photo (optional)
   - Submit the report

3. **Search Items**
   - Use the search bar to find items
   - Filter by category, location, type (lost/found)
   - View item details and contact the reporter

4. **Chat/Messaging**
   - Click on an item to message the reporter
   - View conversation history
   - Mark messages as read

5. **Dashboard**
   - Track your reported items
   - View claims on your items
   - Check message notifications

### For Admins:

1. **Admin Login**
   - Use admin credentials (if created)
   - Access admin panel

2. **Dashboard**
   - View platform statistics
   - Monitor pending claims
   - Manage users and items

## Project Structure

```
LostAndFound-website-master/
├── app.js                 # Main Express server
├── db.js                  # Database configuration (lowdb)
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── .env.example           # Example environment file
│
├── data/                  # Local JSON database
│   └── db.json           # Application data storage
│
├── models/               # Data models
│   ├── user.js          # User model
│   ├── item.js          # Item/Report model
│   ├── message.js       # Messaging model
│   └── admin.js         # Admin functions
│
├── routes/              # API endpoints
│   ├── auth.js         # Authentication routes
│   ├── items.js        # Item management
│   ├── chat.js         # Messaging
│   ├── dashboard.js    # User dashboard
│   ├── admin.js        # Admin panel
│   └── index.js        # Home page
│
├── views/              # EJS templates
│   ├── index.ejs      # Home page
│   ├── login.ejs      # Login page
│   ├── register.ejs   # Registration page
│   ├── item.ejs       # Item detail
│   ├── chat.ejs       # Messaging page
│   ├── dashboard.ejs  # User dashboard
│   ├── admin.ejs      # Admin dashboard
│   └── partials/      # Reusable components
│
├── public/            # Static files
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   └── message.js
│   ├── images/
│   └── uploads/       # User uploaded images
│
├── middleware/        # Custom middleware
│   └── auth.js       # Authentication checks
│
└── services/         # External services
    └── cloudinary.js # Image upload service
```

## Complete Setup Command Reference

**For Windows (PowerShell):**
```powershell
# Navigate to project folder
cd path\to\LostAndFound-website-master

# Install dependencies
npm install

# Create .env file (copy from .env.example)
Copy-Item .env.example .env

# Start server
npm start
```

**For Mac/Linux (Terminal):**
```bash
# Navigate to project folder
cd path/to/LostAndFound-website-master

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start server
npm start
```

## Available Scripts

```bash
npm start          # Start the production server
npm run dev        # Start with nodemon (auto-restart on changes)
npm run migrate    # Run database migration
npm audit          # Check for security vulnerabilities
npm audit fix      # Auto-fix vulnerabilities
```

## Database

The application uses **lowdb** - a lightweight JSON-based database:

- **Location:** `data/db.json`
- **Data Types:** Users, Items, Messages, Sessions
- **No Setup:** Works out of the box, no external database needed
- **Persistence:** Data is saved to disk automatically

## Troubleshooting

### Error: "PORT 3000 is already in use"
```bash
# Change port in .env file
PORT=3001

# Then restart: npm start
```

### Error: "Cannot find module 'X'"
```bash
# Reinstall all dependencies
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### Application won't start / Server crashes
1. Check Node.js version: `node --version` (should be 18+)
2. Delete `node_modules` folder and `package-lock.json`
3. Run `npm install` again
4. Check `.env` file exists and has correct values
5. Run `npm start` again

### Images not uploading
- Configure real Cloudinary credentials in `.env`
- Default demo credentials won't upload files

### Can't access localhost:3000
- Make sure server is running (you should see "Lost2Found running at..." message)
- Try in different browser
- Check firewall isn't blocking port 3000

## Development Notes

### File Locations:
- **Server entry point:** `app.js`
- **Database file:** `data/db.json`
- **Session secret:** Change in `.env` for production
- **Upload folder:** `public/uploads/`

### Testing the Application:
1. Register 2 different user accounts
2. User 1: Report a lost item
3. User 2: Search and find the item
4. User 2: Send message to User 1
5. Test messaging and claim features

## API Endpoints Summary

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/auth/register` | Create new user |
| POST | `/auth/login` | User login |
| GET | `/items/search` | Search items |
| POST | `/items/report` | Report new item |
| GET | `/items/:id` | View item details |
| POST | `/chat/send` | Send message |
| GET | `/dashboard` | User dashboard |
| GET | `/admin` | Admin panel |

## Performance Tips

- Items are stored in JSON format (suitable for up to ~10,000 items)
- For larger scale, upgrade to MongoDB
- Sessions are stored in memory (restart clears sessions)
- For production, add a proper session store

## Next Steps

1. **Customize Branding**
   - Edit `styles.css` for colors/design
   - Change content in `.ejs` view files

2. **Add Features**
   - SMS notifications
   - Email alerts
   - Image verification
   - Advanced analytics

3. **Deploy to Production**
   - Use Vercel, Heroku, or AWS
   - Update database to MongoDB
   - Set strong `SESSION_SECRET`
   - Enable HTTPS

## License

MIT License - Feel free to use and modify

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review error messages in the console
3. Check if `.env` file is configured correctly
4. Verify Node.js version is 18+

## Quick Start Summary

```bash
# 1. Clone/Download the repo
git clone https://github.com/your-username/LostAndFound-website.git
cd LostAndFound-website-master

# 2. Install packages
npm install

# 3. Create .env file
cp .env.example .env

# 4. Start server
npm start

# 5. Open browser
# http://localhost:3000
```

Done! Your Lost2Found application is now running! 🎉

