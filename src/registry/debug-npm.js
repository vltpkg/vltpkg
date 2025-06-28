// eslint-disable-next-line @typescript-eslint/no-require-imports
const _child = require('child_process')

console.log('Starting wrangler dev in background...')
_child.execSync('npx wrangler dev --port 1337 &', { stdio: 'pipe' })

// Wait for server to start
setTimeout(() => {
  console.log('Testing npm proxy...')
  try {
    const result = _child.execSync(
      'curl -v http://localhost:1337/npm/sleepover',
      { encoding: 'utf8' },
    )
    console.log('Result:', result)
  } catch (error) {
    console.error('Error:', error)
  }

  // Kill wrangler
  _child.execSync('pkill -f wrangler')
}, 5000)
