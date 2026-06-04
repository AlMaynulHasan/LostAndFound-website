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
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');

const { init } = require('./db');
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

// Security middleware
app.use(helmet());

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
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

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

// Make CSRF token available to views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
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

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // CSRF token errors should result in a 403 Forbidden
    res.status(403).render('403', { title: 'Forbidden', message: 'Invalid CSRF token' });
  } else {
    next(err);
  }
}
app.use('/items', itemRoutes);
app.use('/chat', chatRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);

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
