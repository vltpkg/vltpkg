import { Scalar } from '@scalar/hono-api-reference'
import { URL, SCALAR_API_CONFIG } from '../../config.ts'

export const getDocs = Scalar(async () => {
  const api = await fetch(`${URL}/-/api`)
  const result = await api.json()
  const options = SCALAR_API_CONFIG
  options.spec.content = { ...options.spec.content, ...result }
  return options
})
