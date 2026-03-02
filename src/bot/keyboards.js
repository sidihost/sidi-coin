export function mainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDCE4 Send', callback_data: 'cmd_send' },
          { text: '\uD83D\uDCB3 Buy', callback_data: 'cmd_buy' },
        ],
        [
          { text: '\uD83D\uDCB0 Sell', callback_data: 'cmd_sell' },
          { text: '\uD83C\uDF81 Refer', callback_data: 'cmd_refer' },
        ],
        [
          { text: '\uD83D\uDCCA Balance', callback_data: 'cmd_balance' },
          { text: '\u2699\uFE0F Settings', callback_data: 'cmd_settings' },
        ],
      ],
    },
  };
}

export function welcomeKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDC8E My Wallet', callback_data: 'cmd_balance' },
          { text: '\uD83D\uDCE4 Send Money', callback_data: 'cmd_send' },
        ],
        [
          { text: '\uD83D\uDCB3 Buy SIDI', callback_data: 'cmd_buy' },
          { text: '\u2753 Help', callback_data: 'cmd_help' },
        ],
      ],
    },
  };
}

export function onboardingStep2Keyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Got it \u2192', callback_data: 'onboard_step3' }],
      ],
    },
  };
}

export function onboardingStep3Keyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDCB3 Buy SIDI', callback_data: 'cmd_buy' },
          { text: '\uD83C\uDF81 Refer Friends', callback_data: 'cmd_refer' },
        ],
      ],
    },
  };
}

export function balanceKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83D\uDCE4 Send', callback_data: 'cmd_send' },
          { text: '\uD83D\uDCB3 Buy', callback_data: 'cmd_buy' },
          { text: '\uD83D\uDCB0 Sell', callback_data: 'cmd_sell' },
          { text: '\uD83D\uDCCB History', callback_data: 'cmd_history' },
        ],
      ],
    },
  };
}

export function confirmSendKeyboard(recipientUsername, amount) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u2705 Confirm', callback_data: `confirm_send_${recipientUsername}_${amount}` },
          { text: '\u274C Cancel', callback_data: 'cancel_action' },
        ],
      ],
    },
  };
}

export function confirmBuyKeyboard(reference) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u2705 Proceed to Pay', callback_data: `proceed_buy_${reference}` },
          { text: '\u274C Cancel', callback_data: 'cancel_action' },
        ],
      ],
    },
  };
}

export function paidKeyboard(reference) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u2705 I Have Paid', callback_data: `check_payment_${reference}` },
          { text: '\u274C Cancel', callback_data: 'cancel_action' },
        ],
      ],
    },
  };
}

export function confirmSellKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u2705 Yes, Cash Out', callback_data: 'confirm_sell' },
          { text: '\uD83C\uDFE6 Change Bank', callback_data: 'change_bank' },
        ],
      ],
    },
  };
}

export function historyFilterKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'All', callback_data: 'history_all' },
          { text: 'Sent', callback_data: 'history_sent' },
          { text: 'Received', callback_data: 'history_received' },
          { text: 'Buy/Sell', callback_data: 'history_buysell' },
        ],
      ],
    },
  };
}

export function premiumKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\u2B50 Upgrade Now', callback_data: 'upgrade_premium' },
          { text: 'Maybe Later', callback_data: 'cmd_home' },
        ],
      ],
    },
  };
}

export function settingsKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '\uD83C\uDFE6 Update Bank', callback_data: 'update_bank' },
          { text: '\uD83D\uDD14 Notifications', callback_data: 'toggle_notifications' },
        ],
        [
          { text: '\uD83D\uDCCB Copy Wallet Address', callback_data: 'copy_wallet' },
          { text: '\u2753 Help', callback_data: 'cmd_help' },
        ],
      ],
    },
  };
}

export function homeKeyboard() {
  return mainMenuKeyboard();
}

export function leaderboardKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Weekly', callback_data: 'lb_weekly' },
          { text: 'All Time', callback_data: 'lb_alltime' },
          { text: 'Referrals', callback_data: 'lb_referrals' },
        ],
      ],
    },
  };
}

export function bankListKeyboard(banks) {
  const rows = [];
  for (let i = 0; i < banks.length; i += 2) {
    const row = [{ text: banks[i].name, callback_data: `bank_${banks[i].code}` }];
    if (banks[i + 1]) {
      row.push({ text: banks[i + 1].name, callback_data: `bank_${banks[i + 1].code}` });
    }
    rows.push(row);
  }
  return { reply_markup: { inline_keyboard: rows } };
}

export function contactsKeyboard(contacts) {
  if (!contacts || contacts.length === 0) {
    return {
      reply_markup: {
        inline_keyboard: [
          [{ text: '\uD83D\uDCE4 Send to someone new', callback_data: 'cmd_send' }],
        ],
      },
    };
  }
  const rows = contacts.slice(0, 6).map((c) => [
    { text: `\uD83D\uDC64 ${c.full_name || c.username}`, callback_data: `quick_send_${c.username}` },
  ]);
  rows.push([{ text: '\uD83D\uDCE4 Send to someone new', callback_data: 'cmd_send_new' }]);
  return { reply_markup: { inline_keyboard: rows } };
}
