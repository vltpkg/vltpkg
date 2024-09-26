import { resolve } from 'node:path'
export const __CODE_SPLIT_SCRIPT_NAME = resolve(
  import.meta.dirname,
  '{{PATH}}',
)
