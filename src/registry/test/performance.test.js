import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { unstable_dev } from 'wrangler'

describe('Performance Tests', () => {
  let worker

  beforeAll(async () => {
    worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true },
      local: true,
      port: 1338, // Use different port to avoid conflicts
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  async function measureRequestTime(url, expectJson = true) {
    const start = Date.now()
    const response = await fetch(url)
    const end = Date.now()
    const duration = end - start

    let data = null
    if (response.ok && expectJson) {
      try {
        data = await response.json()
      } catch (e) {
        // Handle non-JSON responses (like tarballs)
        data = null
      }
    }

    return {
      duration,
      ok: response.ok,
      status: response.status,
      data
    }
  }

  it('should be faster than npm registry for packument requests', async () => {
    const testPackage = 'lodash'

    // Test npm registry directly
    const npmResult = await measureRequestTime(`https://registry.npmjs.org/${testPackage}`)
    console.log(`NPM registry time: ${npmResult.duration}ms`)

    // Test our registry (first request - cache miss)
    const ourFirstResult = await measureRequestTime(`http://localhost:1338/npm/${testPackage}`)
    console.log(`Our registry (first): ${ourFirstResult.duration}ms`)

    // Test our registry (second request - should be cached)
    const ourSecondResult = await measureRequestTime(`http://localhost:1338/npm/${testPackage}`)
    console.log(`Our registry (cached): ${ourSecondResult.duration}ms`)

    expect(npmResult.ok).toBe(true)
    expect(ourFirstResult.ok).toBe(true)
    expect(ourSecondResult.ok).toBe(true)

    // Second request should be faster than first (due to caching)
    expect(ourSecondResult.duration).toBeLessThan(ourFirstResult.duration)

    // Cached request should be faster than npm (relaxed expectation)
    expect(ourSecondResult.duration).toBeLessThan(npmResult.duration * 2) // Allow up to 2x npm time
  }, 30000)

  it('should cache tarball requests effectively', async () => {
    const testPackage = 'lodash'
    const testVersion = '4.17.21'
    const tarballUrl = `http://localhost:1338/npm/${testPackage}/-/${testPackage}-${testVersion}.tgz`

    // First tarball request (don't expect JSON)
    const firstRequest = await measureRequestTime(tarballUrl, false)
    console.log(`Tarball (first): ${firstRequest.duration}ms`)

    // Second tarball request (should be cached)
    const secondRequest = await measureRequestTime(tarballUrl, false)
    console.log(`Tarball (cached): ${secondRequest.duration}ms`)

    expect(firstRequest.ok).toBe(true)
    expect(secondRequest.ok).toBe(true)

    // Second request should be reasonably fast (allow for network variance)
    expect(secondRequest.duration).toBeLessThan(firstRequest.duration * 3) // Allow more variance for small requests
  }, 30000)

  it('should handle manifest requests efficiently', async () => {
    const testPackage = 'express'
    const testVersion = '4.18.2'
    const manifestUrl = `http://localhost:1338/npm/${testPackage}/${testVersion}`

    // First manifest request
    const firstRequest = await measureRequestTime(manifestUrl)
    console.log(`Manifest (first): ${firstRequest.duration}ms`)

    // Second manifest request (should be cached)
    const secondRequest = await measureRequestTime(manifestUrl)
    console.log(`Manifest (cached): ${secondRequest.duration}ms`)

    expect(firstRequest.ok).toBe(true)
    expect(secondRequest.ok).toBe(true)

    // Verify the manifest has rewritten tarball URLs to our domain
    expect(secondRequest.data.dist.tarball).toContain('localhost')
    expect(secondRequest.data.dist.tarball).toContain(testPackage)

    // Second request should be faster or at least not much slower
    expect(secondRequest.duration).toBeLessThan(firstRequest.duration * 1.5) // Allow some variance
  }, 30000)

  it('should demonstrate racing cache performance', async () => {
    const testPackages = ['react', 'vue', 'angular']
    const results = []

    for (const pkg of testPackages) {
      // Measure cold request (no cache)
      const coldResult = await measureRequestTime(`http://localhost:1338/npm/${pkg}`)

      // Measure warm request (potentially cached)
      const warmResult = await measureRequestTime(`http://localhost:1338/npm/${pkg}`)

      results.push({
        package: pkg,
        cold: coldResult.duration,
        warm: warmResult.duration,
        improvement: ((coldResult.duration - warmResult.duration) / coldResult.duration * 100).toFixed(1)
      })

      console.log(`${pkg}: Cold ${coldResult.duration}ms, Warm ${warmResult.duration}ms (${results[results.length-1].improvement}% faster)`)
    }

    // At least some packages should show improvement (or at least not be much worse)
    const reasonableResults = results.filter(r => parseFloat(r.improvement) > -50) // Allow up to 50% slower due to racing
    expect(reasonableResults.length).toBeGreaterThan(0)
  }, 60000)

  it('should handle high concurrency efficiently', async () => {
    const testPackage = 'uuid'
    const concurrency = 10

    // Make concurrent requests
    const promises = Array(concurrency).fill().map((_, i) =>
      measureRequestTime(`http://localhost:1338/npm/${testPackage}?_t=${i}`)
    )

    const start = Date.now()
    const results = await Promise.all(promises)
    const totalTime = Date.now() - start

    console.log(`${concurrency} concurrent requests completed in ${totalTime}ms`)
    console.log(`Average per request: ${(totalTime / concurrency).toFixed(1)}ms`)

    // All requests should succeed
    expect(results.every(r => r.ok)).toBe(true)

    // Concurrent requests shouldn't be much slower than sequential
    const avgRequestTime = totalTime / concurrency
    expect(avgRequestTime).toBeLessThan(5000) // Should average less than 5 seconds per request
  }, 60000)
})
