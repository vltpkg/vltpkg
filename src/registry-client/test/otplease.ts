import t from 'tap'
import type { Dispatcher } from 'undici'
import type { RegistryClient } from '../src/index.ts'
import type { WebAuthChallenge } from '../src/web-auth-challenge.ts'

const logs: string[] = []
const log = (msg: string) => logs.push(msg)
t.intercept(console, 'error', { value: log })

const urlsOpened: string[] = []
const mockUrlOpen = async (url: string) => {
  urlsOpened.push(url)
  return {}
}

const doneUrlsOpened: string[] = []
t.beforeEach(() => {
  doneUrlsOpened.length = 0
  urlsOpened.length = 0
  logs.length = 0
})

class MockInterface {
  async question(text: string) {
    return text
  }
  close() {}
}

const mockClient = {
  async webAuthOpener({ doneUrl, authUrl }: WebAuthChallenge) {
    urlsOpened.push(authUrl)
    doneUrlsOpened.push(doneUrl)
    return { token: 'token' }
  },
} as unknown as RegistryClient

const { otplease } = await t.mockImport<
  typeof import('../src/otplease.ts')
>('../src/otplease.ts', {
  '@vltpkg/url-open': {
    urlOpen: mockUrlOpen,
  },
  'node:readline/promises': {
    createInterface() {
      return new MockInterface()
    },
  },
})

t.test('cannot auth if ipaddress rejected', async t => {
  await t.rejects(
    otplease(mockClient, {}, {
      headers: {
        'www-authenticate': 'ipaddress',
      },
    } as unknown as Dispatcher.ResponseData),
    {
      message: 'Authorization is not allowed from your ip address',
    },
  )
})

t.test('bearer www-authenticate prompts to log in', async t => {
  await t.rejects(
    otplease(mockClient, {}, {
      headers: {
        'www-authenticate': 'Bearer',
      },
    } as unknown as Dispatcher.ResponseData),
    {
      message:
        'Missing or invalid authentication token. Run `vlt login` or `vlt token add` to authenticate.',
    },
  )
})

t.test('unknown www-authenticate challenges', async t => {
  await t.rejects(
    otplease(mockClient, {}, {
      headers: {
        'www-authenticate': 'yolo',
      },
    } as unknown as Dispatcher.ResponseData),
    {
      message: 'Unknown authentication challenge',
    },
  )

  await t.rejects(
    otplease(mockClient, {}, {
      headers: {
        'www-authenticate': 'otp',
      },
      body: {
        json: async () => ({}),
      },
    } as unknown as Dispatcher.ResponseData),
    {
      message: 'Unrecognized OTP authentication challenge',
    },
  )
})

t.test('www-authenticate otp challenge', async t => {
  const result = await otplease(mockClient, {}, {
    headers: {
      'www-authenticate': 'otp',
    },
    body: {
      json: async () => ({
        loginUrl: 'login url',
        doneUrl: 'done url',
      }),
    },
  } as unknown as Dispatcher.ResponseData)
  t.strictSame(doneUrlsOpened, ['done url'])
  t.strictSame(urlsOpened, ['login url'])
  t.match(result, { retry: { otp: 'token' } })
})

t.test('npm-notice prompting for OTP', async t => {
  const result = await otplease(mockClient, {}, {
    headers: {
      'www-authenticate': 'otp',
      'npm-notice':
        'Open {login-url} to use your security key for authentication or enter OTP from your authenticator app',
    },
    body: {
      json: async () => ({}),
    },
  } as unknown as Dispatcher.ResponseData)
  t.strictSame(doneUrlsOpened, [])
  t.strictSame(urlsOpened, ['{login-url}'])
  t.strictSame(logs, [
    'Open {login-url} to use your security key for authentication or enter OTP from your authenticator app',
  ])
  t.strictSame(result, {
    retry: { otp: 'OTP: ' },
  })
})

t.test('body prompting for OTP', async t => {
  const resp = {
    headers: {},
    body: {
      text: async () => 'oNe-TiME pAsS',
    },
  } as unknown as Dispatcher.ResponseData
  const result = await otplease(mockClient, {}, resp)
  t.ok(result && 'retry' in result)
  if (result && 'retry' in result) {
    t.equal(result.retry.otp, 'oNe-TiME pAsS')
  }
})

t.test('non-OTP 401 returns consumed body', async t => {
  const resp = {
    headers: {},
    body: {
      text: async () => '{"error":"You must be logged in"}',
    },
  } as unknown as Dispatcher.ResponseData
  const result = await otplease(mockClient, {}, resp)
  t.ok(result && 'bodyConsumed' in result)
  if (result && 'bodyConsumed' in result) {
    t.equal(result.bodyConsumed, '{"error":"You must be logged in"}')
  }
})
