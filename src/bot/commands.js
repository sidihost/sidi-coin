import {
  getUser,
  saveUser,
  updateUser,
  getUserByUsername,
  getTelegramIdByUsername,
  addTransaction,
  checkAndUpdateDailyLimit,
  addContact,
  incrementStat,
  getStats,
  getLeaderboard,
  getUserRank,
  updateLeaderboard,
  setPendingPayment,
} from '../services/redis.js';
import { createWallet } from '../services/ton.js';
import {
  createVirtualBankAccount,
  verifyBankAccount,
  initiatePayout,
  POPULAR_BANKS,
  findBank,
} from '../services/korapay.js';
import { getAIResponse } from '../services/groq.js';
import {
  sendMessage,
  editMessage,
  notifyReceived,
  notifyReferralJoined,
  notifyAdmin,
  getUserProfilePhotos,
} from '../services/notifications.js';
import {
  formatNumber,
  sidiToNaira,
  nairaToSidi,
  formatSidi,
  formatNaira,
  formatDate,
  formatTimeAgo,
  getGreeting,
  generateReference,
} from '../utils/formatting.js';
import {
  isValidUsername,
  cleanUsername,
  isValidAmount,
  parseAmount,
  detectAmountType,
  getDailyLimit,
  calculateFee,
  isValidBankAccount,
} from '../utils/validation.js';
import {
  welcomeKeyboard,
  onboardingStep2Keyboard,
  balanceKeyboard,
  confirmSendKeyboard,
  confirmBuyKeyboard,
  paidKeyboard,
  confirmSellKeyboard,
  historyFilterKeyboard,
  premiumKeyboard,
  settingsKeyboard,
  mainMenuKeyboard,
  leaderboardKeyboard,
  contactsKeyboard,
  bankListKeyboard,
  onboardingStep3Keyboard,
} from './keyboards.js';

