// routes/accounts.js
const express = require('express');
const router = express.Router();
const { getAgreementOptions, getReceivedByOptions, fetchTransactions, appendToGoogleSheet, filterTransactionsByUsername } = require('../utils/generalfunctions');
const { GS_Accounts_transactions } = require('../utils/constants');
require('dotenv').config();
const { isAuthenticated } = require('../../middlewares/authMiddleware');

let cachedData = {
    receivedByOptions: [],
    agreementOptions: [],
    transactionsOptions:[],
    
};

// Background function to update Google Sheets data
async function updateGoogleSheetData() {
    
    try {
        const [receivedByOptions, agreementOptions, transactionsOptions] = await Promise.all([
            getReceivedByOptions(),
            getAgreementOptions(),
            fetchTransactions(),
        ]);
        // Update the cached data
        cachedData.receivedByOptions = receivedByOptions;
        cachedData.agreementOptions = agreementOptions;
        cachedData.transactionsOptions= transactionsOptions
        console.log('Google Sheets data updated successfully.');
    } catch (error) {
        console.error('Error updating Google Sheets data:', error);
    }
}



// Set an interval to update the data every hour (3600000 ms)
setInterval(updateGoogleSheetData, 3600000);

// Initial data load when the server starts
updateGoogleSheetData();

// Route to render the accounts page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const username = req.session.username;
        console.log("username : "+username);
        const transactions = filterTransactionsByUsername(cachedData.transactionsOptions,username);

        res.render('./accounts/accounts', {
            username,
            receivedByOptions: cachedData.receivedByOptions,
            agreementOptions: cachedData.agreementOptions,
            transactions,
        });
    } catch (error) {
        console.error('Error rendering accounts page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to render the enter transaction page
router.get('/enter-transaction', isAuthenticated, (req, res) => {
    try {
        const username = req.session.username;

        res.render('./accounts/enter-transaction', {
            username,
            receivedByOptions: cachedData.receivedByOptions,
            agreementOptions: cachedData.agreementOptions,
        });
    } catch (error) {
        console.error('Error rendering enter transaction page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route for submitting a transaction
router.post('/submit-transaction', isAuthenticated, async (req, res) => {
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
