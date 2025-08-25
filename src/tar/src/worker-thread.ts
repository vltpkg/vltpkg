import { unpack } from './unpack.js'

export interface WorkerInput {
  tarData: Buffer
  target: string
}

// Worker thread handler function
export default async function unpackWorker({ tarData, target }: WorkerInput): Promise<void> {
  await unpack(tarData, target)
}