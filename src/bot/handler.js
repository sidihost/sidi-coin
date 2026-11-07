import { getUser, updateUser } from '../services/db.js';
import { sendMessage, answerCallbackQuery } from '../services/notifications.js';
import { ensureRegistered, ensureUsername, ensureNotBanned, ensureRateLimit, isAdmin } from './middleware.js';
import { cleanUsername, parseAmount } from '../utils/validation.js';
import { mainMenuKeyboard } from './keyboards.js';
import {
  handleStart,
  handleBalance,
  handleSend,
  processSendConfirmation,
  executeSend,
  handleBuy,
  processBuyAmount,
  processBuyPayment,
  handleSell,
  processSellAmount,
  processSellBank,
  processSellAccountNumber,
  executeSell,
  handleHistory,
  handleContacts,
  handleRefer,
  handleCheckin,
  handlePremium,
  handleLeaderboard,
  handlePrice,
  handleStats,
  handleSettings,
  handleHelp,
  handleAbout,
  handleHome,
  handleAIChat,
  handleOnboardingStep2,
  handleOnboardingStep3,
} from './commands.js';
import { handleAdminCommand } from './admin.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Update Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleUpdate(update) {
  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    console.error('Update handler error:', error.message, error.stack);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Message Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleMessage(message) {
  const chatId = message.chat.id;
  const from = message.from;
  const text = (message.text || '').trim();
  const telegramId = String(from.id);

  if (!text) return;

  // ── /start is special — handles registration ──
  if (text.startsWith('/start')) {
    const payload = text.split(' ')[1] || '';
    return handleStart(chatId, from, payload);
  }

  // ── Admin commands ──
  if (text.startsWith('/admin') && isAdmin(telegramId)) {
    return handleAdminCommand(chatId, text, telegramId);
  }

  // ── All other commands require registration ──
  const user = await ensureRegistered(chatId, telegramId);
  if (!user) return;

  if (!(await ensureNotBanned(chatId, user))) return;

  // Update last active
  await updateUser(telegramId, { last_active: Date.now() });

  // ── Check if user has a pending action (multi-step flow) ──
  if (user.pending_action && !text.startsWith('/')) {
    return handlePendingAction(chatId, user, text);
  }

  // ── Command routing ──
  const command = text.split(' ')[0].toLowerCase().split('@')[0];
  const args = text.split(' ').slice(1);

  switch (command) {
    case '/balance':
    case '/wallet':
      return handleBalance(chatId, user);

    case '/send':
    case '/transfer':
      return handleSend(chatId, user, args);

    case '/buy':
      return handleBuy(chatId, user);

    case '/sell':
    case '/cashout':
    case '/withdraw':
      return handleSell(chatId, user);

    case '/history':
    case '/transactions':
      return handleHistory(chatId, user);

    case '/contacts':
      return handleContacts(chatId, user);

    case '/refer':
    case '/referral':
      return handleRefer(chatId, user);

    case '/checkin':
    case '/daily':
      return handleCheckin(chatId, user);

    case '/premium':
    case '/upgrade':
      return handlePremium(chatId, user);

    case '/leaderboard':
    case '/top':
      return handleLeaderboard(chatId, user);

    case '/price':
      return handlePrice(chatId);

    case '/stats':
      return handleStats(chatId);

    case '/settings':
      return handleSettings(chatId, user);

    case '/help':
      return handleHelp(chatId);

    case '/about':
      return handleAbout(chatId);

    case '/home':
      return handleHome(chatId, user);

    default:
      // If the message starts with /, it's an unknown command
      if (text.startsWith('/')) {
        return sendMessage(
          chatId,
          '\u2726 Unknown command. Type /help to see all available commands \u2726',
          mainMenuKeyboard()
        );
      }
      // Otherwise, use AI chat
      if (!(await ensureRateLimit(chatId, telegramId))) return;
      return handleAIChat(chatId, user, text);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pending Action Handler (multi-step flows)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handlePendingAction(chatId, user, text) {
  const action = user.pending_action;

  switch (action) {
    case 'send_username': {
      const username = cleanUsername(text);
      if (!username) {
        return sendMessage(chatId, '\u2726 Please enter a valid @username \u2726');
      }
      await updateUser(user.telegram_id, {
        pending_action: 'send_amount',
        pending_data: { recipient: username },
      });
      return sendMessage(
        chatId,
        `\u2726 Sending to @${username}\n\nHow much SIDI do you want to send? \u2726`,
        { reply_markup: { inline_keyboard: [[{ text: '\u274C Cancel', callback_data: 'cancel_action' }]] } }
      );
    }

    case 'send_amount': {
      const amount = parseAmount(text);
      if (!amount) {
        return sendMessage(chatId, '\u2726 Please enter a valid amount. Example: 500 \u2726');
      }
      // Clear pending and show confirmation
      const recipient = user.pending_data?.recipient;
      return processSendConfirmation(chatId, user, recipient, amount);
    }

    case 'buy_amount':
      return processBuyAmount(chatId, user, text);

    case 'sell_amount':
      return processSellAmount(chatId, user, text);

    case 'sell_account_number':
      return processSellAccountNumber(chatId, user, text.trim());

    case 'sell_bank_name': {
      // User typed bank name manually
      const { findBank: findBankFn } = await import('../services/korapay.js');
      const bank = findBankFn(text);
      if (!bank) {
        return sendMessage(chatId, '\u2726 Bank not found. Please try again with a known bank name \u2726');
      }
      return processSellBank(chatId, user, bank.code);
    }

    case 'update_bank_name': {
      const { findBank: findBankFn2 } = await import('../services/korapay.js');
      const bank = findBankFn2(text);
      if (!bank) {
        return sendMessage(chatId, '\u2726 Bank not found. Please try again \u2726');
      }
      await updateUser(user.telegram_id, {
        pending_action: 'update_bank_account',
        pending_data: { bank_name: bank.name, bank_code: bank.code },
      });
      return sendMessage(chatId, `\u2726 ${bank.name} selected.\n\nEnter your 10-digit account number: \u2726`);
    }

    case 'update_bank_account':
      return processSellAccountNumber(chatId, user, text.trim());

    default:
      // Unknown pending action, clear and use AI
      await updateUser(user.telegram_id, { pending_action: null, pending_data: null });
      return handleAIChat(chatId, user, text);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callback Query Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const telegramId = String(query.from.id);
  const data = query.data;

  await answerCallbackQuery(query.id);

  const user = await getUser(telegramId);
  if (!user) {
    return sendMessage(chatId, '\u2726 Please type /start to get started \u2726');
  }

  // ── Command callbacks ──
  if (data === 'cmd_balance') return handleBalance(chatId, user);
  if (data === 'cmd_send') return handleSend(chatId, user);
  if (data === 'cmd_send_new') {
    await updateUser(telegramId, { pending_action: 'send_username', pending_data: {} });
    return sendMessage(chatId, '\u2726 Who do you want to send to?\nEnter their @username \u2726');
  }
  if (data === 'cmd_buy') return handleBuy(chatId, user);
  if (data === 'cmd_sell') return handleSell(chatId, user);
  if (data === 'cmd_history') return handleHistory(chatId, user);
  if (data === 'cmd_refer') return handleRefer(chatId, user);
  if (data === 'cmd_settings') return handleSettings(chatId, user);
  if (data === 'cmd_help') return handleHelp(chatId);
  if (data === 'cmd_home') return handleHome(chatId, user);
  if (data === 'cmd_premium') return handlePremium(chatId, user);

  // ── Onboarding ──
  if (data === 'onboard_step2') return handleOnboardingStep2(chatId);
  if (data === 'onboard_step3') return handleOnboardingStep3(chatId);

  // ── Send confirmation ──
  if (data.startsWith('confirm_send_')) {
    const parts = data.replace('confirm_send_', '').split('_');
    const amount = parseFloat(parts.pop());
    const recipientUsername = parts.join('_');
    // Refresh user data for latest balance
    const freshUser = await getUser(telegramId);
    return executeSend(chatId, freshUser, recipientUsername, amount);
  }

  // ── Quick send to contact ──
  if (data.startsWith('quick_send_')) {
    const username = data.replace('quick_send_', '');
    await updateUser(telegramId, {
      pending_action: 'send_amount',
      pending_data: { recipient: username },
    });
    return sendMessage(chatId, `\u2726 Sending to @${username}\n\nHow much SIDI? \u2726`);
  }

  // ── Buy flow ──
  if (data.startsWith('proceed_buy_')) {
    const reference = data.replace('proceed_buy_', '');
    const freshUser = await getUser(telegramId);
    return processBuyPayment(chatId, freshUser, reference);
  }

  if (data.startsWith('check_payment_')) {
    return sendMessage(
      chatId,
      '\u2726 Waiting for payment confirmation.\n\nOnce your bank transfer is received, we will credit your SIDI automatically \u2726',
      mainMenuKeyboard()
    );
  }

  // ── Sell flow ──
  if (data === 'confirm_sell') {
    const freshUser = await getUser(telegramId);
    return executeSell(chatId, freshUser);
  }

  if (data === 'change_bank' || data === 'update_bank') {
    const { POPULAR_BANKS: banks } = await import('../services/korapay.js');
    await updateUser(telegramId, {
      pending_action: 'sell_bank',
      pending_data: user.pending_data || {},
    });
    return sendMessage(chatId, '\u2726 Select your bank:', bankListKeyboard(banks.slice(0, 12)));
  }

  if (data.startsWith('bank_')) {
    const bankCode = data.replace('bank_', '');
    const freshUser = await getUser(telegramId);
    return processSellBank(chatId, freshUser, bankCode);
  }

  // ── History filters ──
  if (data === 'history_all') return handleHistory(chatId, user, 'all');
  if (data === 'history_sent') return handleHistory(chatId, user, 'sent');
  if (data === 'history_received') return handleHistory(chatId, user, 'received');
  if (data === 'history_buysell') return handleHistory(chatId, user, 'buysell');

  // ── Premium upgrade ──
  if (data === 'upgrade_premium') {
    // TODO: Integrate with Korapay for premium payment
    return sendMessage(
      chatId,
      '\u2726 Premium Upgrade\n\nTo upgrade, pay \u20A61,500 using /buy and then contact support.\n\nPremium features will be activated within minutes \u2726',
      mainMenuKeyboard()
    );
  }

  // ── Leaderboard tabs ──
  if (data === 'lb_weekly' || data === 'lb_alltime' || data === 'lb_referrals') {
    return handleLeaderboard(chatId, user);
  }

  // ── Settings ──
  if (data === 'copy_wallet') {
    return sendMessage(
      chatId,
      `\u2726 Your TON Wallet Address:\n\n<code>${user.wallet_address}</code>\n\nTap to copy \u2726`,
      mainMenuKeyboard()
    );
  }

  if (data === 'toggle_notifications') {
    return sendMessage(chatId, '\u2726 Notifications are always on for your security \u2726', mainMenuKeyboard());
  }

  // ── Cancel ──
  if (data === 'cancel_action') {
    await updateUser(telegramId, { pending_action: null, pending_data: null });
    return sendMessage(chatId, '\u2726 Action cancelled \u2726', mainMenuKeyboard());
  }
}
