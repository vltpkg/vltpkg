import { Scalar } from '@scalar/hono-api-reference'
import { URL, SCALAR_API_CONFIG } from '../../config.ts'

export const getDocs = Scalar(async () => {
  const api = await fetch(`${URL}/-/api`)
  const result = await api.json()

  // Merge dynamic API spec with static config, with static config taking precedence
  const options = {
    // Start with static config to preserve ALL your settings
    ...SCALAR_API_CONFIG,
    spec: {
      ...SCALAR_API_CONFIG.spec,
      content: {
        // Dynamic API content first
        ...result,
        // Static config overrides any conflicts (info, servers, security, etc.)
        ...SCALAR_API_CONFIG.spec.content,
      },
    },
  }

  return options
})
