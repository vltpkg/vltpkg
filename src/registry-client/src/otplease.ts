import { error } from '@vltpkg/error-cause'
import type { Dispatcher } from 'undici'
import type {
  RegistryClient,
  RegistryClientRequestOptions,
} from './index.ts'
import { isWebAuthChallenge } from './web-auth-challenge.ts'

import { urlOpen } from '@vltpkg/url-open'
import { createInterface } from 'node:readline/promises'

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
    const challenge = await response.body.json()
    if (isWebAuthChallenge(challenge)) {
      return {
        ...options,
        otp: (await client.webAuthOpener(challenge)).token,
      }
    } else {
      const { 'npm-notice': npmNotice } = response.headers
      if (npmNotice) {
        const n = String(npmNotice)
        const match = otpChallengeNotice.exec(n) as
          | null
          | [string, string]
        if (match) {
          void urlOpen(match[1])
          const otp = await createInterface({
            input: process.stdin,
            output: process.stdout,
          }).question(n)
          return { ...options, otp }
        }
      }
      throw error('Unrecognized OTP authentication challenge', {
        response,
      })
    }
  }

  if (wwwAuth.size) {
    throw error('Unknown authentication challenge', { response })
  }

  // see if the body is prompting for otp
  const text = await response.body.text()
  if (text.toLowerCase().includes('one-time pass')) {
    const otp = await createInterface({
      input: process.stdin,
      output: process.stdout,
    }).question(text)
    return { ...options, otp }
  }
}
