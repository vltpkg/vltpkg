// Cloudflare Workers test setup using @cloudflare/vitest-pool-workers
import { beforeEach, afterEach, afterAll } from 'vitest'
import { env } from 'cloudflare:test'

beforeEach(async () => {
  // Set environment variables that the app expects
  process.env.ARG_DEBUG = 'false'
  process.env.ARG_TELEMETRY = 'false'

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

  // Clean up database tables (ignore errors if tables don't exist)
  await env.DB.exec(
    'DELETE FROM packages WHERE name LIKE "test-%"',
  ).catch(() => {})
  await env.DB.exec(
    'DELETE FROM versions WHERE spec LIKE "test-%"',
  ).catch(() => {})
  await env.DB.exec(
    'DELETE FROM tokens WHERE token LIKE "test-%"',
  ).catch(() => {})

  // Clean up any test objects from R2 bucket
  const testObjects = await env.BUCKET.list({
    prefix: 'test-',
  }).catch(() => ({ objects: [] }))
  for (const obj of testObjects.objects || []) {
    await env.BUCKET.delete(obj.key).catch(() => {})
  }

  // Clean up any test keys from KV store
  if (env.KV) {
    const testKvKeys = await env.KV.list({ prefix: 'test-' }).catch(
      () => ({ keys: [] }),
    )
    for (const key of testKvKeys.keys || []) {
      await env.KV.delete(key.name).catch(() => {})
    }
  }

  console.log('✓ Test cleanup completed')
})

afterAll(async () => {
  // Global cleanup after all tests complete
  console.log('🧹 Running global test cleanup...')

  // Clean up all test data from database (ignore errors if tables don't exist)
  await env.DB.exec(
    'DELETE FROM packages WHERE name LIKE "test-%" OR name LIKE "%test%"',
  ).catch(() => {})
  await env.DB.exec(
    'DELETE FROM versions WHERE spec LIKE "test-%" OR spec LIKE "%test%"',
  ).catch(() => {})
  await env.DB.exec(
    'DELETE FROM tokens WHERE token LIKE "test-%" OR uuid LIKE "%test%"',
  ).catch(() => {})

  // Clean up all test objects from R2 bucket
  const allTestObjects = await env.BUCKET.list({
    prefix: 'test-',
  }).catch(() => ({ objects: [] }))
  for (const obj of allTestObjects.objects || []) {
    await env.BUCKET.delete(obj.key).catch(() => {})
  }

  // Also clean up any objects that might have test in the name
  const moreTestObjects = await env.BUCKET.list().catch(() => ({
    objects: [],
  }))
  for (const obj of moreTestObjects.objects || []) {
    if (obj.key.includes('test')) {
      await env.BUCKET.delete(obj.key).catch(() => {})
    }
  }

  // Clean up all test keys from KV store
  if (env.KV) {
    const allTestKvKeys = await env.KV.list({
      prefix: 'test-',
    }).catch(() => ({ keys: [] }))
    for (const key of allTestKvKeys.keys || []) {
      await env.KV.delete(key.name).catch(() => {})
    }

    // Clean up any KV keys that might have test in the name
    const allKvKeys = await env.KV.list().catch(() => ({
      keys: [],
    }))
    for (const key of allKvKeys.keys || []) {
      if (key.name.includes('test')) {
        await env.KV.delete(key.name).catch(() => {})
      }
    }
  }

  console.log('✓ Global test cleanup completed successfully')
})
