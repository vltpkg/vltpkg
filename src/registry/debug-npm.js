const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting wrangler dev in background...');
const child = execSync('npx wrangler dev --port 1337 &', { stdio: 'pipe' });

// Wait for server to start
setTimeout(() => {
  console.log('Testing npm proxy...');
  try {
    const result = execSync('curl -v http://localhost:1337/npm/sleepover', { encoding: 'utf8' });
    console.log('Result:', result);
  } catch (error) {
    console.log('Error:', error.stdout);
  }

  // Kill wrangler
  execSync('pkill -f wrangler');
}, 5000);
