import {
  getUser,
  updateUser,
  getUserByUsername,
  getTelegramIdByUsername,
  getStats,
  getAllUserIds,
  incrementStat,
  updateLeaderboard,
  addTransaction,
} from '../services/db.js';
import { sendMessage } from '../services/notifications.js';
import { formatNumber, sidiToNaira, formatDate, generateReference } from '../utils/formatting.js';
import { cleanUsername } from '../utils/validation.js';
import { mainMenuKeyboard } from './keyboards.js';

export async function handleAdminCommand(chatId, text, adminId) {
  const parts = text.split(' ');
  const command = parts[0].toLowerCase();

  try {
    switch (command) {
      case '/admin_stats':
        return adminStats(chatId);

      case '/admin_user':
        return adminUser(chatId, parts[1]);

      case '/admin_credit':
        return adminCredit(chatId, parts[1], parseFloat(parts[2]));

      case '/admin_debit':
        return adminDebit(chatId, parts[1], parseFloat(parts[2]));

      case '/admin_ban':
        return adminBan(chatId, parts[1]);

      case '/admin_unban':
        return adminUnban(chatId, parts[1]);

      case '/admin_broadcast':
        return adminBroadcast(chatId, parts.slice(1).join(' '));

      case '/admin_fees':
        return adminFees(chatId);

      case '/admin_pending':
        return adminPending(chatId);

      default:
        return sendMessage(
          chatId,
          '\u2726 Admin Commands\n\n' +
            '/admin_stats \u2014 Platform dashboard\n' +
            '/admin_user @username \u2014 User profile\n' +
            '/admin_credit @username amount\n' +
            '/admin_debit @username amount\n' +
            '/admin_ban @username\n' +
            '/admin_unban @username\n' +
            '/admin_broadcast message\n' +
            '/admin_fees \u2014 Fees collected\n' +
            '/admin_pending \u2014 Pending transactions'
        );
    }
  } catch (error) {
    console.error('Admin command error:', error.message);
    return sendMessage(chatId, `\u2726 Admin error: ${error.message} \u2726`);
  }
}

