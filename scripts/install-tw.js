import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

console.log('Project root:', projectRoot);

try {
  const result = execSync('pnpm add -D tailwindcss@4.1.0 @tailwindcss/postcss@4.1.0', {
    cwd: projectRoot,
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log('Success:', result);
} catch (e) {
  console.log('pnpm failed, trying npm...');
  try {
    const result = execSync('npm install --save-dev tailwindcss@4.1.0 @tailwindcss/postcss@4.1.0', {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log('npm Success:', result);
  } catch (e2) {
    console.log('npm also failed:', e2.message);
    // Check if node_modules exists at all
    try {
      const ls = execSync('ls -la ' + projectRoot + '/node_modules/.pnpm/@tailwindcss+postcss* 2>&1 || echo "Not found"', {
        encoding: 'utf-8'
      });
      console.log('Tailwind postcss check:', ls);
    } catch(e3) {
      console.log('Check failed:', e3.message);
    }
  }
}
