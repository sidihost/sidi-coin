import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Sidi, the intelligent assistant for Sidicoin — Africa's premier crypto payment platform on Telegram.

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
- 1 SIDI = ₦25 (Nigerian Naira)
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

export async function getAIResponse(userMessage, userName) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
