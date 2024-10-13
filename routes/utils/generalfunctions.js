// routes/generalfunctions.js
const { google } = require('googleapis');
const {GS_Accounts_transactions, GS_Attendance}=require('../utils/constants');

// Function to fetch agreement options
async function getAgreementOptions() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = GS_Accounts_transactions.gs_Id;
  const range = GS_Accounts_transactions.sheet_Lists+'!D7:D'; 
  console.log("\n spreadsheetId :"+spreadsheetId+"\n");
  console.log("\n sheet_Lists :"+range+"\n");
  console.log("\n Range :"+range+"\n");

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
  // Logic to save attendance, e.g., writing to a Google Sheet or database
  try {
    // Example: Save to Google Sheets
    const auth = new google.auth.GoogleAuth({
      keyFile: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = GS_Attendance.gs_Id;  // Replace with your actual sheet ID
    const range = GS_Attendance.sheet_AttendanceWithLocation+'!A:D';  // Adjust range based on your sheet structure

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

// Export functions
module.exports = {
  getAgreementOptions,
  saveAttendance
  // Add other functions as needed
};
