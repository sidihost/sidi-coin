import { requireEnv } from '../config/env.js';

const API_BASE = 'https://api.telegram.org/bot';

function apiUrl(method) {
  return `${API_BASE}${requireEnv('TELEGRAM_BOT_TOKEN')}/${method}`;
}

export async function sendMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  };

  try {
    const response = await fetch(apiUrl("sendMessage"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Send message error:', error.message);
    return null;
  }
}

export async function editMessage(chatId, messageId, text, options = {}) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...options,
  };

  try {
    const response = await fetch(apiUrl("editMessageText"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await response.json();
  } catch (error) {
    console.error('Edit message error:', error.message);
    return null;
  }
}

export async function deleteMessage(chatId, messageId) {
  try {
    const response = await fetch(apiUrl("deleteMessage"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Delete message error:', error.message);
    return null;
  }
}

/**
 * Sends a message that automatically deletes itself after a specified number of seconds.
 * Useful for security-sensitive notifications, temporary warnings, and ephemeral receipts.
 */
export async function sendSelfDestructingMessage(chatId, text, options = {}, deleteAfterSeconds = 15) {
  const sent = await sendMessage(chatId, text, options);
  if (sent?.ok && sent?.result?.message_id) {
    const messageId = sent.result.message_id;
    setTimeout(async () => {
      try {
        await deleteMessage(chatId, messageId);
      } catch (err) {
        console.error('Auto-destruct message error:', err.message);
      }
    }, deleteAfterSeconds * 1000);
  }
  return sent;
}

export async function setMyCommands(commands) {
  try {
    const response = await fetch(apiUrl("setMyCommands"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
    return await response.json();
  } catch (error) {
    console.error('Set commands error:', error.message);
    return null;
  }
}

export async function answerCallbackQuery(callbackQueryId, text = '') {
  try {
    await fetch(apiUrl("answerCallbackQuery"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (error) {
    console.error('Answer callback error:', error.message);
  }
}

export async function getUserProfilePhotos(userId) {
  try {
    const response = await fetch(apiUrl("getUserProfilePhotos"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, limit: 1 }),
    });
    const data = await response.json();
    if (data.ok && data.result.total_count > 0) {
      const fileId = data.result.photos[0][0].file_id;
      const fileResponse = await fetch(apiUrl("getFile"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });
      const fileData = await fileResponse.json();
      if (fileData.ok) {
        return `https://api.telegram.org/file/bot${requireEnv("TELEGRAM_BOT_TOKEN")}/${fileData.result.file_path}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ───── Notification Helpers ─────

export async function notifyReceived(recipientId, amount, nairaValue, senderUsername, newBalance) {
  const text =
    `\u2726 You received money!\n\n` +
    `\uD83D\uDCB0 <b>+${amount} SIDI</b> (\u20A6${nairaValue})\n` +
    `From: @${senderUsername}\n` +
    `Speed: Instant \u26A1\n\n` +
    `Balance: <b>${newBalance} SIDI</b>`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDCB0 Cash Out', callback_data: 'cmd_sell' },
          { text: '\uD83D\uDCE4 Send Back', callback_data: `quick_send_${senderUsername}` },
          { text: '\uD83D\uDC8E Wallet', callback_data: 'cmd_balance' },
        ],
      ],
    },
  };

  return sendMessage(recipientId, text, keyboard);
}

export async function notifyReferralJoined(referrerId, newUserName, bonus) {
  const text =
    `\u2726 Referral Bonus!\n\n` +
    `\uD83C\uDF89 ${newUserName} just joined Sidicoin using your link!\n` +
    `\uD83D\uDCB0 <b>+${bonus} SIDI</b> added to your wallet \u2726`;

  return sendMessage(referrerId, text);
}

export async function notifyReferralPurchase(referrerId, buyerName, bonus) {
  const text =
    `\u2726 Referral Reward!\n\n` +
    `${buyerName} made a purchase.\n` +
    `\uD83D\uDCB0 <b>+${bonus} SIDI</b> commission added \u2726`;

  return sendMessage(referrerId, text);
}

export async function notifyPaymentConfirmed(chatId, sidiAmount, newBalance, nairaValue) {
  const text =
    `\u2726 Payment Confirmed!\n\n` +
    `<b>+${sidiAmount} SIDI</b> added to your wallet\n` +
    `New Balance: <b>${newBalance} SIDI</b> (\u20A6${nairaValue})\n\n` +
    `Your SIDI is ready to use \u2726`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDCE4 Send SIDI', callback_data: 'cmd_send' },
          { text: '\uD83D\uDC8E View Wallet', callback_data: 'cmd_balance' },
        ],
      ],
    },
  };

  return sendMessage(chatId, text, keyboard);
}

export async function notifyCashoutSuccess(chatId, nairaAmount, bankName, accountName, reference) {
  const text =
    `\u2726 Cashout Successful!\n\n` +
    `\u20A6${nairaAmount} sent to ${bankName}\n` +
    `Account: ${accountName}\n` +
    `Reference: <code>${reference}</code>\n` +
    `Status: Processing \u26A1\n\n` +
    `Usually arrives within minutes \u2726`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDC8E Wallet', callback_data: 'cmd_balance' },
          { text: '\uD83C\uDFE0 Home', callback_data: 'cmd_home' },
        ],
      ],
    },
  };

  return sendMessage(chatId, text, keyboard);
}

export async function notifyAdmin(text) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId) {
    return sendMessage(adminId, text);
  }
}
