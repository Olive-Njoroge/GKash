// server/services/payheroService.js
const axios = require('axios');

const env = process.env;
const PAYHERO_BASE_URL = 'https://backend.payhero.co.ke/api/v2';
const PAYHERO_CHANNEL_ID = env.PAYHERO_CHANNEL_ID;
const PAYHERO_WITHDRAW_CHANNEL_ID = env.PAYHERO_WITHDRAW_CHANNEL_ID || env.PAYHERO_CHANNEL_ID;
const PAYHERO_CALLBACK_URL =
  env.PAYHERO_CALLBACK_URL || 'https://gkash.onrender.com/api/transactions/webhook';

const basicAuthHeader =
  'Basic ' + Buffer.from(`${env.PAYHERO_USERNAME}:${env.PAYHERO_PASSWORD}`).toString('base64');

const payheroClient = axios.create({
  baseURL: PAYHERO_BASE_URL,
  headers: {
    Authorization: basicAuthHeader,
    'Content-Type': 'application/json',
  },
});

function normalizePhone(phone) {
  const cleaned = String(phone).replace(/\s+/g, '');
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  return cleaned;
}

async function initiateStkPush({ phoneNumber, amount, reference, description }) {
  try {
    const payload = {
      amount: Number(amount),
      phone_number: normalizePhone(phoneNumber),
      channel_id: Number(PAYHERO_CHANNEL_ID),
      external_reference: reference,
      callback_url: PAYHERO_CALLBACK_URL,
      provider: 'm-pesa',
      description: description || 'Deposit via M-Pesa STK Push',
    };

    console.log('[Payhero] STK Push request:', payload);
    const response = await payheroClient.post('/payments', payload);

    // Log the FULL response so we can see exactly what reference fields Payhero returns
    console.log('[Payhero] STK Push full response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('[Payhero] STK Push Error:', error.response?.data || error.message);
    throw error.response ? error.response.data : error;
  }
}

async function withdrawToMpesa({ phoneNumber, amount, reference, description }) {
  try {
    const payload = {
      amount: Number(amount),
      phone_number: normalizePhone(phoneNumber),
      network_code: '63902',
      external_reference: reference,
      callback_url: PAYHERO_CALLBACK_URL,
      channel: 'mobile',
      channel_id: Number(PAYHERO_WITHDRAW_CHANNEL_ID),
      description: description || 'Withdrawal to M-Pesa',
    };

    console.log('[Payhero] Withdrawal request:', payload);
    const response = await payheroClient.post('/withdraw', payload);

    // Log the FULL response so we can see exactly what reference fields Payhero returns
    console.log('[Payhero] Withdrawal full response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('[Payhero] Withdrawal Error:', error.response?.data || error.message);
    throw error.response ? error.response.data : error;
  }
}

async function checkPaymentStatus(checkoutRequestId) {
  try {
    const response = await payheroClient.get('/transaction-status', {
      params: { checkout_request_id: checkoutRequestId },
    });
    return response.data;
  } catch (error) {
    console.error('[Payhero] Status Check Error:', error.response?.data || error.message);
    throw error.response ? error.response.data : error;
  }
}

module.exports = { initiateStkPush, withdrawToMpesa, checkPaymentStatus };