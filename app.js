const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const attendanceRoutes = require('./routes/administration-routes/attendance'); // Updated path
const administrationRoutes = require('./routes/administration-routes/administration'); // Updated path
const {GS_AdministrationsEntry}=require('./routes/utils/constants');
const gs_SheetID = GS_AdministrationsEntry.gs_Id;
var globalUserName;
// Set up session middleware
app.use(session({
  secret: 'slj123', // A secret key for signing the session ID
  resave: false,             // Don't resave the session if it wasn't modified
  saveUninitialized: true,   // Save new sessions that are not modified
  cookie: {
    secure: false,           // Set to `true` if using HTTPS
    maxAge: 1000 * 60 * 30   // Default maxAge for non "Keep me logged in" (30 minutes)
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
app.use('/attendance', attendanceRoutes); // This will handle routes prefixed with /attendance
app.use('/administration', administrationRoutes); // This will handle routes prefixed with /administration

// Middleware function to check if the user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.username) { // If the session contains a username, proceed
    return next();
  } else {
    return res.redirect('/login'); // Otherwise, redirect to login page
  }
}
// GET route to render the login page
app.get('/login', (req, res) => {
  res.render('login', { errorMessage: null }); // Renders the login page with no error message
});



// POST route to handle login form submission
app.post('/login', async (req, res) => {
  const { username, password, keepLoggedIn } = req.body;  // Capture keepLoggedIn checkbox

  // Call the function to validate the credentials
  const isValid = await validateCredentials(username, password);

  if (isValid) {
    req.session.username = username; // Store username in session

    // If "Keep me logged in" is checked, set session cookie maxAge to a longer duration (e.g., 7 days)
    if (keepLoggedIn) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
    } else {
      req.session.cookie.maxAge = 1000 * 60 * 30; // Default: 30 minutes
    }

    res.redirect('/dashboard'); // Redirect to the dashboard if login is successful
  } else {
    res.render('login', { errorMessage: 'Invalid username or password' }); // Show error message
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/dashboard'); // If error, stay on dashboard
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.redirect('/login'); // Redirect to login page after logging out
  });
});

// Sample data for user stats (you would fetch this from Google Sheets or another source)
app.get('/dashboard', isAuthenticated, (req, res) => {
  const username = req.session.username;  // This would be dynamic, fetched from the session or database

  res.render('dashboard', {
    username
  });
});


const { google } = require('googleapis');
const sheets = google.sheets('v4');
const fs = require('fs');

// Load the Google Sheets API credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));

// Authorize the client with the service account credentials
async function authorize() {
  const { client_email, private_key } = credentials;
  const auth = new google.auth.JWT(
    client_email,
    null,
    private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await auth.authorize();
  return auth;
}

// Function to validate credentials against Google Sheets
async function validateCredentials(username, password) {
  const auth = await authorize();

  // ID of the Google Sheet (replace with your actual sheet ID)
  const spreadsheetId = gs_SheetID;

  // Range of the sheet where usernames and passwords are stored
  const range = GS_AdministrationsEntry.sheet_UN_PW+'!A:B';  // Assuming usernames are in column A, passwords in column B

  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
  });

  const rows = response.data.values;

  if (rows.length) {
    // Check if the provided username and password match any entry in the sheet
    for (const row of rows) {
      const [sheetUsername, sheetPassword] = row;
      if (sheetUsername === username && sheetPassword === password) {
        return true;  // Credentials are valid
      }
    }
  }

  return false;  // Invalid credentials
}

// Array to store dummy transactions (you can replace this with your Google Sheets data)
let transactions = [];

// GET route to render the Accounts page
app.get('/accounts', isAuthenticated, (req, res) => {
  res.render('accounts', { transactions });
});

// POST route to handle new transactions
app.post('/accounts/transaction', isAuthenticated, (req, res) => {
  const { description, amount, date } = req.body;

  // Add the new transaction to the transactions array
  transactions.push({
    description: description,
    amount: parseFloat(amount).toFixed(2),
    date: date
  });

  // Redirect back to the accounts page after submission
  res.redirect('/accounts');
});

