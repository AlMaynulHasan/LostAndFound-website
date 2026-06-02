const express = require('express');
const adminModel = require('../models/admin');
const itemModel = require('../models/item');

const router = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('info', 'Please log in to continue.');
    return res.redirect('/auth/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Admin access required.');
    return res.redirect('/dashboard');
  }
  next();
}

router.get('/', requireLogin, requireAdmin, async (req, res) => {
  try {
    const overview = await adminModel.getAdminOverview();
    const recentReports = await adminModel.getRecentReports(8);
    const recentUsers = await adminModel.getRecentUsers(6);
    const recentClaims = await adminModel.getRecentClaims(10);
    const pendingClaims = await adminModel.getPendingClaims(8);
    const multiClaimItems = await adminModel.getItemsWithMultipleClaims(6);

    res.render('admin', {
      title: 'Admin Dashboard',
      overview,
      recentReports,
      recentUsers,
      recentClaims,
      pendingClaims,
      multiClaimItems,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    req.flash('error', 'Unable to load admin dashboard.');
    res.redirect('/dashboard');
  }
});

router.post('/item/:itemId/claim/:claimId/mark-returned', requireLogin, requireAdmin, async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const item = await itemModel.findById(req.params.itemId);
    
    if (!item) {
      return res.status(404).json({ ok: false, message: 'Item not found' });
    }

    const claim = (item.claims || []).find((c) => String(c.id) === String(req.params.claimId));
    if (!claim) {
      return res.status(404).json({ ok: false, message: 'Claim not found' });
    }

    // Verify the verification code
    if (claim.verificationCode !== verificationCode) {
      return res.status(400).json({ ok: false, message: 'Invalid verification code' });
    }

    // Mark item as returned
    const result = await itemModel.markItemReturned(req.params.itemId, req.params.claimId);
    
    if (result) {
      req.flash('success', `Item "${item.name}" has been marked as returned and moved to Returned Items.`);
      res.json({ ok: true, message: 'Item marked as returned successfully' });
    } else {
      res.status(400).json({ ok: false, message: 'Failed to mark item as returned' });
    }
  } catch (err) {
    console.error('Error marking item as returned:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
