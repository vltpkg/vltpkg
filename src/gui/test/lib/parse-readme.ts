import { describe, it, expect } from 'vitest'
import { parseReadme } from '@/lib/parse-readme.ts'

describe('parseReadme', () => {
  const repo = { org: 'test-org', repo: 'test-repo' }
  const ref = 'v1.0.0'

  it('should replace relative image paths with absolute github raw urls', async () => {
    const input = `
# Title

![banner](./banner.png)

Some text.

![icon](icon.svg)
`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain(
      'https://raw.githubusercontent.com/test-org/test-repo/v1.0.0/banner.png',
    )
    expect(result).toContain(
      'https://raw.githubusercontent.com/test-org/test-repo/v1.0.0/icon.svg',
    )
  })

  it('should replace relative link paths with absolute github blob urls', async () => {
    const input = `[link](./doc.md)`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain(
      'https://github.com/test-org/test-repo/blob/v1.0.0/doc.md',
    )
  })

  it('should not replace absolute urls', async () => {
    const input = `![absolute](https://example.com/image.png)`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain('https://example.com/image.png')
  })

  it('should not replace anchor links', async () => {
    const input = `[anchor](#section)`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain('(#section)')
    expect(result).not.toContain('https://github.com')
  })

  it('should handle html img tags', async () => {
    const input = `<img src="./image.png" alt="test" />`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain(
      'https://raw.githubusercontent.com/test-org/test-repo/v1.0.0/image.png',
    )
  })

  it('should handle html a tags', async () => {
    const input = `<a href="./doc.md">link</a>`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain(
      'https://github.com/test-org/test-repo/blob/v1.0.0/doc.md',
    )
  })

  it('should handle directory relative paths', async () => {
    const directory = 'packages/gui'
    const input = `
![test](./test.png)
[doc](./doc.md)
`
    const result = await parseReadme(input, repo, ref, directory)
    expect(result).toContain(
      'https://raw.githubusercontent.com/test-org/test-repo/v1.0.0/packages/gui/test.png',
    )
    expect(result).toContain(
      'https://github.com/test-org/test-repo/blob/v1.0.0/packages/gui/doc.md',
    )
  })

  it('should handle parent directory resolution', async () => {
    const directory = 'packages/gui'
    const input = `
![test](../assets/test.png)
[doc](../docs/doc.md)
`
    const result = await parseReadme(input, repo, ref, directory)
    expect(result).toContain(
      'https://raw.githubusercontent.com/test-org/test-repo/v1.0.0/packages/assets/test.png',
    )
    expect(result).toContain(
      'https://github.com/test-org/test-repo/blob/v1.0.0/packages/docs/doc.md',
    )
  })

  it('should preserve hashes in file links', async () => {
    const input = `[link](./doc.md#section)`
    const result = await parseReadme(input, repo, ref)
    expect(result).toContain(
      'https://github.com/test-org/test-repo/blob/v1.0.0/doc.md#section',
    )
  })
})
