// routes/accounts.js
const express = require('express');
const router = express.Router();
const { getAgreementOptions, getReceivedByOptions, fetchTransactions, appendToGoogleSheet } = require('../utils/generalfunctions');
const { google } = require('googleapis');
const { GS_Accounts_transactions } = require('../utils/constants');
require('dotenv').config();
const { isAuthenticated } = require('../../middlewares/authMiddleware'); // Ensure this path is correct

// Helper function to fetch data from Google Sheets
async function fetchGoogleSheetData() {
    try {
        const receivedByOptions = await getReceivedByOptions();
        const agreementOptions = await getAgreementOptions();
        return { receivedByOptions, agreementOptions };
    } catch (error) {
        console.error('Error fetching Google Sheet data:', error);
        return { receivedByOptions: [], agreementOptions: [] }; // Return empty arrays on error
    }
}

// GET route to render the accounts page
router.get('/', isAuthenticated, async (req, res) => {
    try {
      const username = req.session.username; // Retrieve the username
      const googleSheetData = await Promise.all([getReceivedByOptions(), getAgreementOptions(), fetchTransactions()]); // Fetch options from Google Sheets and transactions
      res.render('accounts', {
        username,
        receivedByOptions: googleSheetData[0].receivedByOptions,
        agreementOptions: googleSheetData[1].agreementOptions,
        transactions: googleSheetData[2] // Pass transactions to the view
      });
    } catch (error) {
      console.error('Error rendering accounts page:', error);
      res.status(500).send('Internal Server Error');
    }
  });

// Route for rendering the enter transaction page
router.get('/enter-transaction', async (req, res) => {
    try {
        const username = req.session.username || 'defaultUser';
        const googleSheetData = await fetchGoogleSheetData();
        res.render('enter-transaction', {
            username,
            receivedByOptions: googleSheetData.receivedByOptions,
            agreementOptions: googleSheetData.agreementOptions
        });
    } catch (error) {
        console.error('Error rendering enter transaction page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route for submitting the transaction
router.post('/submit-transaction', async (req, res) => {
    const transactionData = {
        timestamp: new Date().toISOString(),
        transaction_date: req.body.transaction_date,
        transaction_type: req.body.transaction_type,
        given_by: Array.isArray(req.body.given_by) ? req.body.given_by[0] : req.body.given_by,
        received_by: Array.isArray(req.body.received_by) ? req.body.received_by[0] : req.body.received_by,
        agreement_id: req.body.agreement_id,
        amount: req.body.amount,
        remarks: req.body.remarks,
        tax_bill: req.body.tax_bill,
        username: req.session.username,
    };

    const values = [
        [
            transactionData.timestamp,
            transactionData.transaction_date,
            transactionData.transaction_type,
            transactionData.given_by,
            transactionData.received_by,
            transactionData.amount,
            transactionData.remarks,
            transactionData.agreement_id,
            transactionData.tax_bill,
            transactionData.username,
        ],
    ];

    try {
        await appendToGoogleSheet(GS_Accounts_transactions.gs_Id, 'INOUT_TRANSACTIONS!A:J', values);
        res.json({ success: true, message: 'Transaction submitted successfully!' });
    } catch (error) {
        console.error('Error submitting transaction:', error);
        res.status(500).json({ success: false, message: 'Failed to submit transaction.' });
    }
});


module.exports = router;
