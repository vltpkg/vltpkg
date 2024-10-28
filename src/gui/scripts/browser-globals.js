import { afterAll, beforeAll } from 'vitest'
beforeAll(() => {
  global.window.scrollTo = () => {}
})
afterAll(() => {
  delete global.window.scrollTo
})