async function adminStats(chatId) {
  const stats = await getStats();
  const text =
    `\u2726 ADMIN \u2014 Platform Dashboard\n\n` +
    `\uD83D\uDC65 Total Users: ${formatNumber(stats.total_users)}\n` +
    `\uD83D\uDCCA Total Transactions: ${formatNumber(stats.total_transactions)}\n` +
    `\uD83D\uDCB0 Total Volume: \u20A6${formatNumber(stats.total_volume_ngn)}\n` +
    `\uD83D\uDCB5 Total Fees: \u20A6${formatNumber(stats.total_fees_ngn)}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `Today Transactions: ${formatNumber(stats.today_transactions)}\n` +
    `Today Volume: \u20A6${formatNumber(stats.today_volume_ngn)}\n` +
    `Circulating Supply: ${formatNumber(stats.circulating_supply)} SIDI \u2726`;

  return sendMessage(chatId, text);
}

async function adminUser(chatId, usernameArg) {
  if (!usernameArg) return sendMessage(chatId, 'Usage: /admin_user @username');

  const username = cleanUsername(usernameArg);
  const user = await getUserByUsername(username);

  if (!user) return sendMessage(chatId, `User @${username} not found`);

  const text =
    `\u2726 ADMIN \u2014 User Profile\n\n` +
    `\uD83D\uDC64 ${user.full_name} (@${user.username})\n` +
    `ID: <code>${user.telegram_id}</code>\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDC8E Balance: ${formatNumber(user.sidi_balance)} SIDI\n` +
    `\uD83D\uDCB5 Value: \u20A6${formatNumber(sidiToNaira(user.sidi_balance))}\n` +
    `\uD83C\uDFC6 Account: ${user.is_premium ? 'Premium' : 'Free'}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDCE4 Total Sent: ${formatNumber(user.total_sent)} SIDI\n` +
    `\uD83D\uDCE5 Total Received: ${formatNumber(user.total_received)} SIDI\n` +
    `\uD83D\uDCB3 Total Bought: \u20A6${formatNumber(user.total_bought_ngn)}\n` +
    `\uD83D\uDCB0 Total Sold: \u20A6${formatNumber(user.total_sold_ngn)}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83D\uDC65 Referrals: ${user.referral_count || 0}\n` +
    `\uD83C\uDF81 Referral Earnings: ${formatNumber(user.referral_earnings || 0)} SIDI\n` +
    `\uD83D\uDD25 Check-in Streak: ${user.checkin_streak || 0}\n` +
    `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n` +
    `\uD83C\uDFE6 Bank: ${user.bank_name || 'Not set'}\n` +
    `\uD83D\uDCDD Wallet: <code>${user.wallet_address}</code>\n` +
    `\uD83D\uDCC5 Joined: ${formatDate(user.joined_date)}\n` +
    `\uD83D\uDEAB Banned: ${user.is_banned ? 'Yes' : 'No'}\n` +
    `\uD83D\uDD52 Last Active: ${formatDate(user.last_active)} \u2726`;

  return sendMessage(chatId, text);
}

async function adminCredit(chatId, usernameArg, amount) {
  if (!usernameArg || !amount || isNaN(amount)) {
    return sendMessage(chatId, 'Usage: /admin_credit @username amount');
  }

  const username = cleanUsername(usernameArg);
  const telegramId = await getTelegramIdByUsername(username);
  if (!telegramId) return sendMessage(chatId, `User @${username} not found`);

  const user = await getUser(telegramId);
  const newBalance = user.sidi_balance + amount;
  await updateUser(telegramId, { sidi_balance: newBalance });
  await updateLeaderboard(telegramId, newBalance);
  await incrementStat('circulating_supply', amount);
  await addTransaction(telegramId, {
    type: 'admin_credit',
    amount,
    description: 'Admin credit',
    reference: generateReference(),
  });

  // Notify user
  await sendMessage(telegramId, `\u2726 <b>+${formatNumber(amount)} SIDI</b> added to your wallet by admin \u2726`);

  return sendMessage(chatId, `\u2705 Credited ${formatNumber(amount)} SIDI to @${username}. New balance: ${formatNumber(newBalance)} SIDI`);
}

async function adminDebit(chatId, usernameArg, amount) {
  if (!usernameArg || !amount || isNaN(amount)) {
    return sendMessage(chatId, 'Usage: /admin_debit @username amount');
  }

  const username = cleanUsername(usernameArg);
  const telegramId = await getTelegramIdByUsername(username);
  if (!telegramId) return sendMessage(chatId, `User @${username} not found`);

  const user = await getUser(telegramId);
  const newBalance = Math.max(0, user.sidi_balance - amount);
  await updateUser(telegramId, { sidi_balance: newBalance });
  await updateLeaderboard(telegramId, newBalance);
  await addTransaction(telegramId, {
    type: 'admin_debit',
    amount,
    description: 'Admin debit',
    reference: generateReference(),
  });

  return sendMessage(chatId, `\u2705 Debited ${formatNumber(amount)} SIDI from @${username}. New balance: ${formatNumber(newBalance)} SIDI`);
}

async function adminBan(chatId, usernameArg) {
  if (!usernameArg) return sendMessage(chatId, 'Usage: /admin_ban @username');

  const username = cleanUsername(usernameArg);
  const telegramId = await getTelegramIdByUsername(username);
  if (!telegramId) return sendMessage(chatId, `User @${username} not found`);

  await updateUser(telegramId, { is_banned: true });
  return sendMessage(chatId, `\u2705 @${username} has been banned`);
}

async function adminUnban(chatId, usernameArg) {
  if (!usernameArg) return sendMessage(chatId, 'Usage: /admin_unban @username');

  const username = cleanUsername(usernameArg);
  const telegramId = await getTelegramIdByUsername(username);
  if (!telegramId) return sendMessage(chatId, `User @${username} not found`);

  await updateUser(telegramId, { is_banned: false });
  return sendMessage(chatId, `\u2705 @${username} has been unbanned`);
}

async function adminBroadcast(chatId, message) {
  if (!message || !message.trim()) {
    return sendMessage(chatId, 'Usage: /admin_broadcast Your message here');
  }

  const userIds = await getAllUserIds();
  let sent = 0;
  let failed = 0;

  await sendMessage(chatId, `\u2726 Broadcasting to ${userIds.length} users...`);

  for (const uid of userIds) {
    try {
      await sendMessage(uid, `\u2726 ${message} \u2726`, mainMenuKeyboard());
      sent++;
      // Rate limit to avoid Telegram flood
      if (sent % 25 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      failed++;
    }
  }

  return sendMessage(chatId, `\u2705 Broadcast complete.\nSent: ${sent}\nFailed: ${failed}`);
}

async function adminFees(chatId) {
  const stats = await getStats();
  const text =
    `\u2726 ADMIN \u2014 Fees Dashboard\n\n` +
    `Total Fees Collected: \u20A6${formatNumber(stats.total_fees_ngn)}\n` +
    `Total Volume: \u20A6${formatNumber(stats.total_volume_ngn)}\n` +
    `Total Transactions: ${formatNumber(stats.total_transactions)} \u2726`;

  return sendMessage(chatId, text);
}

async function adminPending(chatId) {
  // Show pending summary
  return sendMessage(
    chatId,
    `\u2726 ADMIN \u2014 Pending Transactions\n\nPending payments are tracked in the database with a 30min expiry.\nCheck Korapay dashboard for detailed status \u2726`
  );
}
