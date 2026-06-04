const express = require('express');
const router = express.Router();
const userModel = require('../models/user');

// Student ID format validation
// Format: VVVYYSHHDDDDROOLL (16 digits total)
// VVV = University code (080)
// YY = Admission year (last 2 digits, e.g., 24 for 2024)
// S = Semester (1=winter, 2=summer)
// HH = Hall code (01-99)
// DDDD = Department code (e.g., 0510)
// RRRR = Roll number (e.g., 1025)
function validateStudentId(studentId) {
  if (!studentId) return false;
  
  // Remove any non-digit characters
  const cleaned = studentId.replace(/\D/g, '');
  
  // Must be exactly 16 digits
  if (cleaned.length !== 16) return false;
  
  // First 3 digits should be 080 (university code)
  if (!cleaned.startsWith('080')) return false;
  
  // Year should be reasonable (00-99)
  const year = parseInt(cleaned.substring(3, 5));
  if (year < 0 || year > 99) return false;
  
  // Semester should be 1 or 2
  const semester = parseInt(cleaned.charAt(5));
  if (semester !== 1 && semester !== 2) return false;
  
  // Hall code should be 01-99
  const hall = parseInt(cleaned.substring(6, 8));
  if (hall < 1 || hall > 99) return false;
  
  return true;
}

router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
  const { name, email, studentId, password, confirmPassword } = req.body;
  if (!name || !email || !studentId || !password || password !== confirmPassword) {
    req.flash('error', 'Please provide all required fields and ensure passwords match.');
    return res.redirect('/auth/register');
  }

  // Validate student ID format
  if (!validateStudentId(studentId)) {
    req.flash('error', 'Invalid student ID format. Format should be 16 digits (e.g., 0802420205101025).');
    return res.redirect('/auth/register');
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    req.flash('error', 'Email is already registered.');
    return res.redirect('/auth/register');
  }

  try {
    const user = await userModel.createUser({ name, email, studentId, password });
    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role || 'user' };
    req.flash('success', 'Welcome! Your account has been created.');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Unable to create account. Please try again.');
    res.redirect('/auth/register');
  }
});

router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findByEmail(email);
  if (!user) {
    req.flash('error', 'Invalid email or password');
    return res.redirect('/auth/login');
  }

  const ok = await userModel.verifyPassword(user, password);
  if (!ok) {
    req.flash('error', 'Invalid email or password');
    return res.redirect('/auth/login');
  }

  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role || 'user' };
  req.flash('success', 'Logged in successfully');
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
