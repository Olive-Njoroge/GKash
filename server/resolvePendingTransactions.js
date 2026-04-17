// Script to resolve all pending transactions by checking PayHero status and updating balances
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Transaction = require('./models/transactions');
const Account = require('./models/accounts');

const MONGO_URI = process.env.MONGO_URI;
const PAYHERO_BASE_URL = 'https://backend.payhero.co.ke/api/v2';

const getAuthHeader = () => {
  const credentials = `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

async function checkPayHeroStatus(reference) {
  try {
    const response = await axios.get(
      `${PAYHERO_BASE_URL}/transaction-status?checkout_request_id=${reference}`,
      { headers: { Authorization: getAuthHeader() } }
    );
    return response.data;
  } catch (error) {
    console.error('PayHero status check failed:', error.response?.data || error.message);
    return null;
  }
}

async function resolveAllPendingTransactions() {
  await mongoose.connect(MONGO_URI);
  const pendingTxs = await Transaction.find({ status: 'pending', payhero_reference: { $ne: null } });
  let updated = 0;

  for (const tx of pendingTxs) {
    const statusResult = await checkPayHeroStatus(tx.payhero_reference);
    if (!statusResult) continue;
    const resultCode = statusResult?.ResultCode ?? statusResult?.result_code;
    if (resultCode === 0) {
      // Success: mark as completed and update account balance
      tx.status = 'completed';
      await tx.save();
      const account = await Account.findById(tx.account_id);
      if (account) {
        if (tx.transaction_type === 'deposit') {
          account.account_balance += tx.amount;
        } else if (tx.transaction_type === 'withdraw') {
          account.account_balance -= tx.amount;
        }
        await account.save();
      }
      updated++;
      console.log(`Transaction ${tx._id} marked completed and balance updated.`);
    } else if (resultCode !== undefined && resultCode !== null) {
      // Failed or declined
      tx.status = 'failed';
      await tx.save();
      console.log(`Transaction ${tx._id} marked failed.`);
    } else {
      // Still pending or unknown
      console.log(`Transaction ${tx._id} still pending.`);
    }
  }
  await mongoose.disconnect();
  console.log(`\nResolved and updated ${updated} transactions.`);
}

resolveAllPendingTransactions().catch(err => {
  console.error('Error resolving transactions:', err);
  process.exit(1);
});
