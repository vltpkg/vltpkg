// Cloudflare Workers test setup using @cloudflare/vitest-pool-workers
import { beforeEach, afterEach, afterAll } from 'vitest'
// eslint-disable-next-line import/no-unresolved
import { env } from 'cloudflare:test'

beforeEach(async () => {
  // Set environment variables that the app expects
  process.env.ARG_DEBUG = 'false'
  process.env.ARG_TELEMETRY = 'false'
  process.env.ARG_DAEMON = 'false'

  // With @cloudflare/vitest-pool-workers, real bindings are automatically provided
  // and isolated per test. We can set up test data here if needed.

  // Set up test database with proper schema
  try {
    // Create tables with single-line SQL to avoid parsing issues
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS packages (name TEXT PRIMARY KEY, tags TEXT, last_updated TEXT, origin TEXT NOT NULL DEFAULT 'local', upstream TEXT, cached_at TEXT)",
    )
    await env.DB.exec(
      'CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, uuid TEXT NOT NULL, scope TEXT)',
    )
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS versions (spec TEXT PRIMARY KEY, manifest TEXT, published_at TEXT, origin TEXT NOT NULL DEFAULT 'local', upstream TEXT, cached_at TEXT)",
    )

    // Insert a test admin token for authenticated tests
    await env.DB.prepare(
      'INSERT OR REPLACE INTO tokens (token, uuid, scope) VALUES (?, ?, ?)',
    )
      .bind('test-admin-token-12345', 'admin-uuid', 'read,write')
      .run()
  } catch (error) {
    // Database might already be set up, that's okay
    console.log('Database setup skipped:', error)
  }
})

afterEach(async () => {
  // Clean up test data after each test
  // While Cloudflare Workers pool provides isolated storage per test,
  // explicit cleanup ensures no test data leaks between tests

  try {
    // Clean up database tables (ignore errors if tables don't exist)
    try {
      await env.DB.exec(
        'DELETE FROM packages WHERE name LIKE "test-%"',
      )
    } catch (_e) {
      // Table might not exist, that's okay
    }
    try {
      await env.DB.exec(
        'DELETE FROM versions WHERE spec LIKE "test-%"',
      )
    } catch (_e) {
      // Table might not exist, that's okay
    }
    try {
      await env.DB.exec(
        'DELETE FROM tokens WHERE token LIKE "test-%"',
      )
    } catch (_e) {
      // Table might not exist, that's okay
    }

    // Clean up any test objects from R2 bucket
    try {
      const testObjects = await env.BUCKET.list({ prefix: 'test-' })
      for (const obj of testObjects.objects || []) {
        await env.BUCKET.delete(obj.key)
      }
    } catch (_e) {
      // BUCKET might not be available, that's okay
    }

    // Clean up any test keys from KV store
    try {
      const testKvKeys = await env.KV.list({ prefix: 'test-' })
      for (const key of testKvKeys.keys || []) {
        await env.KV.delete(key.name)
      }
    } catch (_e) {
      // KV might not be available, that's okay
    }

    console.log('✓ Test cleanup completed')
  } catch (error) {
    // Cleanup errors shouldn't fail tests, but we should log them
    console.warn('⚠ Test cleanup warning:', error)
  }
})

afterAll(async () => {
  // Global cleanup after all tests complete
  console.log('🧹 Running global test cleanup...')

  try {
    // Clean up all test data from database (ignore errors if tables don't exist)
    try {
      await env.DB.exec(
        'DELETE FROM packages WHERE name LIKE "test-%" OR name LIKE "%test%"',
      )
    } catch (_e) {
      // Table might not exist, that's okay
    }
    try {
      await env.DB.exec(
        'DELETE FROM versions WHERE spec LIKE "test-%" OR spec LIKE "%test%"',
      )
    } catch (_e) {
      // Table might not exist, that's okay
    }
    try {
      await env.DB.exec(
        'DELETE FROM tokens WHERE token LIKE "test-%" OR uuid LIKE "%test%"',
      )
    } catch (_e) {
      // Table might not exist, that's okay
    }

    // Clean up all test objects from R2 bucket
    try {
      const allTestObjects = await env.BUCKET.list({
        prefix: 'test-',
      })
      for (const obj of allTestObjects.objects || []) {
        await env.BUCKET.delete(obj.key)
      }

      // Also clean up any objects that might have test in the name
      const moreTestObjects = await env.BUCKET.list()
      for (const obj of moreTestObjects.objects || []) {
        if (obj.key.includes('test')) {
          await env.BUCKET.delete(obj.key)
        }
      }
    } catch (_e) {
      // BUCKET might not be available, that's okay
    }

    // Clean up all test keys from KV store
    try {
      const allTestKvKeys = await env.KV.list({ prefix: 'test-' })
      for (const key of allTestKvKeys.keys || []) {
        await env.KV.delete(key.name)
      }

      // Clean up any KV keys that might have test in the name
      const allKvKeys = await env.KV.list()
      for (const key of allKvKeys.keys || []) {
        if (key.name.includes('test')) {
          await env.KV.delete(key.name)
        }
      }
    } catch (_e) {
      // KV might not be available, that's okay
    }

    console.log('✅ Global test cleanup completed successfully')
  } catch (error) {
    console.error('❌ Global test cleanup failed:', error)
  }
})
