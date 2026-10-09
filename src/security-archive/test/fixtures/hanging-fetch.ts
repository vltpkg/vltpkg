/** fetch mock that never settles until aborted */
export const hangingFetch = async (
  _url: unknown,
  init?: RequestInit,
): Promise<Response> =>
  new Promise<Response>((_res, rej) => {
    // keeps the event loop alive, as a real pending socket would
    const keep = setInterval(() => {}, 1000)
    init?.signal?.addEventListener('abort', () => {
      clearInterval(keep)
      rej(init.signal?.reason as Error)
    })
  })
