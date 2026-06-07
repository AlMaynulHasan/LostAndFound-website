const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const itemModel = require('../models/item');
const messageModel = require('../models/message');
const mailer = require('../services/mailer');
const { getFeaturedItem } = require('../data/featured-items');
const cloudinary = require('../services/cloudinary');

const router = express.Router();

// Use Cloudinary storage if configured, otherwise fall back to local disk
let storage;
let getFilePath;

if (cloudinary.isConfigured) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: process.env.CLOUDINARY_FOLDER || 'lost2found',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
    },
  });
  getFilePath = (file) => file.path; // Cloudinary returns full URL
} else {
  // Use persistent disk on Render, local public/uploads otherwise
  const uploadDir = process.env.NODE_ENV === 'production' && require('fs').existsSync('/data')
    ? '/data/uploads'
    : path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });
  getFilePath = (file) => `/uploads/${file.filename}`; // Local relative path
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    if (filetypes.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
  },
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('info', 'Please log in to continue.');
    return res.redirect('/auth/login');
  }
  next();
}

function normalizeAnswer(value) {
  return (value || '').trim().toLowerCase();
}

function computeConfidenceScore({ proofProvided, itemDate, claimedDate, expectedAnswers, claimantAnswers }) {
  const totalQuestions = expectedAnswers.length;
  let correctAnswers = 0;
  const answerMatches = expectedAnswers.map((expected, index) => {
    const expectedValue = normalizeAnswer(expected);
    const claimantValue = normalizeAnswer(claimantAnswers[index]);
    if (!expectedValue || !claimantValue) return false;
    const matched =
      claimantValue === expectedValue ||
      claimantValue.includes(expectedValue) ||
      expectedValue.includes(claimantValue);
    if (matched) correctAnswers += 1;
    return matched;
  });

  let timelineMatch = false;
  if (itemDate && claimedDate) {
    const itemTime = new Date(itemDate).getTime();
    const claimedTime = new Date(claimedDate).getTime();
    if (!Number.isNaN(itemTime) && !Number.isNaN(claimedTime)) {
      const diffDays = Math.abs(itemTime - claimedTime) / (1000 * 60 * 60 * 24);
      timelineMatch = diffDays <= 1;
    }
  }

  const proofPoints = proofProvided ? 40 : 0;
  const answerPoints = totalQuestions
    ? Math.round((correctAnswers / totalQuestions) * 40)
    : 0;
  const timelinePoints = timelineMatch ? 20 : 0;
  const total = proofPoints + answerPoints + timelinePoints;

  return {
    total,
    proofPoints,
    answerPoints,
    timelinePoints,
    correctAnswers,
    totalQuestions,
    answerMatches,
    timelineMatch,
  };
}

router.get('/report', requireLogin, (req, res) => {
  const prefillType = req.query.type === 'found' ? 'found' : 'lost';
  res.render('report', { title: 'Post Item', prefillType });
});

router.post('/report', requireLogin, upload.single('photo'), async (req, res) => {
  const {
    type,
    name,
    description,
    location,
    locationDetails,
    dateLost,
    category,
    contactMethod,
    anonymous,
    returnInfo,
    returnBy,
    verifyQuestion1,
    verifyAnswer1,
    verifyQuestion2,
    verifyAnswer2,
    verifyQuestion3,
    verifyAnswer3,
  } = req.body;
  const photoPath = req.file ? getFilePath(req.file) : null;
  const verificationQuestions = [
    { question: (verifyQuestion1 || '').trim(), answer: (verifyAnswer1 || '').trim() },
    { question: (verifyQuestion2 || '').trim(), answer: (verifyAnswer2 || '').trim() },
    { question: (verifyQuestion3 || '').trim(), answer: (verifyAnswer3 || '').trim() },
  ].filter((entry) => entry.question && entry.answer);

  try {
    // Verification questions: required for 'lost', optional for 'found'
    if (type === 'lost' && verificationQuestions.length < 1) {
      req.flash('error', 'Please provide at least one verification question so claimants can prove ownership.');
      return res.redirect('/items/report?type=lost');
    }

    await itemModel.createItem({
      userId: req.session.user.id,
      ownerEmail: req.session.user.email,
      type,
      name,
      description,
      location,
      locationDetails: (locationDetails || '').trim(),
      dateLost,
      category,
      contactMethod,
      anonymous: anonymous === 'true',
      reportedByName: req.session.user.name,
      photoPath,
      returnInfo: (returnInfo || '').trim(),
      returnBy: (returnBy || '').trim(),
      verificationQuestions,
      status: 'reported',
    });

    req.flash('success', 'Item reported successfully.');
    const redirectUrl = type === 'found' ? '/items/found' : '/items/lost';
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[REPORT ERROR]', error);
    req.flash('error', 'Failed to report item. Please try again. Error: ' + error.message);
    res.redirect('/items/report');
  }
});

