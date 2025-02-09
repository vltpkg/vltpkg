import t from 'tap'
import { type Dispatcher } from 'undici'
import { type RegistryClient } from '../src/index.ts'
import { type WebAuthChallenge } from '../src/web-auth-challenge.ts'

const urlsOpened: string[] = []
const mockUrlOpen = async (url: string) => {
  urlsOpened.push(url)
  return {}
}

const doneUrlsOpened: string[] = []
t.beforeEach(() => {
  doneUrlsOpened.length = 0
  urlsOpened.length = 0
})

class MockInterface {
  async question(text: string) {
    return text
  }
}

const mockClient = {
  async webAuthOpener({ doneUrl, loginUrl }: WebAuthChallenge) {
    urlsOpened.push(loginUrl)
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
        json: () => ({}),
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
      json: () => ({
        loginUrl: 'login url',
        doneUrl: 'done url',
      }),
    },
  } as unknown as Dispatcher.ResponseData)
  t.strictSame(doneUrlsOpened, ['done url'])
  t.strictSame(urlsOpened, ['login url'])
  t.match(result, { otp: 'token' })
})

t.test('npm-notice prompting for OTP', async t => {
  const result = await otplease(mockClient, {}, {
    headers: {
      'www-authenticate': 'otp',
      'npm-notice':
        'Open {login-url} to use your security key for authentication or enter OTP from your authenticator app',
    },
    body: {
      json: () => ({}),
    },
  } as unknown as Dispatcher.ResponseData)
  t.strictSame(doneUrlsOpened, [])
  t.strictSame(urlsOpened, ['{login-url}'])
  t.strictSame(result, {
    otp: 'Open {login-url} to use your security key for authentication or enter OTP from your authenticator app',
  })
})

t.test('body prompting for OTP', async t => {
  const resp = {
    headers: {},
    body: {
      text: () => 'oNe-TiME pAsS',
    },
  } as unknown as Dispatcher.ResponseData
  const opts = await otplease(mockClient, {}, resp)
  t.equal(opts?.otp, 'oNe-TiME pAsS')
})
