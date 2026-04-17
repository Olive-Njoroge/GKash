// Script to recalculate and fix all account balances based on completed transactions
// Place this file in your server directory and run with: node fixBalances.js

const mongoose = require('mongoose');
const Account = require('./models/accounts');
const Transaction = require('./models/transactions');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI; // <-- Change this to your DB name

async function fixAllBalances() {
  await mongoose.connect(MONGO_URI);
  const accounts = await Account.find();
  let fixedCount = 0;

  for (const account of accounts) {
    // Sum completed deposits
    const deposits = await Transaction.aggregate([
      { $match: { account_id: account._id, transaction_type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const depositTotal = deposits[0]?.total || 0;

    // Sum completed withdrawals
    const withdrawals = await Transaction.aggregate([
      { $match: { account_id: account._id, transaction_type: 'withdraw', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const withdrawalTotal = withdrawals[0]?.total || 0;

    const newBalance = depositTotal - withdrawalTotal;
    account.account_balance = newBalance;
    await account.save();
    fixedCount++;
    console.log(`Account ${account._id}: balance set to ${newBalance}`);
  }

  console.log(`\nFixed balances for ${fixedCount} accounts.`);
  await mongoose.disconnect();
}

fixAllBalances().catch(err => {
  console.error('Error fixing balances:', err);
  process.exit(1);
});