router.get('/search', async (req, res) => {
  const { q, category, location, type, status, sort, date } = req.query;
  const items = await itemModel.searchItems({
    query: q,
    category,
    location,
    type,
    status: status || 'reported',
    date,
    sort: sort || 'newest',
  });
  res.render('search', {
    title: 'Search Items',
    items,
    filters: { q, category, location, type, status: status || 'reported', sort: sort || 'newest', date },
  });
});

router.get('/lost', async (req, res) => {
  const { q, category, location, status, sort, date } = req.query;
  const items = await itemModel.searchItems({
    query: q,
    category,
    location,
    type: 'lost',
    status: status || 'reported',
    date,
    sort: sort || 'newest',
  });
  res.render('lost', {
    title: 'Lost Items',
    items,
    filters: { q, category, location, type: 'lost', status: status || 'reported', sort: sort || 'newest', date },
  });
});

router.get('/found', async (req, res) => {
  const { q, category, location, status, sort, date } = req.query;
  const items = await itemModel.searchItems({
    query: q,
    category,
    location,
    type: 'found',
    status: status || 'reported',
    date,
    sort: sort || 'newest',
  });
  res.render('found', {
    title: 'Found Items',
    items,
    filters: { q, category, location, type: 'found', status: status || 'reported', sort: sort || 'newest', date },
  });
});

router.get('/returned', async (req, res) => {
  const { q, category, location, type, sort, date } = req.query;
  const items = await itemModel.searchItems({
    query: q,
    category,
    location,
    type,
    status: 'resolved',
    date,
    sort: sort || 'newest',
  });
  res.render('returned', {
    title: 'Returned Items',
    items,
    filters: { q, category, location, type, status: 'resolved', sort: sort || 'newest', date },
  });
});

router.get('/featured/:slug', (req, res) => {
  const featured = getFeaturedItem(req.params.slug);
  if (!featured) return res.status(404).render('404', { title: 'Not Found' });

  const item = {
    id: `featured-${featured.slug}`,
    name: featured.name,
    type: featured.type,
    status: featured.status,
    category: featured.category,
    location: featured.location,
    dateLost: featured.dateLost,
    contactMethod: featured.contactMethod,
    anonymous: featured.anonymous,
    reportedByName: featured.reportedByName,
    description: featured.description,
    photoPath: featured.photoPath,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    userId: 0,
  };

  res.render('item', { title: featured.name, item, isOwner: false, matches: [] });
});

router.get('/:id/chat', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  if (!item.userId) {
    req.flash('error', 'Cannot chat with the reporter of this item.');
    return res.redirect(`/items/${item.id}`);
  }

  // Prevent user from chatting with themselves
  if (req.session.user && String(item.userId) === String(req.session.user.id)) {
    req.flash('info', 'You cannot chat with yourself.');
    return res.redirect(`/items/${item.id}`);
  }

  res.redirect(`/chat/${item.userId}`);
});

router.post('/:id/chat', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  if (!item.userId) {
    req.flash('error', 'Cannot chat with the reporter of this item.');
    return res.redirect(`/items/${item.id}`);
  }

  if (req.session.user && String(item.userId) === String(req.session.user.id)) {
    req.flash('info', 'You cannot chat with yourself.');
    return res.redirect(`/items/${item.id}`);
  }

  if (req.body.message) {
    await messageModel.createMessage({
      senderId: req.session.user.id,
      senderName: req.session.user.name,
      recipientId: item.userId,
      recipientName: item.reportedByName || 'User',
      content: req.body.message
    });
  }

  res.redirect(`/chat/${item.userId}`);
});

