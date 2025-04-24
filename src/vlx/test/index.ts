import t from 'tap'

import { vlxDelete } from '../src/delete.ts'
import * as vlx from '../src/index.ts'
import { vlxInfo } from '../src/info.ts'
import { vlxInstall } from '../src/install.ts'
import { vlxList } from '../src/list.ts'
import { vlxResolve } from '../src/resolve.ts'

import type { PromptFn, VlxInfo, VlxOptions } from '../src/index.ts'

const typeChecks = () => {
  //@ts-expect-error
  const x: VlxOptions = undefined
  //@ts-expect-error
  const z: VlxInfo = undefined
  //@ts-expect-error
  const y: PromptFn = () => {}
  x
  y
  z
}
typeChecks

t.strictSame(
  vlx,
  Object.assign(Object.create(null), {
    info: vlxInfo,
    install: vlxInstall,
    resolve: vlxResolve,
    list: vlxList,
    delete: vlxDelete,
  }),
)
