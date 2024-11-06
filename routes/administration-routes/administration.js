// routes/administration-routes/administration.js
const express = require('express');
const attendanceRoutes = require('./mark-attendance'); // Import the attendance routes
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
  res.render('./administration/administration', { title:'Administration',username });
});

// Use the attendance routes
router.use('/mark-attendance', attendanceRoutes); // Ensure this is after the attendanceRoutes import

// Export the router
module.exports = router;