router.post('/:id/claim', requireLogin, upload.single('proof'), async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  if (req.session.user && String(item.userId) === String(req.session.user.id)) {
    req.flash('info', 'You cannot claim your own item.');
    return res.redirect(`/items/${item.id}`);
  }

  const description = (req.body.description || '').trim();
  const claimedDate = (req.body.claimedDate || '').trim();
  const answersRaw = req.body.answers || [];
  const claimantAnswers = Array.isArray(answersRaw) ? answersRaw.map((ans) => (ans || '').trim()) : [(answersRaw || '').trim()];
  const verificationQuestions = item.verificationQuestions || [];
  if (verificationQuestions.length) {
    const providedCount = claimantAnswers.filter((ans) => ans).length;
    if (providedCount < verificationQuestions.length) {
      req.flash('error', 'Please answer all verification questions.');
      return res.redirect(`/items/${item.id}`);
    }
  }
  const proofPath = req.file ? getFilePath(req.file) : null;
  // For lost items (claiming ownership), require description or proof
  // For found items, the claimant is the owner — answers alone may suffice
  if (item.type === 'lost' && !description && !proofPath && claimantAnswers.filter(Boolean).length === 0) {
    req.flash('error', 'Please provide answers, a description, or a proof photo to submit your claim.');
    return res.redirect(`/items/${item.id}`);
  }

  const expectedAnswers = verificationQuestions.map((entry) => entry.answer || '');
  const score = computeConfidenceScore({
    proofProvided: Boolean(proofPath),
    itemDate: item.dateLost,
    claimedDate,
    expectedAnswers,
    claimantAnswers,
  });

  await itemModel.addClaim(item.id, {
    id: Date.now().toString(),
    claimantId: req.session.user.id,
    claimantName: req.session.user.name,
    claimantEmail: req.session.user.email,
    description,
    claimedDate: claimedDate || null,
    proofPath,
    status: 'pending',
    answers: claimantAnswers,
    score,
    createdAt: new Date().toISOString(),
  });

  // Send email notification to item owner
  if (item.ownerEmail) {
    const dashboardLink = process.env.APP_URL ? `${process.env.APP_URL}/dashboard` : 'http://localhost:3000/dashboard';
    await mailer.sendClaimNotification(
      item.ownerEmail,
      item.name,
      req.session.user.name,
      dashboardLink
    );
  }

  req.flash('success', 'Claim request sent. The reporter will review it.');
  res.redirect(`/items/${item.id}`);
});

router.post('/:id/claim/:claimId/accept', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to update this claim.');
    return res.redirect('/dashboard');
  }

  const claim = await itemModel.updateClaimStatus(item.id, req.params.claimId, 'accepted');
  if (!claim) {
    req.flash('error', 'Claim not found.');
    return res.redirect('/dashboard');
  }

  const returnInfo = item.returnInfo || '(not specified)';
  const returnBy = item.returnBy || item.reportedByName || 'Reporter';
  const contactMethod = item.contactMethod || '(not specified)';
  const verificationCode = claim.verificationCode || 'N/A';

  await messageModel.createMessage({
    senderId: req.session.user.id,
    senderName: req.session.user.name,
    recipientId: claim.claimantId,
    recipientName: claim.claimantName,
    content: `Your claim for "${item.name}" was accepted. Return location: ${returnInfo}. Handled by: ${returnBy}. Contact: ${contactMethod}. Verification Code: ${verificationCode}. Please pick up the item within 72 hours.`,
  });

  await messageModel.createMessage({
    senderId: req.session.user.id,
    senderName: req.session.user.name,
    recipientId: item.userId,
    recipientName: item.reportedByName,
    content: `Claim accepted for "${item.name}" by ${claim.claimantName}. Verification Code: ${verificationCode}.`,
  });

  const { db } = require('../db');
  await db.read();
  const adminUsers = (db.data?.users || []).filter((u) => u.role === 'admin');
  for (const adminUser of adminUsers) {
    await messageModel.createMessage({
      senderId: req.session.user.id,
      senderName: req.session.user.name,
      recipientId: adminUser.id,
      recipientName: adminUser.name,
      content: `[ADMIN VERIFICATION] Item: "${item.name}" | Returning Person: ${claim.claimantName} | Owner: ${item.reportedByName} | Location: ${returnInfo} | Contact: ${contactMethod} | Verification Code: ${verificationCode}.`,
    });
  }

  if (claim.claimantEmail) {
    await mailer.sendClaimAcceptedNotification(claim.claimantEmail, item.name);
  }

  req.flash('success', 'Claim accepted. Verification code sent to all parties.');
  res.redirect('/dashboard');
});

router.post('/:id/claim/:claimId/deny', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to update this claim.');
    return res.redirect('/dashboard');
  }

  await itemModel.updateClaimStatus(item.id, req.params.claimId, 'denied');
  const claim = (item.claims || []).find((c) => String(c.id) === String(req.params.claimId));
  if (claim && claim.claimantEmail) {
    await mailer.sendClaimDeniedNotification(claim.claimantEmail, item.name);
  }
  req.flash('info', 'Claim denied.');
  res.redirect('/dashboard');
});

router.post('/:id/resolve', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to mark this item as returned.');
    return res.redirect(`/items/${item.id}`);
  }

  await itemModel.updateStatus(item.id, 'resolved');
  req.flash('success', 'Item marked as returned.');
  res.redirect('/dashboard');
});

router.post('/:id/return-admin', requireLogin, async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Admin access required.');
    return res.redirect('/dashboard');
  }

  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  await itemModel.updateItem(item.id, {
    returnAdminConfirmedAt: new Date().toISOString(),
    returnAdminConfirmedBy: req.session.user.id,
  });
  req.flash('success', 'Return confirmation recorded.');
  res.redirect(`/items/${item.id}`);
});

