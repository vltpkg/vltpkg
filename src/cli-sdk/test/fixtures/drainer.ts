import type { Test } from 'tap'

// drains the clients handed to it before t's fixture is removed: call
// before t.testdir(), tap runs EOF hooks in registration order
export const drainer = (t: Test) => {
  const clients: { drain(): Promise<void> }[] = []
  t.teardown(async () => {
    for (const c of clients) await c.drain()
  })
  return <C extends { drain(): Promise<void> }>(c: C): C => {
    clients.push(c)
    return c
  }
}
