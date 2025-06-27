const { spawn } = require('child_process')
const { execSync } = require('child_process')
const { setTimeout } = require('timers')

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function waitForServer(url, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'vlt-serverless-registry-test'
        }
      })
      if (response.ok) {
        console.log('Server is ready!')
        return true
      }
    } catch (err) {
      console.log(`Waiting for server to start... (attempt ${i + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between attempts
    }
  }
  throw new Error('Server failed to start')
}

async function runTests() {
  let wrangler = null
  let vitest = null
  let testTimeout = null

  // Function to clean up processes
  const cleanup = async () => {
    console.log('Cleaning up processes...')
    if (testTimeout) {
      clearTimeout(testTimeout)
      testTimeout = null
    }
    if (wrangler) {
      wrangler.kill()
      wrangler = null
    }
    if (vitest) {
      vitest.kill()
      vitest = null
    }
  }

  // Handle process termination
  const handleTermination = async () => {
    console.log('Received termination signal, cleaning up...')
    await cleanup()
    process.exit(0)
  }

  process.on('SIGINT', handleTermination)
  process.on('SIGTERM', handleTermination)

  try {
    // Kill any existing wrangler processes
    try {
      execSync('pkill -f wrangler', { stdio: 'ignore' })
    } catch (err) {
      // Ignore errors if no process was found
    }

    // Setup test database
    console.log('Setting up test database...')
    execSync('npm run test:setup', { stdio: 'inherit' })

    // Start wrangler dev server
    console.log('Starting wrangler dev server...')
    wrangler = spawn('wrangler', ['dev', '--local', '--persist-to', 'local-store', '--experimental-json-config'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let serverStarted = false
    let serverError = null

    // Handle server output
    wrangler.stdout.on('data', (data) => {
      const output = data.toString().trim()
      console.log(`[Wrangler] ${output}`)

      // Check for server ready message
      if (output.includes('Ready in') || output.includes('Listening on')) {
        serverStarted = true
      }
    })

    wrangler.stderr.on('data', (data) => {
      const output = data.toString().trim()
      console.error(`[Wrangler Error] ${output}`)

      // Check for common errors
      if (output.includes('Error') || output.includes('Failed')) {
        serverError = output
      }
    })

    // Wait for server to start
    try {
      await waitForServer('http://localhost:1337')
    } catch (err) {
      console.error('Failed to start server:', err)
      if (serverError) {
        console.error('Server error:', serverError)
      }
      await cleanup()
      process.exit(1)
    }

    // Run vitest
    console.log('Running tests...')
    vitest = spawn('vitest', ['run', '--no-watch'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VITEST_MAX_TIMEOUT: '120000' // 2 minutes
      }
    })

    // Set a timeout for the entire test process
    testTimeout = setTimeout(() => {
      console.error('Tests timed out after 120 seconds')
      cleanup().then(() => process.exit(1))
    }, 120000)

    // Wait for vitest to complete
    vitest.on('close', async (code) => {
      console.log('Tests completed')
      await cleanup()
      process.exit(code)
    })

  } catch (err) {
    console.error('Test runner failed:', err)
    await cleanup()
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test runner failed:', err)
  process.exit(1)
})
