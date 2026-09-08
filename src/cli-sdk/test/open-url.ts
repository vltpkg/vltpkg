import t from 'tap'
import type { Test } from 'tap'

const mockOpenUrl = async (
  t: Test,
  urlOpen: (url: string) => Promise<void>,
) => {
  const messages: string[] = []
  const { openUrl } = await t.mockImport<
    typeof import('../src/open-url.ts')
  >('../src/open-url.ts', {
    '@vltpkg/url-open': { urlOpen },
    '../src/output.ts': {
      stderr: (...args: unknown[]) => {
        messages.push(String(args[0]))
      },
    },
  })
  return { openUrl, messages }
}

t.test('opens the url', async t => {
  const opened: string[] = []
  const { openUrl, messages } = await mockOpenUrl(t, async url => {
    opened.push(url)
  })
  await openUrl('https://example.com/')
  t.strictSame(opened, ['https://example.com/'])
  t.strictSame(messages, [])
})

t.test('opener failure does not throw', async t => {
  const { openUrl, messages } = await mockOpenUrl(t, async () => {
    throw new Error('command failed')
  })
  await openUrl('https://example.com/')
  t.strictSame(messages, [
    'Could not open a browser. Please open https://example.com/ manually.',
  ])
})