const SIDI_PRICE = parseFloat(process.env.SIDI_PRICE_NGN || '25');
const WELCOME_BONUS = 80;
const REFERRAL_BONUS = 50;
const CHECKIN_FREE = 10;
const CHECKIN_PREMIUM = 25;
const STREAK_BONUS = 100;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /start
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleStart(chatId, from, text) {
  const telegramId = String(from.id);

  // Check if already registered
  const existing = await getUser(telegramId);
  if (existing) {
    const greeting = getGreeting(existing.full_name || from.first_name);
    const value = formatNumber(sidiToNaira(existing.sidi_balance));
    const msg =
      `\u2726 ${greeting}\n\n` +
      `\uD83D\uDC8E <b>${formatNumber(existing.sidi_balance)} SIDI</b>\n` +
      `\uD83D\uDCB5 \u20A6${value}\n\n` +
      `What would you like to do? \u2726`;
    return sendMessage(chatId, msg, mainMenuKeyboard());
  }

  // Require username
  if (!from.username) {
    return sendMessage(
      chatId,
      '\u2726 Please set a Telegram username first in your Telegram settings so people can send you SIDI \u2726'
    );
  }

  // Show loading
  const loadingMsg = await sendMessage(chatId, '\u26A1 Setting up your Sidicoin wallet...');

  // Create TON wallet
  const wallet = await createWallet();

  // Get profile photo
  const photoUrl = await getUserProfilePhotos(from.id);

  // Parse referral
  let referredBy = null;
  if (text && text.includes('ref_')) {
    const refCode = text.split('ref_')[1];
    if (refCode) referredBy = refCode;
  }

  // Create user
  const userData = {
    telegram_id: telegramId,
    username: from.username?.toLowerCase() || '',
    full_name: `${from.first_name || ''} ${from.last_name || ''}`.trim(),
    photo_url: photoUrl,
    wallet_address: wallet.address,
    private_key: wallet.encryptedPrivateKey,
    sidi_balance: WELCOME_BONUS,
    is_premium: false,
    premium_expiry: null,
    referral_code: telegramId,
    referred_by: referredBy,
    referral_count: 0,
    referral_earnings: 0,
    total_sent: 0,
    total_received: 0,
    total_bought_ngn: 0,
    total_sold_ngn: 0,
    daily_checkin_last: null,
    checkin_streak: 0,
    transactions: [],
    saved_contacts: [],
    bank_name: '',
    bank_code: '',
    bank_account: '',
    bank_account_name: '',
    daily_tx_total: 0,
    daily_tx_date: '',
    joined_date: Date.now(),
    is_banned: false,
    last_active: Date.now(),
    welcome_bonus_claimed: true,
    cashout_hold_until: Date.now() + 24 * 60 * 60 * 1000,
    pending_action: null,
    pending_data: null,
  };

  await saveUser(telegramId, userData);
  await incrementStat('total_users');
  await incrementStat('circulating_supply', WELCOME_BONUS);
  await updateLeaderboard(telegramId, WELCOME_BONUS);

  // Add welcome bonus transaction
  await addTransaction(telegramId, {
    type: 'bonus',
    amount: WELCOME_BONUS,
    description: 'Welcome Bonus',
    reference: generateReference(),
  });

  // Handle referral
  if (referredBy) {
    const referrer = await getUser(referredBy);
    if (referrer) {
      await updateUser(referredBy, {
        sidi_balance: referrer.sidi_balance + REFERRAL_BONUS,
        referral_count: (referrer.referral_count || 0) + 1,
        referral_earnings: (referrer.referral_earnings || 0) + REFERRAL_BONUS,
      });
      await updateLeaderboard(referredBy, referrer.sidi_balance + REFERRAL_BONUS);
      await addTransaction(referredBy, {
        type: 'referral_bonus',
        amount: REFERRAL_BONUS,
        description: `Referral: ${userData.full_name} joined`,
        reference: generateReference(),
      });
      await incrementStat('circulating_supply', REFERRAL_BONUS);
      await notifyReferralJoined(referredBy, userData.full_name, REFERRAL_BONUS);
    }
  }

  // Edit loading message to welcome
  const welcomeText =
    `\u2726 Welcome to Sidicoin, ${from.first_name}\n\n` +
    `Your wallet is ready. Your money moves instantly across Africa.\n\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDC8E Balance: <b>${WELCOME_BONUS} SIDI</b>\n` +
    `\uD83D\uDCB5 Value: <b>\u20A6${formatNumber(sidiToNaira(WELCOME_BONUS))}</b> (Welcome Bonus)\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n` +
    `Sidicoin lets you send money to anyone in Africa using just their Telegram username \u2014 instantly, for free.\n\n` +
    `Type /help to see everything you can do \u2726`;

  if (loadingMsg?.result?.message_id) {
    await editMessage(chatId, loadingMsg.result.message_id, welcomeText, welcomeKeyboard());
  } else {
    await sendMessage(chatId, welcomeText, welcomeKeyboard());
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /balance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleBalance(chatId, user) {
  const loadingMsg = await sendMessage(chatId, '\uD83D\uDCCA Fetching your wallet...');

  const nairaValue = formatNumber(sidiToNaira(user.sidi_balance));
  const limit = getDailyLimit(user.is_premium);
  const remaining = limit - (user.daily_tx_total || 0);
  const accountType = user.is_premium ? '\u2726 Premium' : 'Free';

  const text =
    `\u2726 Your Sidicoin Wallet\n\n` +
    `\uD83D\uDC64 @${user.username}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDC8E SIDI: <b>${formatNumber(user.sidi_balance)} SIDI</b>\n` +
    `\uD83D\uDCB5 Value: <b>\u20A6${nairaValue}</b>\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDCE4 Total Sent: ${formatNumber(user.total_sent)} SIDI\n` +
    `\uD83D\uDCE5 Total Received: ${formatNumber(user.total_received)} SIDI\n` +
    `\uD83C\uDFC6 Account: ${accountType}\n` +
    `\uD83D\uDCCA Daily Limit: ${formatNumber(Math.max(0, remaining))} SIDI left\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;

  if (loadingMsg?.result?.message_id) {
    await editMessage(chatId, loadingMsg.result.message_id, text, balanceKeyboard());
  } else {
    await sendMessage(chatId, text, balanceKeyboard());
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /send
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleSend(chatId, user, args) {
  // METHOD 1: Direct /send @username amount
  if (args && args.length >= 2) {
    const recipientUsername = cleanUsername(args[0]);
    const amount = parseAmount(args[1]);

    if (!recipientUsername || !amount) {
      return sendMessage(
        chatId,
        '\u2726 Invalid format. Use: /send @username amount\n\nExample: /send @john 500 \u2726',
        mainMenuKeyboard()
      );
    }

    return processSendConfirmation(chatId, user, recipientUsername, amount);
  }

  // METHOD 2: Check for saved contacts first
  if (user.saved_contacts && user.saved_contacts.length > 0) {
    const text = `\u2726 Send SIDI\n\nChoose a saved contact or send to someone new:`;
    return sendMessage(chatId, text, contactsKeyboard(user.saved_contacts));
  }

  // METHOD 3: Guided flow
  await updateUser(user.telegram_id, {
    pending_action: 'send_username',
    pending_data: {},
  });

  return sendMessage(
    chatId,
    '\u2726 Send SIDI\n\nWho do you want to send to?\nEnter their @username \u2726',
    { reply_markup: { inline_keyboard: [[{ text: '\u274C Cancel', callback_data: 'cancel_action' }]] } }
  );
}

export async function processSendConfirmation(chatId, user, recipientUsername, amount) {
  // Validate amount
  if (amount <= 0 || !isValidAmount(amount)) {
    return sendMessage(chatId, '\u2726 Please enter a valid amount \u2726', mainMenuKeyboard());
  }

  // Check balance
  if (amount > user.sidi_balance) {
    const shortfall = amount - user.sidi_balance;
    return sendMessage(
      chatId,
      `\u2726 Insufficient balance\n\nYou need ${formatNumber(shortfall)} more SIDI.\nBalance: ${formatNumber(user.sidi_balance)} SIDI \u2726`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '\uD83D\uDCB3 Buy SIDI', callback_data: 'cmd_buy' }, { text: '\uD83C\uDFE0 Home', callback_data: 'cmd_home' }],
          ],
        },
      }
    );
  }

  // Check daily limit
  const limitCheck = await checkAndUpdateDailyLimit(user.telegram_id, 0); // Dry check
  if (limitCheck.remaining < amount) {
    return sendMessage(
      chatId,
      `\u2726 Daily limit reached\n\nRemaining today: ${formatNumber(limitCheck.remaining)} SIDI\n\nUpgrade to Premium for 500,000 SIDI/day limit \u2726`,
      premiumKeyboard()
    );
  }

  // Find recipient
  const recipient = await getUserByUsername(recipientUsername);
  if (!recipient) {
    const botUsername = 'SidicoinBot'; // Replace with actual bot username
    const inviteLink = `https://t.me/${botUsername}?start=ref_${user.telegram_id}`;
    return sendMessage(
      chatId,
      `\u2726 @${recipientUsername} is not on Sidicoin yet.\n\nInvite them and earn <b>50 SIDI</b> when they join!\n\n${inviteLink} \u2726`,
      mainMenuKeyboard()
    );
  }

  // Large transfer warning
  const warningText = amount > 10000 ? '\n\n\u26A0\uFE0F This is a large transfer.' : '';

  const nairaValue = formatNumber(sidiToNaira(amount));

  const text =
    `\u2726 Transfer Summary\n\n` +
    `To: <b>@${recipientUsername}</b> \u2014 ${recipient.full_name}\n` +
    `Amount: <b>${formatNumber(amount)} SIDI</b>\n` +
    `Value: \u20A6${nairaValue}\n` +
    `Fee: Free \u2705\n` +
    `Speed: Instant \u26A1${warningText}\n\n` +
    `Confirm transfer?`;

  return sendMessage(chatId, text, confirmSendKeyboard(recipientUsername, amount));
}

export async function executeSend(chatId, user, recipientUsername, amount) {
  const loadingMsg = await sendMessage(chatId, '\uD83D\uDCE1 Processing your transfer...');

  const recipient = await getUserByUsername(recipientUsername);
  if (!recipient) {
    return editMessage(chatId, loadingMsg.result.message_id, '\u2726 Recipient not found \u2726', mainMenuKeyboard());
  }

  if (amount > user.sidi_balance) {
    return editMessage(chatId, loadingMsg.result.message_id, '\u2726 Insufficient balance \u2726', mainMenuKeyboard());
  }

  // Update daily limit
  const limitResult = await checkAndUpdateDailyLimit(user.telegram_id, amount);
  if (!limitResult.allowed) {
    return editMessage(chatId, loadingMsg.result.message_id, '\u2726 Daily limit exceeded \u2726', mainMenuKeyboard());
  }

  const reference = generateReference();

  // Debit sender
  const newSenderBalance = user.sidi_balance - amount;
  await updateUser(user.telegram_id, {
    sidi_balance: newSenderBalance,
    total_sent: (user.total_sent || 0) + amount,
    pending_action: null,
    pending_data: null,
  });
  await updateLeaderboard(user.telegram_id, newSenderBalance);

  // Credit recipient
  const newRecipientBalance = recipient.sidi_balance + amount;
  await updateUser(recipient.telegram_id, {
    sidi_balance: newRecipientBalance,
    total_received: (recipient.total_received || 0) + amount,
  });
  await updateLeaderboard(recipient.telegram_id, newRecipientBalance);

  // Record transactions
  const txData = {
    type: 'send',
    amount,
    to: recipientUsername,
    to_name: recipient.full_name,
    reference,
    description: `Sent to @${recipientUsername}`,
  };
  await addTransaction(user.telegram_id, txData);
  await addTransaction(recipient.telegram_id, {
    type: 'receive',
    amount,
    from: user.username,
    from_name: user.full_name,
    reference,
    description: `Received from @${user.username}`,
  });

  // Save contact
  await addContact(user.telegram_id, {
    username: recipientUsername,
    full_name: recipient.full_name,
    telegram_id: recipient.telegram_id,
  });

  await incrementStat('total_transactions');
  await incrementStat('today_transactions');

  // Check milestones
  const totalTx = (user.total_sent || 0) + amount;
  let milestone = '';
  if (user.total_sent === 0) {
    milestone = `\n\n\uD83C\uDF89 You just made your first Sidicoin transfer! Welcome to the future of African finance \u2726`;
  } else if (Math.floor((user.total_sent || 0) / 10) < Math.floor(totalTx / 10)) {
    milestone = `\n\n\uD83D\uDD25 ${Math.floor(totalTx)} transfers milestone! You are a true Sidicoin power user \u2726`;
  }

  // Receipt
  const nairaVal = formatNumber(sidiToNaira(amount));
  const receipt =
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\u2726 SIDICOIN RECEIPT\n\n` +
    `Type: Transfer\n` +
    `From: @${user.username}\n` +
    `To: @${recipientUsername} \u2014 ${recipient.full_name}\n` +
    `Amount: <b>${formatNumber(amount)} SIDI</b>\n` +
    `Value: \u20A6${nairaVal}\n` +
    `Fee: Free\n` +
    `Status: \u2705 Confirmed\n` +
    `Time: ${formatDate(Date.now())}\n` +
    `Ref: <code>${reference}</code>\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `sidicoin.com \u2726${milestone}`;

  if (loadingMsg?.result?.message_id) {
    await editMessage(chatId, loadingMsg.result.message_id, receipt, mainMenuKeyboard());
  }

  // Notify recipient
  await notifyReceived(
    recipient.telegram_id,
    formatNumber(amount),
    nairaVal,
    user.username,
    formatNumber(newRecipientBalance)
  );

  // Smart suggestion
  if (newSenderBalance < 100) {
    setTimeout(() => {
      sendMessage(
        chatId,
        `\u2726 Your balance is running low. Top up to keep sending! \u2726`,
        { reply_markup: { inline_keyboard: [[{ text: '\uD83D\uDCB3 Buy SIDI', callback_data: 'cmd_buy' }]] } }
      );
    }, 2000);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /buy
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleBuy(chatId, user) {
  await updateUser(user.telegram_id, {
    pending_action: 'buy_amount',
    pending_data: {},
  });

  return sendMessage(
    chatId,
    `\u2726 Buy SIDI\n\nHow much SIDI do you want to buy?\nYou can enter amount in SIDI or NGN.\n\nExamples:\n<code>1000</code> = 1,000 SIDI (\u20A6${formatNumber(1000 * SIDI_PRICE)})\n<code>25000 NGN</code> = ${formatNumber(nairaToSidi(25000))} SIDI \u2726`,
    { reply_markup: { inline_keyboard: [[{ text: '\u274C Cancel', callback_data: 'cancel_action' }]] } }
  );
}

export async function processBuyAmount(chatId, user, text) {
  const amountType = detectAmountType(text);
  const rawAmount = parseAmount(text);

  if (!rawAmount) {
    return sendMessage(chatId, '\u2726 Please enter a valid amount. Example: 1000 or 25000 NGN \u2726');
  }

  let sidiAmount, ngnAmount;
  if (amountType === 'ngn') {
    ngnAmount = rawAmount;
    sidiAmount = nairaToSidi(rawAmount);
  } else {
    sidiAmount = rawAmount;
    ngnAmount = sidiToNaira(rawAmount);
  }

  const fee = calculateFee(ngnAmount, user.is_premium, 'buy');
  const total = ngnAmount + fee;
  const feeRate = user.is_premium ? '0.8%' : '1.5%';
  const reference = generateReference();

  await updateUser(user.telegram_id, {
    pending_action: 'buy_confirm',
    pending_data: { sidi_amount: sidiAmount, ngn_amount: ngnAmount, fee, total, reference },
  });

  const text2 =
    `\u2726 Purchase Summary\n\n` +
    `You will receive: <b>${formatNumber(sidiAmount)} SIDI</b>\n` +
    `Cost: \u20A6${formatNumber(ngnAmount)}\n` +
    `Fee (${feeRate}): \u20A6${formatNumber(fee)}\n` +
    `Total to pay: <b>\u20A6${formatNumber(total)}</b>\n\n` +
    `Payment method: Bank Transfer`;

  return sendMessage(chatId, text2, confirmBuyKeyboard(reference));
}

export async function processBuyPayment(chatId, user, reference) {
  const loadingMsg = await sendMessage(chatId, '\uD83D\uDD04 Generating your payment details...');

  const pendingData = user.pending_data;
  if (!pendingData || !pendingData.total) {
    return editMessage(chatId, loadingMsg.result.message_id, '\u2726 Session expired. Please start again with /buy \u2726', mainMenuKeyboard());
  }

  try {
    // Store pending payment
    await setPendingPayment(reference, {
      telegram_id: user.telegram_id,
      chat_id: chatId,
      sidi_amount: pendingData.sidi_amount,
      ngn_amount: pendingData.ngn_amount,
      fee: pendingData.fee,
      total: pendingData.total,
      reference,
      type: 'buy',
      created: Date.now(),
    });

    // Try to create virtual bank account via Korapay
    let paymentText;
    try {
      const result = await createVirtualBankAccount(
        pendingData.total,
        user.full_name,
        reference
      );

      if (result?.data?.bank_account) {
        const bank = result.data.bank_account;
        paymentText =
          `\u2726 Make Your Payment\n\n` +
          `Bank: <b>${bank.bank_name || 'Provided Bank'}</b>\n` +
          `Account: <b><code>${bank.account_number}</code></b>\n` +
          `Account Name: <b>${bank.account_name || 'Sidicoin'}</b>\n` +
          `Amount: <b>\u20A6${formatNumber(pendingData.total)}</b>\n\n` +
          `\u23F0 Expires in 30 minutes\n\n` +
          `Send EXACTLY \u20A6${formatNumber(pendingData.total)} to avoid delays.\n` +
          `We will notify you once confirmed \u2726`;
      } else {
        // Fallback display
        paymentText =
          `\u2726 Make Your Payment\n\n` +
          `Amount: <b>\u20A6${formatNumber(pendingData.total)}</b>\n` +
          `Reference: <code>${reference}</code>\n\n` +
          `\u23F0 Expires in 30 minutes\n` +
          `We will notify you once confirmed \u2726`;
      }
    } catch {
      paymentText =
        `\u2726 Make Your Payment\n\n` +
        `Amount: <b>\u20A6${formatNumber(pendingData.total)}</b>\n` +
        `Reference: <code>${reference}</code>\n\n` +
        `\u23F0 Expires in 30 minutes\n` +
        `We will notify you once confirmed \u2726`;
    }

    await updateUser(user.telegram_id, {
      pending_action: 'buy_waiting',
      pending_data: { ...pendingData, reference },
    });

    if (loadingMsg?.result?.message_id) {
      await editMessage(chatId, loadingMsg.result.message_id, paymentText, paidKeyboard(reference));
    }
  } catch (error) {
    console.error('Buy payment error:', error.message);
    if (loadingMsg?.result?.message_id) {
      await editMessage(
        chatId,
        loadingMsg.result.message_id,
        '\u2726 Something went wrong generating payment details. Please try again \u2726',
        mainMenuKeyboard()
      );
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /sell
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleSell(chatId, user) {
  // Check cashout hold for new users
  if (user.cashout_hold_until && Date.now() < user.cashout_hold_until) {
    const hoursLeft = Math.ceil((user.cashout_hold_until - Date.now()) / (1000 * 60 * 60));
    return sendMessage(
      chatId,
      `\u2726 New Account Hold\n\nCashouts are available ${hoursLeft} hours after signup.\nThis is for your security \u2726`,
      mainMenuKeyboard()
    );
  }

  await updateUser(user.telegram_id, {
    pending_action: 'sell_amount',
    pending_data: {},
  });

  return sendMessage(
    chatId,
    `\u2726 Cash Out SIDI\n\nHow much SIDI do you want to cash out?\nYour balance: <b>${formatNumber(user.sidi_balance)} SIDI</b> (\u20A6${formatNumber(sidiToNaira(user.sidi_balance))}) \u2726`,
    { reply_markup: { inline_keyboard: [[{ text: '\u274C Cancel', callback_data: 'cancel_action' }]] } }
  );
}

export async function processSellAmount(chatId, user, text) {
  const amount = parseAmount(text);
  if (!amount || amount <= 0) {
    return sendMessage(chatId, '\u2726 Please enter a valid amount \u2726');
  }

  if (amount > user.sidi_balance) {
    return sendMessage(chatId, `\u2726 Insufficient balance. You have ${formatNumber(user.sidi_balance)} SIDI \u2726`);
  }

  const ngnAmount = sidiToNaira(amount);
  const fee = calculateFee(ngnAmount, user.is_premium, 'sell');
  const net = ngnAmount - fee;
  const feeRate = user.is_premium ? '0.8%' : '1.5%';

  await updateUser(user.telegram_id, {
    pending_action: 'sell_confirm',
    pending_data: { sidi_amount: amount, ngn_amount: ngnAmount, fee, net },
  });

  let text2 =
    `\u2726 Cashout Summary\n\n` +
    `Selling: <b>${formatNumber(amount)} SIDI</b>\n` +
    `You receive: \u20A6${formatNumber(ngnAmount)}\n` +
    `Fee (${feeRate}): \u20A6${formatNumber(fee)}\n` +
    `Net payout: <b>\u20A6${formatNumber(net)}</b>\n\n`;

  // If bank saved
  if (user.bank_account && user.bank_name) {
    text2 += `Sending to:\n<b>${user.bank_name}</b> \u2014 ${user.bank_account}\n${user.bank_account_name}\n\nIs this correct?`;
    return sendMessage(chatId, text2, confirmSellKeyboard());
  }

  // Ask for bank
  text2 += `Where should we send your money?\n\nSelect your bank:`;
  await updateUser(user.telegram_id, {
    pending_action: 'sell_bank',
    pending_data: { sidi_amount: amount, ngn_amount: ngnAmount, fee, net },
  });

  return sendMessage(chatId, text2, bankListKeyboard(POPULAR_BANKS.slice(0, 12)));
}

export async function processSellBank(chatId, user, bankCode) {
  const bank = POPULAR_BANKS.find((b) => b.code === bankCode);
  if (!bank) {
    return sendMessage(chatId, '\u2726 Bank not found. Please try again \u2726');
  }

  await updateUser(user.telegram_id, {
    pending_action: 'sell_account_number',
    pending_data: { ...user.pending_data, bank_name: bank.name, bank_code: bank.code },
  });

  return sendMessage(
    chatId,
    `\u2726 ${bank.name} selected.\n\nEnter your 10-digit account number: \u2726`,
    { reply_markup: { inline_keyboard: [[{ text: '\u274C Cancel', callback_data: 'cancel_action' }]] } }
  );
}

export async function processSellAccountNumber(chatId, user, accountNumber) {
  if (!isValidBankAccount(accountNumber)) {
    return sendMessage(chatId, '\u2726 Please enter a valid 10-digit account number \u2726');
  }

  const loadingMsg = await sendMessage(chatId, '\uD83C\uDFE6 Verifying account details...');

  try {
    const result = await verifyBankAccount(user.pending_data.bank_code, accountNumber);
    const accountName = result?.data?.account_name || 'Account Holder';

    await updateUser(user.telegram_id, {
      pending_action: 'sell_confirm',
      pending_data: {
        ...user.pending_data,
        bank_account: accountNumber,
        bank_account_name: accountName,
      },
      bank_name: user.pending_data.bank_name,
      bank_code: user.pending_data.bank_code,
      bank_account: accountNumber,
      bank_account_name: accountName,
    });

    const text =
      `\u2726 Account Verified\n\n` +
      `Bank: <b>${user.pending_data.bank_name}</b>\n` +
      `Account: ${accountNumber}\n` +
      `Name: <b>${accountName}</b>\n\n` +
      `Cashout: <b>${formatNumber(user.pending_data.sidi_amount)} SIDI</b>\n` +
      `You receive: <b>\u20A6${formatNumber(user.pending_data.net)}</b>\n\n` +
      `Confirm cashout?`;

    if (loadingMsg?.result?.message_id) {
      await editMessage(chatId, loadingMsg.result.message_id, text, confirmSellKeyboard());
    }
  } catch (error) {
    console.error('Bank verify error:', error.message);
    if (loadingMsg?.result?.message_id) {
      await editMessage(
        chatId,
        loadingMsg.result.message_id,
        '\u2726 Could not verify account. Please check the number and try again \u2726',
        mainMenuKeyboard()
      );
    }
  }
}

export async function executeSell(chatId, user) {
  const loadingMsg = await sendMessage(chatId, '\uD83D\uDCB8 Processing your cashout...');

  const data = user.pending_data;
  if (!data || !data.sidi_amount) {
    return editMessage(chatId, loadingMsg.result.message_id, '\u2726 Session expired. Please start again with /sell \u2726', mainMenuKeyboard());
  }

  // Re-check balance
  const freshUser = await getUser(user.telegram_id);
  if (data.sidi_amount > freshUser.sidi_balance) {
    return editMessage(chatId, loadingMsg.result.message_id, '\u2726 Insufficient balance \u2726', mainMenuKeyboard());
  }

  const reference = generateReference();
  const bankName = data.bank_name || freshUser.bank_name;
  const bankCode = data.bank_code || freshUser.bank_code;
  const bankAccount = data.bank_account || freshUser.bank_account;
  const bankAccountName = data.bank_account_name || freshUser.bank_account_name;

  try {
    // Debit user first
    const newBalance = freshUser.sidi_balance - data.sidi_amount;
    await updateUser(user.telegram_id, {
      sidi_balance: newBalance,
      total_sold_ngn: (freshUser.total_sold_ngn || 0) + data.net,
      pending_action: null,
      pending_data: null,
    });
    await updateLeaderboard(user.telegram_id, newBalance);

    // Record transaction
    await addTransaction(user.telegram_id, {
      type: 'sell',
      amount: data.sidi_amount,
      ngn_amount: data.net,
      bank: bankName,
      reference,
      description: `Cashout to ${bankName}`,
    });

    await incrementStat('total_transactions');
    await incrementStat('total_volume_ngn', Math.round(data.net));
    await incrementStat('total_fees_ngn', Math.round(data.fee));

    // Initiate payout via Korapay
    try {
      await initiatePayout(data.net, bankCode, bankAccount, bankAccountName, reference);
    } catch (payoutError) {
      console.error('Korapay payout error:', payoutError.message);
      await notifyAdmin(`\u26A0\uFE0F Payout failed: ${reference} - \u20A6${data.net} to ${bankName} ${bankAccount}`);
    }

    const text =
      `\u2726 Cashout Successful!\n\n` +
      `\u20A6${formatNumber(data.net)} sent to ${bankName}\n` +
      `Account: ${bankAccountName}\n` +
      `Reference: <code>${reference}</code>\n` +
      `Status: Processing \u26A1\n\n` +
      `Usually arrives within minutes \u2726`;

    if (loadingMsg?.result?.message_id) {
      await editMessage(chatId, loadingMsg.result.message_id, text, mainMenuKeyboard());
    }

    // Milestone check
    if ((freshUser.total_sold_ngn || 0) === 0) {
      setTimeout(() => {
        sendMessage(chatId, `\uD83D\uDCB0 First cashout done! That's your Sidicoin working for you \u2726`);
      }, 2000);
    }
  } catch (error) {
    console.error('Sell execution error:', error.message);
    if (loadingMsg?.result?.message_id) {
      await editMessage(
        chatId,
        loadingMsg.result.message_id,
        '\u2726 Something went wrong processing your cashout. Please try again or contact support \u2726',
        mainMenuKeyboard()
      );
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /history
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleHistory(chatId, user, filter = 'all') {
  const transactions = user.transactions || [];
  if (transactions.length === 0) {
    return sendMessage(chatId, '\u2726 No transactions yet. Start by sending or buying SIDI! \u2726', mainMenuKeyboard());
  }

  let filtered = transactions;
  if (filter === 'sent') filtered = transactions.filter((t) => t.type === 'send');
  else if (filter === 'received') filtered = transactions.filter((t) => t.type === 'receive');
  else if (filter === 'buysell') filtered = transactions.filter((t) => t.type === 'buy' || t.type === 'sell');

  const items = filtered.slice(0, 10);
  let text = `\u2726 Transaction History\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n`;

  for (const tx of items) {
    const icon = tx.type === 'send' ? '\uD83D\uDCE4' : tx.type === 'receive' ? '\uD83D\uDCE5' : tx.type === 'buy' ? '\uD83D\uDCB3' : tx.type === 'sell' ? '\uD83D\uDCB0' : '\uD83C\uDF81';
    const naira = formatNumber(sidiToNaira(tx.amount));
    text += `${icon} ${tx.description}\n   ${formatNumber(tx.amount)} SIDI (\u20A6${naira}) \u00B7 ${formatTimeAgo(tx.timestamp)}\n\n`;
  }

  text += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;

  return sendMessage(chatId, text, historyFilterKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /contacts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleContacts(chatId, user) {
  const contacts = user.saved_contacts || [];
  if (contacts.length === 0) {
    return sendMessage(
      chatId,
      '\u2726 No saved contacts yet.\n\nContacts are automatically saved when you send SIDI to someone \u2726',
      mainMenuKeyboard()
    );
  }

  let text = '\u2726 Saved Contacts\n\n';
  for (const c of contacts.slice(0, 10)) {
    text += `\uD83D\uDC64 ${c.full_name || 'Unknown'} (@${c.username})\n`;
    if (c.last_sent) text += `   Last sent: ${formatTimeAgo(c.last_sent)}\n`;
    text += '\n';
  }

  return sendMessage(chatId, text, contactsKeyboard(contacts));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /refer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleRefer(chatId, user) {
  const botUsername = 'SidicoinBot';
  const link = `https://t.me/${botUsername}?start=ref_${user.telegram_id}`;
  const earned = user.referral_earnings || 0;
  const earnedNaira = formatNumber(sidiToNaira(earned));

  const text =
    `\u2726 Refer and Earn\n\n` +
    `Your referral link:\n${link}\n\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83C\uDF81 Per signup: <b>+50 SIDI</b> (\u20A61,250)\n` +
    `\uD83D\uDCB0 Per purchase: <b>+10 SIDI</b> (\u20A6250)\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDC65 Referrals: ${user.referral_count || 0}\n` +
    `\uD83D\uDC8E Earned: ${formatNumber(earned)} SIDI (\u20A6${earnedNaira})\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;

  return sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDCCB Copy Link', url: link },
          { text: '\uD83D\uDCF2 Share', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join Sidicoin and get 80 SIDI free! Send money instantly across Africa.')}` },
        ],
      ],
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /checkin
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleCheckin(chatId, user) {
  const now = Date.now();
  const lastCheckin = user.daily_checkin_last || 0;
  const hoursSince = (now - lastCheckin) / (1000 * 60 * 60);

  if (hoursSince < 24) {
    const hoursLeft = Math.ceil(24 - hoursSince);
    return sendMessage(
      chatId,
      `\u2726 Already checked in today!\n\nCome back in ${hoursLeft} hours for your next reward \u2726`,
      mainMenuKeyboard()
    );
  }

  // Calculate streak
  let streak = user.checkin_streak || 0;
  if (hoursSince < 48) {
    streak += 1;
  } else {
    streak = 1;
  }

  const reward = user.is_premium ? CHECKIN_PREMIUM : CHECKIN_FREE;
  let bonus = 0;
  let bonusText = '';

  // 7 day streak bonus
  if (streak % 7 === 0) {
    bonus = STREAK_BONUS;
    bonusText = `\n\uD83D\uDD25 7-day streak! <b>+${STREAK_BONUS} SIDI</b> bonus added \u2726`;
  }

  const totalReward = reward + bonus;
  const newBalance = user.sidi_balance + totalReward;

  await updateUser(user.telegram_id, {
    sidi_balance: newBalance,
    daily_checkin_last: now,
    checkin_streak: streak,
  });
  await updateLeaderboard(user.telegram_id, newBalance);
  await incrementStat('circulating_supply', totalReward);

  await addTransaction(user.telegram_id, {
    type: 'checkin',
    amount: totalReward,
    description: `Daily check-in reward (Day ${streak})`,
    reference: generateReference(),
  });

  const text =
    `\u2726 Daily Reward Claimed!\n\n` +
    `<b>+${reward} SIDI</b> added to your wallet\n` +
    `\uD83D\uDD25 Streak: ${streak} days${bonusText}\n` +
    `New Balance: <b>${formatNumber(newBalance)} SIDI</b> \u2726`;

  return sendMessage(chatId, text, mainMenuKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /premium
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handlePremium(chatId, user) {
  if (user.is_premium) {
    const expiry = formatDate(user.premium_expiry);
    return sendMessage(
      chatId,
      `\u2726 You are a Premium member!\n\nExpires: ${expiry}\n\nAll Premium perks are active \u2726`,
      mainMenuKeyboard()
    );
  }

  const text =
    `\u2726 Sidicoin Premium\n\n` +
    `<b>FREE</b>          <b>PREMIUM \u2726</b>\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `50K/day       500K/day limit\n` +
    `1.5% fees     0.8% fees\n` +
    `10 SIDI/day   25 SIDI/day\n` +
    `No badge      \u2726 badge\n` +
    `No priority   Priority support\n\n` +
    `\u20A61,500 per month`;

  return sendMessage(chatId, text, premiumKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /leaderboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleLeaderboard(chatId, user) {
  const loadingMsg = await sendMessage(chatId, '\uD83D\uDCCA Loading leaderboard...');

  const entries = await getLeaderboard(5);
  const rank = await getUserRank(user.telegram_id);

  let text = '\u2726 Top Sidicoin Holders\n\n';
  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

  for (let i = 0; i < entries.length; i += 2) {
    const memberId = entries[i];
    const score = entries[i + 1];
    const pos = i / 2;
    const memberUser = await getUser(memberId);
    const name = memberUser ? `@${memberUser.username}` : `User ${memberId}`;
    const medal = medals[pos] || `${pos + 1}.`;
    text += `${medal} ${name} \u2014 <b>${formatNumber(score)} SIDI</b>\n`;
  }

  text +=
    `\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `Your Rank: #${rank || 'N/A'}\n` +
    `Your Balance: <b>${formatNumber(user.sidi_balance)} SIDI</b> \u2726`;

  if (loadingMsg?.result?.message_id) {
    await editMessage(chatId, loadingMsg.result.message_id, text, leaderboardKeyboard());
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /price
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handlePrice(chatId) {
  const loadingMsg = await sendMessage(chatId, '\uD83D\uDCC8 Fetching live data...');

  const stats = await getStats();
  const usdRate = (SIDI_PRICE / 1600).toFixed(6); // Approximate NGN/USD
  const marketCap = formatNumber(10000000000 * SIDI_PRICE);

  const text =
    `\u2726 Sidicoin Price\n\n` +
    `1 SIDI = <b>\u20A6${SIDI_PRICE}</b>\n` +
    `1 SIDI = <b>$${usdRate}</b>\n\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `Holders: ${formatNumber(stats.total_users)}\n` +
    `Market Cap: \u20A6${marketCap}\n` +
    `Volume Today: \u20A6${formatNumber(stats.today_volume_ngn || 0)}\n` +
    `Transactions: ${formatNumber(stats.total_transactions)}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `Blockchain: TON \u2726`;

  if (loadingMsg?.result?.message_id) {
    await editMessage(chatId, loadingMsg.result.message_id, text, mainMenuKeyboard());
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /stats
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleStats(chatId) {
  const stats = await getStats();
  const text =
    `\u2726 Sidicoin Statistics\n\n` +
    `Total Supply: 10,000,000,000 SIDI\n` +
    `Circulating: ${formatNumber(stats.circulating_supply)} SIDI\n` +
    `Holders: ${formatNumber(stats.total_users)}\n` +
    `Transactions Today: ${formatNumber(stats.today_transactions)}\n` +
    `Volume Today: \u20A6${formatNumber(stats.today_volume_ngn || 0)}\n` +
    `Total Fees Collected: \u20A6${formatNumber(stats.total_fees_ngn || 0)}\n\n` +
    `Blockchain: TON\n` +
    `Ticker: SIDI\n` +
    `Price: \u20A625 per SIDI \u2726`;

  return sendMessage(chatId, text, mainMenuKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleSettings(chatId, user) {
  const accountType = user.is_premium ? '\u2726 Premium' : 'Free';
  const memberSince = formatDate(user.joined_date);

  let bankInfo = 'Not set';
  if (user.bank_name && user.bank_account) {
    bankInfo = `${user.bank_name} \u2014 ${user.bank_account}\n${user.bank_account_name}`;
  }

  const text =
    `\u2726 Account Settings\n\n` +
    `\uD83D\uDC64 ${user.full_name} (@${user.username})\n` +
    `\uD83C\uDFC6 ${accountType} Account\n` +
    `\uD83D\uDCC5 Member since ${memberSince}\n\n` +
    `\uD83C\uDFE6 Saved Bank:\n${bankInfo}\n\n` +
    `Options:`;

  return sendMessage(chatId, text, settingsKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /help
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleHelp(chatId) {
  const text =
    `\u2726 Sidicoin Commands\n\n` +
    `\uD83D\uDCBC <b>WALLET</b>\n` +
    `/balance \u2014 Your balance\n` +
    `/history \u2014 Transactions\n` +
    `/contacts \u2014 Saved contacts\n\n` +
    `\uD83D\uDCE4 <b>TRANSFERS</b>\n` +
    `/send @username amount\n` +
    `/send \u2014 Guided flow\n\n` +
    `\uD83D\uDCB0 <b>MONEY</b>\n` +
    `/buy \u2014 Buy SIDI with bank transfer\n` +
    `/sell \u2014 Cash out to bank\n\n` +
    `\uD83C\uDF81 <b>EARN</b>\n` +
    `/refer \u2014 Earn from referrals\n` +
    `/checkin \u2014 Daily reward\n\n` +
    `\u2B50 <b>ACCOUNT</b>\n` +
    `/premium \u2014 Upgrade account\n` +
    `/settings \u2014 Account settings\n\n` +
    `\uD83D\uDCCA <b>MARKET</b>\n` +
    `/price \u2014 SIDI price\n` +
    `/stats \u2014 Statistics\n` +
    `/leaderboard \u2014 Top holders\n` +
    `/about \u2014 About Sidicoin\n\n` +
    `Zero fees on transfers \u2726`;

  return sendMessage(chatId, text, mainMenuKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /about
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleAbout(chatId) {
  const text =
    `\u2726 About Sidicoin\n\n` +
    `Sidicoin (SIDI) is a cryptocurrency built on TON blockchain with one mission \u2014 make financial transfers across Africa instant, free and accessible to everyone.\n\n` +
    `No bank account required.\nNo crypto knowledge needed.\nJust Telegram and a username.\n\n` +
    `Supply: 10,000,000,000 SIDI\n` +
    `Price: \u20A625 per SIDI\n` +
    `Blockchain: TON\n\n` +
    `Built for Africa. Going global \u2726\n\n` +
    `\uD83C\uDF10 <a href="https://sidicoin.com">sidicoin.com</a>`;

  return sendMessage(chatId, text, mainMenuKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /home
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleHome(chatId, user) {
  const nairaVal = formatNumber(sidiToNaira(user.sidi_balance));
  const greeting = getGreeting(user.full_name || 'there');

  const text =
    `\u2726 ${greeting}\n\n` +
    `\uD83D\uDC8E <b>${formatNumber(user.sidi_balance)} SIDI</b>\n` +
    `\uD83D\uDCB5 \u20A6${nairaVal}`;

  return sendMessage(chatId, text, mainMenuKeyboard());
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleAIChat(chatId, user, text) {
  const loadingMsg = await sendMessage(chatId, '\u2726 Sidi is thinking...');

  const reply = await getAIResponse(text, user.full_name || 'friend');

  if (loadingMsg?.result?.message_id) {
    await editMessage(chatId, loadingMsg.result.message_id, reply, mainMenuKeyboard());
  } else {
    await sendMessage(chatId, reply, mainMenuKeyboard());
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Onboarding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleOnboardingStep2(chatId) {
  const text =
    `\u2726 How Sidicoin Works\n\n` +
    `Send money to anyone in Africa using just their Telegram username.\n\n` +
    `Example: /send @john 5000\n\n` +
    `No bank transfer stress.\n` +
    `No long account numbers.\n` +
    `Just a username \u2726`;

  return sendMessage(chatId, text, onboardingStep2Keyboard());
}

export async function handleOnboardingStep3(chatId) {
  const text =
    `\u2726 Your First Step\n\n` +
    `Buy some SIDI to get started.\n` +
    `Or send your referral link to earn free SIDI first!`;

  return sendMessage(chatId, text, onboardingStep3Keyboard());
}
