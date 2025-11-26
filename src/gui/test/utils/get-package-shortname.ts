import { test, expect, describe } from 'vitest'
import { getPackageShortName } from '@/utils/get-package-shortname.ts'

describe('getPackageShortName', () => {
  test('extracts first 2 characters from simple package names', () => {
    expect(getPackageShortName('react')).toBe('re')
    expect(getPackageShortName('vue')).toBe('vu')
    expect(getPackageShortName('express')).toBe('ex')
  })

  test('handles scoped packages correctly', () => {
    expect(getPackageShortName('@facebook/react')).toBe('re')
    expect(getPackageShortName('@vue/compiler')).toBe('co')
    expect(getPackageShortName('@testing/library')).toBe('li')
  })

  test('skips leading hyphens and underscores', () => {
    expect(getPackageShortName('_private')).toBe('pr')
    expect(getPackageShortName('-package')).toBe('pa')
    expect(getPackageShortName('__internal')).toBe('in')
    expect(getPackageShortName('---test')).toBe('te')
  })

  test('handles scoped packages with special characters', () => {
    expect(getPackageShortName('@scope/-package')).toBe('pa')
    expect(getPackageShortName('@org/__internal')).toBe('in')
    expect(getPackageShortName('@company/_private')).toBe('pr')
  })

  test('skips leading numbers and special characters', () => {
    expect(getPackageShortName('123-test')).toBe('te')
    expect(getPackageShortName('456abc')).toBe('ab')
    expect(getPackageShortName('___789xyz')).toBe('xy')
  })

  test('handles packages with mixed special characters', () => {
    expect(getPackageShortName('my-package')).toBe('my')
    expect(getPackageShortName('some_module')).toBe('so')
    expect(getPackageShortName('test.config')).toBe('te')
    expect(getPackageShortName('@scope/my-pkg')).toBe('my')
  })

  test('handles very short package names', () => {
    expect(getPackageShortName('a')).toBe('a')
    expect(getPackageShortName('ab')).toBe('ab')
    expect(getPackageShortName('@s/x')).toBe('x')
  })

  test('handles packages with all special characters gracefully', () => {
    expect(getPackageShortName('---')).toBe('--')
    expect(getPackageShortName('___')).toBe('__')
    expect(getPackageShortName('@scope/---')).toBe('--')
  })

  test('handles empty or malformed package names', () => {
    expect(getPackageShortName('')).toBe('')
    expect(getPackageShortName('@')).toBe('')
    expect(getPackageShortName('@scope/')).toBe('')
  })

  test('extracts letters when available', () => {
    expect(getPackageShortName('!@#react$%^')).toBe('re')
    expect(getPackageShortName('@scope/!test123')).toBe('te')
    expect(getPackageShortName('___abc___def')).toBe('ab')
  })

  test('handles packages with unicode characters', () => {
    expect(getPackageShortName('café')).toBe('ca')
    expect(getPackageShortName('naïve')).toBe('na')
    expect(getPackageShortName('@scope/résumé')).toBe('rs')
  })
})
