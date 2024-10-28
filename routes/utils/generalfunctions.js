const { google } = require('googleapis');
require('dotenv').config(); // Load environment variables
const { GS_Accounts_transactions, GS_Attendance, GS_AdministrationsEntry } = require('../utils/constants');

// Function to fetch agreement options
async function getAgreementOptions() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix the private key format
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = GS_Accounts_transactions.gs_Id;
  const range = GS_Accounts_transactions.sheet_Lists + '!D7:D';
  console.log("\n spreadsheetId :" + spreadsheetId + "\n");
  console.log("\n sheet_Lists :" + range + "\n");
  console.log("\n Range :" + range + "\n");

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (rows.length) {
      return rows.map(row => ({
        name: row[0],
        id: row[1] || row[0],
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
// Function to get received by options from Google Sheets
async function getReceivedByOptions() {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

  // Create a JWT client with the credentials from the environment variables
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines in the private key
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = GS_Accounts_transactions.gs_Id;
  const range = 'Lists!B7:B'; // Adjust the range to your structure

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (rows.length) {
      return rows.map(row => ({
        name: row[0],
        id: row[1] || row[0],
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
async function saveAttendance(username, agreement_id, location, current_time) {
  try {
    // Example: Save to Google Sheets
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix the private key format
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = GS_Attendance.gs_Id;  // Replace with your actual sheet ID
    const range = GS_Attendance.sheet_AttendanceWithLocation + '!A:D';  // Adjust range based on your sheet structure

    const values = [[username, agreement_id, location, current_time]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: { values },
    });

    console.log('Attendance marked successfully');
  } catch (error) {
    console.error('Error saving attendance to Google Sheets:', error);
    throw error;  // Re-throw error to handle it in attendance.js
  }
}

async function appendToGoogleSheet(sheetId, range, values) {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: { values },
    });
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    throw new Error('Failed to append data to Google Sheets.');
  }
}

// Function to validate credentials against Google Sheets
async function validateCredentials(username, password) {
  try {
    const auth = await authorizeGoogleAPI(); // A separate authorization function

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = GS_AdministrationsEntry.gs_Id;  // Your Google Sheets ID
    const range = GS_AdministrationsEntry.sheet_UN_PW + '!A:B';  // Usernames and passwords are in columns A and B

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (rows.length) {
      for (const row of rows) {
        const [sheetUsername, sheetPassword] = row;
        if (sheetUsername === username && sheetPassword === password) {
          return true;  // Credentials are valid
        }
      }
    }

    return false;  // Invalid credentials
  } catch (error) {
    console.error('Error validating credentials:', error);
    return false;
  }
}


// Function to authorize Google API using JWT
async function authorizeGoogleAPI() {
  try {
    const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines in private key
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    await auth.authorize();
    return auth;
  } catch (error) {
    console.error('Error authorizing Google API:', error);
    throw error; // Rethrow the error to be handled by calling functions
  }
}

async function fetchTransactions() {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = GS_Accounts_transactions.gs_Id; // Your spreadsheet ID
    const range = 'INOUT_TRANSACTIONS!A:J'; // Adjust based on your sheet structure

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;

    if (rows.length) {
      return rows.map(row => ({
        date: row[0],
        type: row[1],
        amount: row[5],
        party: row[3], // Assuming 'given_by' or 'received_by' based on your schema
        agreement_id: row[7],
        tax_bill: row[8],
        remarks: row[6],
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error; // Re-throw error to handle it in the calling function
  }
}

// Export functions
module.exports = {
  authorizeGoogleAPI,
  getAgreementOptions,
  getReceivedByOptions,
  validateCredentials,
  saveAttendance,
  appendToGoogleSheet,
  fetchTransactions
  // Add other functions as needed
};
