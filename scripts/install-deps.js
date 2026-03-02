import { execSync } from 'child_process';

console.log('Installing tailwindcss and @tailwindcss/postcss...');
try {
  execSync('cd /vercel/share/v0-project && pnpm add -D tailwindcss@4.1.0 @tailwindcss/postcss@4.1.0', { 
    stdio: 'inherit',
    timeout: 60000 
  });
  console.log('Done!');
} catch (e) {
  console.error('pnpm failed, trying npm...');
  try {
    execSync('cd /vercel/share/v0-project && npm install --save-dev tailwindcss@4.1.0 @tailwindcss/postcss@4.1.0', { 
      stdio: 'inherit',
      timeout: 60000 
    });
    console.log('Done with npm!');
  } catch (e2) {
    console.error('Both failed:', e2.message);
  }
}
