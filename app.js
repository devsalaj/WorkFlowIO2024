const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const session = require('express-session');

// Load routes
const attendanceRoutes = require('./routes/administration-routes/attendance'); // Updated path
const administrationRoutes = require('./routes/administration-routes/administration'); // Updated path
const accountsRoutes = require('./routes/accounts-routes/accounts'); // Load accounts routes
const { getAgreementOptions, getReceivedByOptions,validateCredentials } = require('./routes/utils/generalfunctions'); // Load functions

// Set up session middleware
app.use(session({
  secret: 'slj123', // A secret key for signing the session ID
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 30 // Default maxAge for non "Keep me logged in" (30 minutes)
  }
}));

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount the routes
app.use('/attendance', attendanceRoutes);
app.use('/administration', administrationRoutes);
app.use('/accounts', accountsRoutes); // This will handle routes prefixed with /accounts

// Middleware function to check if the user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.username) {
    return next();
  } else {
    return res.redirect('/login');
  }
}

// GET route to render the login page
app.get('/login', (req, res) => {
  res.render('login', { errorMessage: null });
});

// POST route to handle login form submission
app.post('/login', async (req, res) => {
  const { username, password, keepLoggedIn } = req.body;

  const isValid = await validateCredentials(username, password);

  if (isValid) {
    req.session.username = username; 
    if (keepLoggedIn) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; 
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 30; 
    }
    res.redirect('/dashboard');
  } else {
    res.render('login', { errorMessage: 'Invalid username or password' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/dashboard');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  const username = req.session.username;
  res.render('dashboard', { username });
});

const { google } = require('googleapis');
const sheets = google.sheets('v4');
const fs = require('fs');



async function authorize() {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await auth.authorize();
  return auth;
}

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

module.exports = app;
