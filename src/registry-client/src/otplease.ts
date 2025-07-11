import { error } from '@vltpkg/error-cause'
import type { Dispatcher } from 'undici'
import type {
  RegistryClient,
  RegistryClientRequestOptions,
} from './index.ts'
import { getWebAuthChallenge } from './web-auth-challenge.ts'
import { urlOpen } from '@vltpkg/url-open'
import { createInterface } from 'node:readline/promises'

// eslint-disable-next-line no-console
const log = (msg: string) => console.error(msg)

const question = async (text: string): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = await rl.question(text)
  rl.close()
  return answer
}

const otpChallengeNotice =
  /^Open ([^ ]+) to use your security key for authentication or enter OTP from your authenticator app/i

export const otplease = async (
  client: RegistryClient,
  options: RegistryClientRequestOptions,
  response: Dispatcher.ResponseData,
): Promise<RegistryClientRequestOptions | undefined> => {
  const waHeader = String(response.headers['www-authenticate'] ?? '')
  const wwwAuth = new Set(
    waHeader ? waHeader.toLowerCase().split(/,\s*/) : [],
  )

  if (wwwAuth.has('ipaddress')) {
    throw error('Authorization is not allowed from your ip address', {
      response,
    })
  }

  if (wwwAuth.has('otp')) {
    // do a web auth opener to get otp token
    const challenge = getWebAuthChallenge(
      await response.body.json().catch(() => null),
    )
    if (challenge) {
      return {
        ...options,
        otp: (await client.webAuthOpener(challenge)).token,
      }
    }

    const { 'npm-notice': npmNotice } = response.headers
    if (npmNotice) {
      const notice = String(npmNotice)
      const match = otpChallengeNotice.exec(notice)
      if (match?.[1]) {
        await urlOpen(match[1])
        log(notice)
        return {
          ...options,
          otp: await question('OTP: '),
        }
      }
    }

    throw error('Unrecognized OTP authentication challenge', {
      response,
    })
  }

  if (wwwAuth.size) {
    throw error('Unknown authentication challenge', { response })
  }

  // see if the body is prompting for otp
  const text = await response.body.text().catch(() => '')
  if (text.toLowerCase().includes('one-time pass')) {
    return {
      ...options,
      otp: await question(text),
    }
  }

  throw error('Unknown authentication challenge', { response })
}
