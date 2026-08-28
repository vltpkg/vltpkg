import type { TransportResponse } from './transport.ts'
import { error } from '@vltpkg/error-cause'
import type {
  RegistryClient,
  RegistryClientRequestOptions,
} from './index.ts'
import { question } from './prompt.ts'
import { getWebAuthChallenge } from './web-auth-challenge.ts'
import { urlOpen } from '@vltpkg/url-open'
import { gunzipSync } from 'node:zlib'

// eslint-disable-next-line no-console
const log = (msg: string) => console.error(msg)

const otpChallengeNotice =
  /^Open ([^ ]+) to use your security key for authentication or enter OTP from your authenticator app/i

const responseBodyText = async (
  response: TransportResponse,
): Promise<string> => {
  const contentEncoding = String(
    response.headers['content-encoding'] ?? '',
  )
  if (/\bgzip\b/i.test(contentEncoding)) {
    return gunzipSync(await response.body.arrayBuffer()).toString()
  }
  return await response.body.text()
}

export type OtpResult =
  | { retry: RegistryClientRequestOptions }
  | { bodyConsumed: string }
  | undefined

export const otplease = async (
  client: RegistryClient,
  options: RegistryClientRequestOptions,
  response: TransportResponse,
): Promise<OtpResult> => {
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
      await responseBodyText(response)
        .then(text => JSON.parse(text) as unknown)
        .catch(() => null),
    )
    if (challenge) {
      return {
        retry: {
          ...options,
          otp: (await client.webAuthOpener(challenge)).token,
        },
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
          retry: {
            ...options,
            otp: await question('OTP: '),
          },
        }
      }
    }

    throw error('Unrecognized OTP authentication challenge', {
      response,
    })
  }

  if (wwwAuth.has('bearer')) {
    throw error(
      'Missing or invalid authentication token. Run `vlt login` or `vlt token add` to authenticate.',
      { response },
    )
  }

  if (wwwAuth.size) {
    throw error('Unknown authentication challenge', { response })
  }

  // Consume the body to check if it's prompting for OTP.
  // We must return the consumed text so the caller doesn't try to
  // re-read from the already-drained stream.
  const text = await responseBodyText(response).catch(() => '')
  if (text.toLowerCase().includes('one-time pass')) {
    return {
      retry: {
        ...options,
        otp: await question(text),
      },
    }
  }
  return { bodyConsumed: text }
}
