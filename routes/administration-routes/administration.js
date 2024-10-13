// routes/administration-routes/administration.js
const express = require('express');
const attendanceRoutes = require('./attendance'); // Import the attendance routes
const router = express.Router();

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.username) {
    return next();
  }
  return res.redirect('/login');
}

// GET route for the administration page
router.get('/', isAuthenticated, (req, res) => {
  const username = req.session.username || 'DefaultUser'; // Default username if not found
  res.render('administration', { username });
});

// Redirect to the attendance marking page
router.get('/mark-attendance', isAuthenticated, (req, res) => {
  res.redirect('/attendance/mark-attendance'); // Redirect to the attendance marking page
});

// Use the attendance routes
router.use('/attendance', attendanceRoutes); // Ensure this is after the attendanceRoutes import

// Export the router
module.exports = router;
