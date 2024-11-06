// routes/administration-routes/attendance.js
const express = require('express');
const router = express.Router();
const { getAgreementOptions } = require('../utils/generalfunctions'); // Adjust path as needed
const { saveAttendance } = require('../utils/generalfunctions'); // Function to save attendance

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.username) {
    return next();
  }
  return res.redirect('/login');
}

// GET route to render attendance marking form
router.get('/', isAuthenticated, async (req, res) => {
  const username = req.session.username;

  // Fetch agreement options from Google Sheets or another source
  const agreementOptions = await getAgreementOptions();

  // Render the attendance marking page with the fetched options
  res.render('administration/mark-attendance', { title: 'Mark Attendance',username, agreementOptions });
});

/// POST route to handle attendance submission
router.post('/', isAuthenticated, async (req, res) => {
  const { agreement_id, location, current_time } = req.body;

  // Save attendance information (with or without location)
  try {
    await saveAttendance(req.session.username, agreement_id, location || 'Not available', current_time);
    res.redirect('/administration');
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).send('Error marking attendance');
  }
});


module.exports = router;