// Assuming you have a function to fetch data from Google Sheets
async function fetchGoogleSheetData() {
  // Fetch receivedBy options and agreement data from Google Sheets
  const receivedByOptions = await getReceivedByOptions(); // Example function to fetch "Received by" data
  const agreementOptions = await getAgreementOptions(); // Example function to fetch "Agreement" data

  return { receivedByOptions, agreementOptions };
}

app.get('/accounts', isAuthenticated, async (req, res) => {
  const googleSheetData = await fetchGoogleSheetData();
  res.render('accounts', {
    username: req.session.username,
    receivedByOptions: googleSheetData.receivedByOptions,
    agreementOptions: googleSheetData.agreementOptions,
  });
});


// Route for rendering the enter transaction page
app.get('/accounts/enter-transaction', isAuthenticated, async (req, res) => {
  const username =req.session.username || 'defaultUser'; // Retrieve the username
  const googleSheetData = await fetchGoogleSheetData(); // Fetch options from Google Sheets
  console.log(username);
  res.render('enter-transaction', {
    username, // Pass username to the view
    receivedByOptions: googleSheetData.receivedByOptions,
    agreementOptions: googleSheetData.agreementOptions
  });
});

// Route for submitting the transaction
app.post('/accounts/submit-transaction', isAuthenticated, async (req, res) => {
  console.log("Received transaction data:", req.body); // Log incoming data
  const transactionData = {
    timestamp: new Date().toISOString(), // Add the current timestamp
    transaction_date: req.body.transaction_date,
    transaction_type: req.body.transaction_type,    
    given_by: Array.isArray(req.body.given_by) ? req.body.given_by[0] : req.body.given_by, // Handle single value
    received_by: Array.isArray(req.body.received_by) ? req.body.received_by[0] : req.body.received_by, // Handle single value
    agreement_id: req.body.agreement_id,
    amount: req.body.amount,
    remarks: req.body.remarks,
    tax_bill: req.body.tax_bill,
    username: req.session.username
  };
  console.log("transaction data : \n"+ transactionData);

  try {
    // Authorize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json', // Path to your service account key file
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = gs_SheetID; // Your Google Sheets ID
    const range = 'INOUT_TRANSACTIONS!A:J'; // Adjust range to include the timestamp

    // Prepare the transaction data as an array, with timestamp as the first value
    const values = [
      [
        transactionData.timestamp, // Add the timestamp as the first value
        transactionData.transaction_date,
        transactionData.transaction_type,       
        transactionData.given_by,
        transactionData.received_by,        
        transactionData.amount,
        transactionData.remarks,
        transactionData.agreement_id,        
        transactionData.tax_bill,
        transactionData.username
      ]
    ];

    console.log(values);

    // Append the transaction data to the Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values
      }
    }); 

    // Send success response
    res.json({ success: true, message: 'Transaction submitted successfully!' });
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    res.status(500).json({ success: false, message: 'Failed to submit transaction.' });
  }
});



// Function to get received by options from Google Sheets
async function getReceivedByOptions() {
  const auth = new google.auth.GoogleAuth({
    // Your credentials and required scopes
    keyFile: 'credentials.json', // Path to your service account key file
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Adjust scopes as necessary
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = gs_SheetID; // Your Google Sheets ID
  const range = 'Lists!B7:B'; // Adjust the range to where the "Received By" names are located

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    // Transform rows into an array of objects or any format you need
    if (rows.length) {
      return rows.map(row => ({
        name: row[0], // Assuming the name is in the first column
        id: row[1] || row[0] // Assuming there is an ID in the second column (optional)
      }));
    } else {
      console.log('No data found.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    return [];
  }
}

async function getAgreementOptions() {
  const auth = new google.auth.GoogleAuth({
    // Your credentials and required scopes
    keyFile: 'credentials.json', // Path to your service account key file
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Adjust scopes as necessary
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = gs_SheetID; // Your Google Sheets ID
  const range = 'Lists!D7:D'; // Adjust the range to where the "Received By" names are located

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    // Transform rows into an array of objects or any format you need
    if (rows.length) {
      return rows.map(row => ({
        name: row[0], // Assuming the name is in the first column
        id: row[1] || row[0] // Assuming there is an ID in the second column (optional)
      }));
    } else {
      console.log('No data found.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    return [];
  }
}


// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

module.exports = {
  getAgreementOptions,
  // ... other exports
};
