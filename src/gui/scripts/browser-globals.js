import { afterAll, beforeAll } from 'vitest'

beforeAll(() => {
  global.window.scrollTo = () => {}

  // Fix for React Router v7 AbortSignal compatibility issue with Node.js/Undici
  // This ensures AbortSignal is properly polyfilled in the test environment
  if (!global.AbortController) {
    global.AbortController = class AbortController {
      constructor() {
        this.signal = new AbortSignal()
      }
      abort() {
        if (this.signal.aborted) return
        this.signal.aborted = true
        this.signal.dispatchEvent(new Event('abort'))
      }
    }
  }

  if (!global.AbortSignal) {
    global.AbortSignal = class AbortSignal extends EventTarget {
      constructor() {
        super()
        this.aborted = false
      }
    }
  }
})

afterAll(() => {
  delete global.window.scrollTo
})
