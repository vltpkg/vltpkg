// node script.js <parent|child> <fn> <cwd> <projectRoot> [<event>] [args...]
// event and args only relevant for run/runFG

import { delimiter, isAbsolute, relative } from 'path'
import {
  exec,
  execFG,
  run,
  runExec,
  runExecFG,
  runFG,
} from '../../../src/index.ts'
const node =
  process.execPath.includes(' ') ?
    '"' + process.execPath + '"'
  : process.execPath

process.env.NO_COLOR = '1'
process.env.FORCE_COLOR = '0'

const main = (args: string[]) => {
  switch (args[0]) {
    case 'parent':
      return parent(args.slice(1))
    case 'child':
      return child(args.slice(1))
    default:
      throw new Error('first arg must be "parent" or "child"')
  }
}

const parent = (args: string[]) => {
  switch (args[0]) {
    case 'runExec':
      return runExecParent(args.slice(1))
    case 'runExecFG':
      return runExecFGParent(args.slice(1))
    case 'exec':
      return execParent(args.slice(1))
    case 'execFG':
      return execFGParent(args.slice(1))
    case 'run':
      return runParent(args.slice(1))
    case 'runFG':
      return runFGParent(args.slice(1))
    default:
      throw new Error(
        'second arg must be exec, run, runExec, execFG, runFG, or runExecFG',
      )
  }
}

const getDirs = (args: string[]): [string, string] => {
  const [cwd, projectRoot] = args
  if (!cwd || !projectRoot) {
    throw new Error('must supply cwd and projectRoot in argv')
  }
  return [cwd, projectRoot]
}

const runExecParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const arg0 = args[2] ?? node
  const result = await runExec({
    arg0,
    args: [
      import.meta.filename,
      'child',
      'runExec',
      cwd,
      projectRoot,
      ...args.slice(3),
    ],
    cwd,
    projectRoot,
  })
  console.log(
    JSON.stringify({
      ...result,
      stdout: JSON.parse(result.stdout),
    }),
  )
}

const runExecFGParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const arg0 = args[2] ?? node
  // manually make it a JSON array, since the child shares stdout
  console.log('[')
  const result = await runExecFG({
    arg0,
    args: [
      import.meta.filename,
      'child',
      'runExecFG',
      cwd,
      projectRoot,
      ...args.slice(3),
    ],
    cwd,
    projectRoot,
  })
  console.log(',' + JSON.stringify(result) + ']')
}

const execParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const result = await exec({
    arg0: node,
    args: [
      import.meta.filename,
      'child',
      'exec',
      cwd,
      projectRoot,
      ...args.slice(2),
    ],
    cwd,
    projectRoot,
  })
  console.log(
    JSON.stringify({
      ...result,
      stdout: JSON.parse(result.stdout),
    }),
  )
}

const execFGParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  // manually make it a JSON array, since the child shares stdout
  console.log('[')
  const result = await execFG({
    arg0: node,
    args: [
      import.meta.filename,
      'child',
      'execFG',
      cwd,
      projectRoot,
      ...args.slice(2),
    ],
    cwd,
    projectRoot,
  })
  console.log(',' + JSON.stringify(result) + ']')
}

const runParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const arg0 = args[2]
  if (!arg0) throw new Error('must supply event on argv')
  const result = await run({
    arg0,
    args: args.slice(3),
    cwd,
    projectRoot,
    acceptFail: arg0.includes('fail'),
    ignoreMissing: arg0.includes('ignoremissing'),
  })
  console.log(
    JSON.stringify({
      ...result,
      stdout:
        arg0.includes('ignoremissing') ? '' : (
          JSON.parse(result.stdout)
        ),
    }),
  )
}
const runFGParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const arg0 = args[2]
  if (!arg0) throw new Error('must supply event on argv')
  // manually make it a JSON array, since the child shares stdout
  console.log('[')
  const result = await runFG({
    arg0,
    args: args.slice(3),
    cwd,
    projectRoot,
    acceptFail: arg0.includes('fail'),
    ignoreMissing: arg0.includes('ignoremissing'),
  })
  if (arg0.includes('ignoremissing')) console.log('{}')
  console.log(',' + JSON.stringify(result) + ']')
}

const child = async (args: string[]) => {
  switch (args[0]) {
    case 'exec':
      return execChild(args.slice(1))
    case 'execFG':
      return execFGChild(args.slice(1))
    case 'run':
      return runChild(args.slice(1))
    case 'runFG':
      return runFGChild(args.slice(1))
    case 'runExec':
      return runExecChild(args.slice(1))
    case 'runExecFG':
      return runExecFGChild(args.slice(1))
    default:
      throw new Error(
        'second arg must be exec, run, runExec, execFG, runFG, or runExecFG',
      )
  }
}

const childMethod = async (fn: string, args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  console.log(
    JSON.stringify({
      fn,
      args,
      cwd,
      projectRoot,
      env: Object.fromEntries(
        Object.entries(process.env).filter(([k]) =>
          /^(npm|VLT)_/i.test(k),
        ),
      ),
      path: [
        ...new Set(
          (process.env.PATH ?? '')
            .split(delimiter)
            .map(p => relative(projectRoot, p).replace(/\\/g, '/'))
            .filter(p => !p.startsWith('..') && !isAbsolute(p)),
        ),
      ],
    }),
  )
}

const execChild = async (args: string[]) => childMethod('exec', args)
const execFGChild = async (args: string[]) =>
  childMethod('execFG', args)
const runChild = async (args: string[]) => childMethod('run', args)
const runFGChild = async (args: string[]) =>
  childMethod('runFG', args)
const runExecChild = async (args: string[]) =>
  childMethod('runExec', args)
const runExecFGChild = async (args: string[]) =>
  childMethod('runExecFG', args)

void main(process.argv.slice(2))
