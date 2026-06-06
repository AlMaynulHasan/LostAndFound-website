require('dotenv').config();

const util = require('util');
// Prevent deprecated util.isArray warnings from older dependencies.
if (typeof util.isArray === 'function') {
  util.isArray = Array.isArray;
}

const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { init } = require('./db');
let SqliteStore = null;
let sqliteClient = null;
try {
  const { sqlite } = require('./db/sqlite');
  SqliteStore = require('better-sqlite3-session-store')(session);
  sqliteClient = sqlite;
} catch (e) {
  console.warn('[SESSION] SQLite session store unavailable, using MemoryStore:', e.message);
}
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const indexRoutes = require('./routes/index');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const messageModel = require('./models/message');
const itemModel = require('./models/item');
const { initCronJobs } = require('./services/cronJobs');

// Initialize cron jobs for auto-delete reminders
initCronJobs();

const app = express();
const PORT = process.env.PORT || 3000;
const isServerless = Boolean(process.env.VERCEL);
const isProductionLike =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.VERCEL_ENV === 'preview';

init().catch((err) => {
  console.error('Failed to initialize database', err);
  if (!isServerless) {
    process.exit(1);
  }
});

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(expressLayouts);

// Security middleware. Keep CSP compatible with the Bootstrap/Google assets used by EJS views.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:", "https:", "blob:"],
        "connect-src": ["'self'"],
      },
    },
  })
);

// Rate limiting middleware
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // stricter limit for auth routes
  message: 'Too many login/registration attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use(globalLimiter);

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    ...(SqliteStore && sqliteClient ? { store: new SqliteStore({ client: sqliteClient }) } : {}),
    secret: process.env.SESSION_SECRET || 'campus-lost-found-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 14,
      httpOnly: true,
      sameSite: 'lax',
      secure: isProductionLike,
    },
  })
);

// CSRF protection middleware

app.use(flash());

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.messages = req.flash();
  res.locals.currentPath = req.path;
  res.locals.unreadChatCount = 0;
  res.locals.claimDecisionCount = 0;
  res.locals.currentSection = (() => {
    if (req.path === '/') return 'home';
    if (req.path.startsWith('/items/search')) return 'feed';
    if (req.path.startsWith('/items/report')) return 'report';
    if (req.path.startsWith('/items/lost')) return 'lost';
    if (req.path.startsWith('/items/found')) return 'found';
    if (req.path.startsWith('/items/returned')) return 'returned';
    if (req.path.startsWith('/chat')) return 'chat';
    if (req.path.startsWith('/dashboard')) return 'dashboard';
    if (req.path.startsWith('/admin')) return 'admin';
    return '';
  })();

  if (req.session.user) {
    Promise.all([
      messageModel.getUnreadCount(req.session.user.id),
      itemModel.getClaimDecisionCountForClaimant(req.session.user.id),
    ])
      .then(([chatCount, claimCount]) => {
        res.locals.unreadChatCount = chatCount;
        res.locals.claimDecisionCount = claimCount;
        next();
      })
      .catch((err) => {
        console.error('Unread count error:', err);
        next();
      });
  } else {
    next();
  }
});

const shouldLogChat = process.env.NODE_ENV !== 'production';
// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// One-time admin setup route — only works if SETUP_TOKEN env var is set
app.get('/setup-admin', async (req, res) => {
  const setupToken = process.env.SETUP_TOKEN;
  if (!setupToken || req.query.token !== setupToken) {
    return res.status(403).send('Forbidden');
  }
  try {
    const { get, run } = require('./db/sqlite');
    const bcrypt = require('bcryptjs');
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Admin';
    const studentId = process.env.ADMIN_STUDENT_ID || 'ADMIN-0001';
    if (!email || !password) return res.send('ADMIN_EMAIL and ADMIN_PASSWORD env vars not set.');
    const hash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      run('UPDATE users SET passwordHash = ?, role = ?, name = ?, updatedAt = ? WHERE email = ?',
        [hash, 'admin', name, now, email.toLowerCase()]);
      return res.send(`Admin updated: ${email} — you can now login at /auth/login`);
    }
    const maxRow = get('SELECT MAX(CAST(id AS INTEGER)) AS m FROM users');
    const id = String((maxRow?.m || 0) + 1);
    run('INSERT INTO users (id, email, studentId, name, passwordHash, role, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
      [id, email.toLowerCase(), studentId, name, hash, 'admin', now, now]);
    res.send(`Admin created: ${email} — login at /auth/login with your ADMIN_PASSWORD`);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// Simple CSRF protection — generate token per session, validate on POST
const { randomBytes } = require('crypto');

app.use((req, res, next) => {
  // Generate token if session doesn't have one
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// Validate CSRF token on state-changing requests
// Skip multipart/form-data — multer parses body per-route, _csrf not available here
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) return next();
    const token = req.body._csrf || req.headers['x-csrf-token'] || '';
    const sessionToken = req.session.csrfToken || '';
    if (!token || !sessionToken || token !== sessionToken) {
      return res.status(403).render('403', {
        title: 'Forbidden',
        message: 'Invalid or missing CSRF token. Please go back and try again.'
      });
    }
  }
  next();
});

// Apply stricter rate limiting to auth routes
app.use('/auth/register', authLimiter);
app.use('/auth/login', authLimiter);

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/chat', chatRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('403', { title: 'Server Error', message: err.message });
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

function startServer(startPort, maxAttempts = 10) {
  let port = startPort;
  const maxPort = startPort + maxAttempts;

  const tryListen = () => {
    const listener = app.listen(port, () => {
      console.log(`Lost2Found running at http://localhost:${port}`);
    });

    listener.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && port < maxPort) {
        console.warn(`Port ${port} is in use. Trying ${port + 1}...`);
        port += 1;
        setTimeout(tryListen, 200);
      } else {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  };

  tryListen();
}

if (!isServerless && require.main === module) {
  startServer(PORT);
}

module.exports = app;
