import { Router } from 'express';
import { verifyWebhookSignature } from '../services/korapay.js';
import {
  consumePendingPayment,
  getUser,
  updateUser,
  addTransaction,
  incrementStat,
  updateLeaderboard,
} from '../services/db.js';
import {
  notifyPaymentConfirmed,
  notifyReferralPurchase,
  notifyAdmin,
} from '../services/notifications.js';
import { formatNumber, sidiToNaira, generateReference } from '../utils/formatting.js';
import { REFERRAL_PURCHASE_COMMISSION } from '../config/tokenomics.js';

const router = Router();

router.post('/webhook/korapay', async (req, res) => {
  try {
    const signature = req.headers['x-korapay-signature'] || req.headers['x-korapay-hash'];
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';

    // Signature verification is mandatory. A request without a valid signature
    // is rejected before any state is touched (see docs/PAYMENTS.md §2.4).
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Rejected Korapay webhook: invalid or missing signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body || {};
    res.status(200).json({ status: 'received' });

    // Process the event after acknowledging receipt.
    const event = payload.event || payload.data?.event;
    const data = payload.data || payload;
    const reference = data.reference || data?.metadata?.reference;

    if (!reference) {
      console.error('Korapay webhook: No reference found');
      return;
    }

    // Handle charge success (for /buy)
    if (
      event === 'charge.success' ||
      event === 'charge.completed' ||
      data.status === 'success'
    ) {
      await handlePaymentSuccess(reference);
    }

    // Handle payout success/failure (for /sell)
    if (event === 'transfer.success' || event === 'transfer.completed') {
      console.log(`Payout successful: ${reference}`);
    }

    if (event === 'transfer.failed') {
      console.error(`Payout failed: ${reference}`);
      await notifyAdmin(`\u26A0\uFE0F Payout FAILED: ${reference}`);
    }
  } catch (error) {
    console.error('Korapay webhook error:', error.message);
    // The 200 acknowledgement may already have been sent; only reply if not.
    if (!res.headersSent) {
      res.status(200).json({ status: 'error received' });
    }
  }
});

async function handlePaymentSuccess(reference) {
  // Atomically consume the pending payment. If it is already gone the event is
  // a duplicate or unknown, so nothing is credited.
  const pending = await consumePendingPayment(reference);
  if (!pending) {
    console.error(`No pending payment found for ref: ${reference}`);
    return;
  }

  const user = await getUser(pending.telegram_id);
  if (!user) {
    console.error(`User not found for payment: ${pending.telegram_id}`);
    return;
  }

  if (pending.type === 'buy') {
    // Credit SIDI to user with exact 2-decimal precision
    const creditAmount = Math.round(Number(pending.sidi_amount) * 100) / 100;
    const newBalance = Math.round((Number(user.sidi_balance) + creditAmount) * 100) / 100;
    await updateUser(pending.telegram_id, {
      sidi_balance: newBalance,
      total_bought_ngn: Math.round(((Number(user.total_bought_ngn) || 0) + Number(pending.ngn_amount)) * 100) / 100,
      pending_action: null,
      pending_data: null,
    });
    await updateLeaderboard(pending.telegram_id, newBalance);

    // Record transaction
    await addTransaction(pending.telegram_id, {
      type: 'buy',
      amount: pending.sidi_amount,
      ngn_amount: pending.ngn_amount,
      reference,
      description: `Bought ${formatNumber(pending.sidi_amount)} SIDI`,
    });

    // Update stats
    await incrementStat('total_transactions');
    await incrementStat('today_transactions');
    await incrementStat('total_volume_ngn', Math.round(pending.ngn_amount));
    await incrementStat('total_fees_ngn', Math.round(pending.fee));
    await incrementStat('circulating_supply', pending.sidi_amount);

    // Notify user
    const nairaValue = formatNumber(sidiToNaira(newBalance));
    await notifyPaymentConfirmed(
      pending.chat_id || pending.telegram_id,
      formatNumber(pending.sidi_amount),
      formatNumber(newBalance),
      nairaValue
    );

    // Referral commission
    if (user.referred_by) {
      const referrer = await getUser(user.referred_by);
      if (referrer) {
        const commission = REFERRAL_PURCHASE_COMMISSION;
        await updateUser(user.referred_by, {
          sidi_balance: referrer.sidi_balance + commission,
          referral_earnings: (referrer.referral_earnings || 0) + commission,
        });
        await updateLeaderboard(user.referred_by, referrer.sidi_balance + commission);
        await addTransaction(user.referred_by, {
          type: 'referral_commission',
          amount: commission,
          description: `Commission: ${user.full_name} made a purchase`,
          reference: generateReference(),
        });
        await incrementStat('circulating_supply', commission);
        await notifyReferralPurchase(user.referred_by, user.full_name, commission);
      }
    }

    console.log(`Payment success: ${formatNumber(pending.sidi_amount)} SIDI credited to ${user.username} (ref: ${reference})`);
  }

  if (pending.type === 'premium') {
    // Activate premium
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await updateUser(pending.telegram_id, {
      is_premium: true,
      premium_expiry: expiry,
      pending_action: null,
      pending_data: null,
    });

    const { sendMessage } = await import('../services/notifications.js');
    await sendMessage(
      pending.chat_id || pending.telegram_id,
      `\u2726 Premium Activated!\n\nWelcome to Sidicoin Premium \u2726\nYour perks are now active for 30 days.\n\n\u2022 500K/day limit\n\u2022 0.8% fees\n\u2022 25 SIDI daily check-in\n\u2022 \u2726 badge \u2726`
    );

    console.log(`Premium activated for ${user.username} (ref: ${reference})`);
  }
}

export default router;
