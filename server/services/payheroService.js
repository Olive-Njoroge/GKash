// server/services/payheroService.js
// Service to handle Payhero STK push integration

const axios = require('axios');

const env = process.env;
const PAYHERO_BASE_URL = 'https://backend.payhero.co.ke/api/v2';
const PAYHERO_CHANNEL_ID = env.PAYHERO_CHANNEL_ID || '6652';
const PAYHERO_CALLBACK_URL = env.PAYHERO_CALLBACK_URL || 'http://localhost:3000/api/payments/callback';

// Always generate Basic Auth header from username and password
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
  const cleaned = String(phone).replace(/\s+/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  return cleaned;
}

/**
 * Initiate an STK Push via Payhero
 * @param {Object} params - { phoneNumber, amount, reference, description }
 * @returns {Promise<Object>} Payhero API response
 */
async function initiateStkPush({ phoneNumber, amount, reference, description }) {
  try {
    console.log('[Payhero] Initiating STK Push:', {
      amount: Number(amount),
      phone_number: normalizePhone(phoneNumber),
      channel_id: Number(PAYHERO_CHANNEL_ID),
      external_reference: reference || `Deposit_${Date.now()}`,
      callback_url: PAYHERO_CALLBACK_URL,
      description: description || 'Deposit via Payhero STK Push',
    });
    const response = await payheroClient.post('/payments', {
      amount: Number(amount),
      phone_number: normalizePhone(phoneNumber),
      channel_id: Number(PAYHERO_CHANNEL_ID),
      external_reference: reference || `Deposit_${Date.now()}`,
      callback_url: PAYHERO_CALLBACK_URL,
      description: description || 'Deposit via Payhero STK Push',
      provider: 'MPESA',
    });
    console.log('[Payhero] STK Push Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('[Payhero] Error Response:', error.response.data);
    } else {
      console.error('[Payhero] Error:', error.message);
    }
    throw error.response ? error.response.data : error;
  }
}

/**
 * Check payment status via Payhero
 * @param {string} checkoutRequestId - The checkout_request_id from the STK Push response
 * @returns {Promise<Object>} Payhero API response
 */
async function checkPaymentStatus(checkoutRequestId) {
  try {
    console.log('[Payhero] Checking payment status for:', checkoutRequestId);
    const response = await payheroClient.get(
      `/transaction-status?checkout_request_id=${checkoutRequestId}`
    );
    console.log('[Payhero] Payment Status Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('[Payhero] Status Check Error Response:', error.response.data);
    } else {
      console.error('[Payhero] Status Check Error:', error.message);
    }
    throw error.response ? error.response.data : error;
  }
}

module.exports = {
  initiateStkPush,
  checkPaymentStatus,
};