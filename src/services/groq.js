import Groq from 'groq-sdk';
import { hasEnv } from '../config/env.js';
import { getSidiPriceNgn, WELCOME_BONUS, REFERRAL_SIGNUP_BONUS } from '../config/tokenomics.js';

let groq = null;

function getClient() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

function buildSystemPrompt() {
  return `You are Sidi, the intelligent assistant for Sidicoin — Africa's premier crypto payment platform on Telegram.

Personality:
- Warm, smart and proudly African
- Simple language for non-crypto users
- Always helpful and encouraging
- Guide users to relevant commands
- Max 3 sentences per reply
- Use the ✦ symbol occasionally as brand signature
- Never bash competitors
- Proud that Sidicoin is built for Africa

Key facts:
- 1 SIDI = ₦${getSidiPriceNgn()} (Nigerian Naira)
- New users get ${WELCOME_BONUS} SIDI free on signup
- Referrers earn ${REFERRAL_SIGNUP_BONUS} SIDI per signup
- Built on TON blockchain
- Send money using /send @username amount
- Buy SIDI with /buy
- Cash out with /sell
- Check balance with /balance
- Daily free SIDI with /checkin
- Earn from referrals with /refer
- Zero fees on transfers between users

Help users with:
- Sending and receiving money
- Explaining crypto simply
- Navigating bot features
- Troubleshooting payments
- Encouraging referrals`;
}

export async function getAIResponse(userMessage, userName) {
  if (!hasEnv('GROQ_API_KEY')) {
    return 'The AI assistant is not available right now. Type /help to see everything I can do \u2726';
  }

  try {
    const completion = await getClient().chat.completions.create({
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: `User's name is ${userName}. Their message: ${userMessage}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || "I'm here to help! Try /help to see what I can do \u2726";
  } catch (error) {
    console.error('Groq API error:', error.message);
    return "I'm having a moment \u2726 Try again or use /help to see all available commands.";
  }
}