router.post('/:id/return-success', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to complete this return.');
    return res.redirect(`/items/${item.id}`);
  }

  await itemModel.updateStatus(item.id, 'resolved');
  req.flash('success', 'Item marked as successfully returned.');
  res.redirect('/dashboard');
});

router.post('/:id/claim/:claimId/return-request', requireLogin, async (req, res) => {
  const result = await itemModel.requestClaimReturn(req.params.id, req.params.claimId, req.session.user.id);
  if (!result.ok) {
    const message =
      result.reason === 'window_closed'
        ? 'Return window has closed (72 hours).'
        : 'Unable to request return.';
    req.flash('error', message);
    return res.redirect('/dashboard');
  }

  const { item, claim } = result;
  const dueDate = claim.returnDueAt ? new Date(claim.returnDueAt).toLocaleDateString() : 'within 5 days';
  const reporterId = item.userId;
  const reporterName = item.reportedByName || 'Reporter';
  const messageText = `Return requested for "${item.name}". Please collect the item back by ${dueDate}.`;
  await messageModel.createMessage({
    senderId: req.session.user.id,
    senderName: req.session.user.name,
    recipientId: reporterId,
    recipientName: reporterName,
    content: messageText,
  });

  req.flash('info', 'Return request sent. Please return the item within 5 days.');
  res.redirect('/dashboard');
});

router.post('/:id/claim/:claimId/return-confirm', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to confirm returns.');
    return res.redirect('/dashboard');
  }

  const result = await itemModel.confirmClaimReturn(req.params.id, req.params.claimId, req.session.user.id);
  if (!result.ok) {
    req.flash('error', 'Unable to confirm return.');
    return res.redirect('/dashboard');
  }

  const { claim } = result;
  const messageText = `Return confirmed for "${item.name}". Thanks for helping keep the community safe.`;
  await messageModel.createMessage({
    senderId: req.session.user.id,
    senderName: req.session.user.name,
    recipientId: claim.claimantId,
    recipientName: claim.claimantName,
    content: messageText,
  });

  req.flash('success', 'Return confirmed. Item reopened for new claims.');
  res.redirect('/dashboard');
});

router.get('/:id', async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });
  const isOwner = req.session.user && String(req.session.user.id) === String(item.userId);

  // Check if there's an accepted claim (for showing Mark as Returned)
  const claims = item.claims || [];
  const hasAcceptedClaim = claims.some(cl => cl.status === 'accepted');
  const hasPendingClaim = claims.some(cl => cl.status === 'pending');

  res.render('item', { 
    title: item.name, 
    item, 
    isOwner,
    hasAcceptedClaim,
    hasPendingClaim,
    currentUser: req.session.user || null,
    editMode: req.query.edit === 'true'
  });
});

router.post('/:id/status', requireLogin, async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to update this report.');
    return res.redirect(`/items/${item.id}`);
  }

  const { status } = req.body;
  const allowed = ['reported', 'resolved'];
  if (!allowed.includes(status)) {
    req.flash('error', 'Invalid status update.');
    return res.redirect(`/items/${item.id}`);
  }

  await itemModel.updateStatus(item.id, status);
  req.flash('success', 'Status updated successfully.');
  res.redirect(`/items/${item.id}`);
});

router.post('/:id/delete', requireLogin, async (req, res) => {
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isAdmin) {
    req.flash('error', 'Only admins can delete reports.');
    return res.redirect('/dashboard');
  }

  const success = await itemModel.deleteItem(req.params.id);
  if (!success) {
    req.flash('error', 'Report not found.');
    return res.redirect('/dashboard');
  }

  req.flash('success', 'Report deleted successfully.');
  res.redirect('/dashboard');
});

router.post('/:id/update', requireLogin, upload.single('photo'), async (req, res) => {
  const item = await itemModel.findById(req.params.id);
  if (!item) return res.status(404).render('404', { title: 'Not Found' });

  const isOwner = String(item.userId) === String(req.session.user.id);
  const isAdmin = req.session.user && req.session.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    req.flash('error', 'You do not have permission to update this report.');
    return res.redirect(`/items/${item.id}`);
  }

  const {
    type,
    name,
    description,
    location,
    dateLost,
    category,
    contactMethod,
    anonymous,
  } = req.body;

  const photoPath = req.file ? getFilePath(req.file) : item.photoPath;

  await itemModel.updateItem(req.params.id, {
    type,
    name,
    description,
    location,
    dateLost,
    category,
    contactMethod,
    anonymous: anonymous === 'true',
    photoPath,
  });

  req.flash('success', 'Item updated successfully.');
  res.redirect(`/items/${item.id}`);
});

module.exports = router;
