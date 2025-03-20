import { error } from '@vltpkg/error-cause'

export type Streams = {
  stdin: NodeJS.ReadableStream & { setRawMode(mode: boolean): void }
  stdout: NodeJS.WritableStream
}

export const readPassword = async (
  prompt: string,
  { stdin, stdout }: Streams = process,
): Promise<string> => {
  let input = ''
  stdout.write(prompt)
  stdin.setRawMode(true)
  await new Promise<void>((res, rej) => {
    stdin.on('data', (c: Buffer) => {
      // backspace
      if (c.length === 1 && c[0] === 0x7f) {
        input = input.substring(0, input.length - 1)
        stdout.write('\x1b[1D \x1b[1D')
        return
      }

      input += String(c)
      if (/\r|\n|\x04|\x03/.test(input)) {
        input = input.replace(/(\r|\n|\x04|\x03)/g, '')
        stdin.setRawMode(false)
        stdin.pause()
        // x03 === ^C
        if (c[c.length - 1] === 3) {
          rej(error('canceled', { signal: 'SIGINT' }))
        } else res()
      } else {
        stdout.write('*'.repeat(c.length))
      }
    })
  })
  return input
}
