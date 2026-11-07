// Fails fast when required environment variables are missing. Intended for CI
// or a pre-deploy check: `npm run check:env`.
import { validateEnv } from '../src/config/env.js';

try {
  const { features } = validateEnv();
  console.log('\u2705 Required environment variables are set.');
  console.log(`   TON integration: ${features.ton ? 'on' : 'off'}`);
  console.log(`   AI integration:  ${features.ai ? 'on' : 'off'}`);
} catch (error) {
  console.error(`\u274C ${error.message}\n`);
  process.exit(1);
}
