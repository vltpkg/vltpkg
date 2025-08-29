import { unpack } from './unpack.ts'

export interface UnpackTask {
  tarData: Uint8Array
  target: string
}
export default async function unpackWorker(
  task: UnpackTask,
): Promise<void> {
  const { tarData, target } = task

  // Call the unpack function with the Uint8Array
  await unpack(tarData, target)
}
