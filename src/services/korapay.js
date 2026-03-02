import crypto from 'crypto';

const KORAPAY_SECRET = process.env.KORAPAY_SECRET_KEY;
const KORAPAY_PUBLIC = process.env.KORAPAY_PUBLIC_KEY;
const BASE_URL = 'https://api.korapay.com/merchant/api/v1';

async function korapayRequest(endpoint, method, body) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${KORAPAY_SECRET}`,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Korapay request attempt ${attempt + 1} failed:`, error.message);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error('Korapay API unreachable after 3 attempts');
}

// ───── Collections (for /buy) ─────

export async function initializeCharge(amount, customerName, customerEmail, reference) {
  const data = await korapayRequest('/charges/initialize', 'POST', {
    amount,
    currency: 'NGN',
    reference,
    notification_url: `${process.env.BOT_WEBHOOK_URL}/webhook/korapay`,
    customer: {
      name: customerName,
      email: customerEmail || `${reference}@sidicoin.com`,
    },
    merchant_bears_cost: false,
  });
  return data;
}

export async function createVirtualBankAccount(amount, customerName, reference) {
  const data = await korapayRequest('/charges/bank-transfer', 'POST', {
    amount,
    currency: 'NGN',
    reference,
    customer: {
      name: customerName,
    },
    notification_url: `${process.env.BOT_WEBHOOK_URL}/webhook/korapay`,
  });
  return data;
}

// ───── Payouts (for /sell) ─────

export async function verifyBankAccount(bankCode, accountNumber) {
  const data = await korapayRequest(
    `/misc/banks/resolve?bank=${bankCode}&account=${accountNumber}`,
    'GET'
  );
  return data;
}

export async function initiatePayout(amount, bankCode, accountNumber, accountName, reference) {
  const data = await korapayRequest('/transactions/disburse', 'POST', {
    amount,
    currency: 'NGN',
    reference,
    destination: {
      type: 'bank_account',
      amount,
      currency: 'NGN',
      bank_account: {
        bank: bankCode,
        account: accountNumber,
        account_name: accountName,
      },
    },
    customer: {
      name: accountName,
      email: `${reference}@sidicoin.com`,
    },
  });
  return data;
}

// ───── Bank List ─────

export async function getBankList() {
  const data = await korapayRequest('/misc/banks?countryCode=NG', 'GET');
  return data?.data || [];
}

// ───── Webhook Verification ─────

export function verifyWebhookSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha512', KORAPAY_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}

// ───── Popular Nigerian Banks ─────

export const POPULAR_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'First Bank', code: '011' },
  { name: 'GTBank', code: '058' },
  { name: 'Kuda', code: '50211' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'OPay', code: '999992' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'UBA', code: '033' },
  { name: 'Union Bank', code: '032' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Ecobank', code: '050' },
  { name: 'FCMB', code: '214' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Jaiz Bank', code: '301' },
];

export function findBank(query) {
  const q = query.toLowerCase().trim();
  return POPULAR_BANKS.find(
    (b) =>
      b.name.toLowerCase() === q ||
      b.name.toLowerCase().includes(q) ||
      b.code === q
  );
}
