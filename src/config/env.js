// Central environment-variable validation for Sidicoin.
//
// Two tiers of variables exist:
//   * required — the core application cannot start without them. If any is
//     missing, `validateEnv()` throws and the process exits with a clear,
//     secret-free message.
//   * optional — feature integrations that degrade gracefully when absent.
//
// Nothing in this module ever reads, logs or returns a secret *value*; only the
// names of missing variables are reported.

const REQUIRED = [
  ['TELEGRAM_BOT_TOKEN', 'Telegram Bot API token from @BotFather'],
  ['TELEGRAM_WEBHOOK_SECRET', 'Secret token Telegram echoes back on every webhook call'],
  ['ADMIN_TELEGRAM_ID', 'Numeric Telegram user id allowed to run /admin_* commands'],
  ['ADMIN_API_TOKEN', 'Bearer token protecting the HTTP /admin/* endpoints'],
  ['ENCRYPTION_KEY', 'Key used to encrypt TON private keys at rest'],
  ['BOT_WEBHOOK_URL', 'Public https base URL of this deployment'],
  ['DATABASE_URL', 'Neon Postgres connection string (sslmode=require)'],
  ['KORAPAY_SECRET_KEY', 'Korapay secret key (server-side payment verification)'],
];

const OPTIONAL = [
  ['KORAPAY_PUBLIC_KEY', 'Korapay public key (client-side checkout only)'],
  ['TON_API_KEY', 'toncenter.com API key for the TON blockchain'],
  ['GROQ_API_KEY', 'Groq API key powering the AI assistant'],
  ['SIDI_PRICE_NGN', 'SIDI price in NGN (defaults to 5)'],
  ['SIDI_FEE_WALLET', 'TON address that receives platform fees'],
];

function isSet(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '';
}

function describe(missing, vars) {
  return missing
    .map((name) => {
      const hint = vars.find(([n]) => n === name)?.[1] || '';
      return `  - ${name}${hint ? ` (${hint})` : ''}`;
    })
    .join('\n');
}

/**
 * Validate the environment.
 *
 * @param {{ strict?: boolean, logger?: Pick<Console, 'warn'|'info'> }} [options]
 *   strict — throw when optional integrations are missing (used in CI).
 * @returns {{ features: Record<string, boolean>, price: number }}
 */
export function validateEnv(options = {}) {
  const { strict = false, logger = console } = options;

  const missingRequired = REQUIRED.map(([name]) => name).filter((name) => !isSet(name));
  const missingOptional = OPTIONAL.map(([name]) => name).filter((name) => !isSet(name));

  if (missingRequired.length > 0) {
    const error = new Error(
      'Missing required environment variables:\n' +
        describe(missingRequired, REQUIRED) +
        '\n\nCopy .env.example to .env and fill in the values. ' +
        'Required variables gate the core application and cannot be defaulted.'
    );
    error.code = 'ENV_VALIDATION_FAILED';
    error.missing = missingRequired;
    throw error;
  }

  if (missingOptional.length > 0) {
    const message =
      'Optional integrations disabled (variables not set):\n' +
      describe(missingOptional, OPTIONAL);
    if (strict) {
      const error = new Error(message);
      error.code = 'ENV_VALIDATION_FAILED';
      error.missing = missingOptional;
      throw error;
    }
    logger.warn(message);
  }

  const features = {
    payments: true,
    database: true,
    ton: isSet('TON_API_KEY'),
    ai: isSet('GROQ_API_KEY'),
  };

  return {
    features,
    price: Number(process.env.SIDI_PRICE_NGN || 5),
  };
}

/** True when an integration variable is present. */
export function hasEnv(name) {
  return isSet(name);
}

/**
 * Read a required variable at the point of use. Throws a secret-free error
 * when the value is absent, so a misconfigured deployment fails loudly instead
 * of silently sending `undefined` to a third-party API.
 */
export function requireEnv(name) {
  if (!isSet(name)) {
    const error = new Error(`Environment variable ${name} is not set. See .env.example.`);
    error.code = 'ENV_MISSING';
    throw error;
  }
  return process.env[name];
}
