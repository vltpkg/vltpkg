import { delimiter } from 'node:path'
import t from 'tap'
import { addToPATH } from '../src/add-to-path.ts'

const env: NodeJS.Process['env'] = { ...process.env }
env.PATH = String(env.PATH) + delimiter + String(env.PATH)
const unique = [...new Set(env.PATH.split(delimiter))].join(delimiter)
t.intercept(process, 'env', { value: env })
const path = t.intercept(env, 'PATH')

addToPATH(t.testdirName)
t.match(path(), [
  { type: 'get', success: true },
  { type: 'set', value: t.testdirName + delimiter + unique },
])

env.PATH = undefined
path()
addToPATH(t.testdirName)
t.match(path(), [
  { type: 'get', success: true },
  { type: 'set', value: t.testdirName },
])
