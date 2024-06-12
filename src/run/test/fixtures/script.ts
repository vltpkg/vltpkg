// node script.js <parent|child> <fn> <cwd> <projectRoot> [<event>] [args...]
// event and args only relevant for run/runFG

import { delimiter, isAbsolute, relative } from 'path'
import { fileURLToPath } from 'url'
import { exec, execFG, run, runFG } from '../../dist/esm/index.js'
const __filename = fileURLToPath(import.meta.url)
const node =
  / /.test(process.execPath) ?
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
        'second arg must be exec, run, execFG, or runFG',
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

const execParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const result = await exec({
    command: node,
    args: [
      __filename,
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
    command: node,
    args: [
      __filename,
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
  const event = args[2]
  if (!event) throw new Error('must supply event on argv')
  const result = await run({
    event,
    args: args.slice(3),
    cwd,
    projectRoot,
    acceptFail: /fail/.test(event),
    ignoreMissing: /ignoremissing/.test(event),
  })
  console.log(
    JSON.stringify({
      ...result,
      stdout: /ignoremissing/.test(event) ? '' : JSON.parse(result.stdout),
    }),
  )
}
const runFGParent = async (args: string[]) => {
  const [cwd, projectRoot] = getDirs(args)
  const event = args[2]
  if (!event) throw new Error('must supply event on argv')
  // manually make it a JSON array, since the child shares stdout
  console.log('[')
  const result = await runFG({
    event,
    args: args.slice(3),
    cwd,
    projectRoot,
    acceptFail: /fail/.test(event),
    ignoreMissing: /ignoremissing/.test(event),
  })
  if (/ignoremissing/.test(event)) console.log('{}')
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
    default:
      throw new Error(
        'second arg must be exec, run, execFG, or runFG',
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
      path: (process.env.PATH ?? '')
        .split(delimiter)
        .map(p => relative(projectRoot, p).replace(/\\/g, '/'))
        .filter(p => !p.startsWith('..') && !isAbsolute(p)),
    }),
  )
}

const execChild = async (args: string[]) => childMethod('exec', args)
const execFGChild = async (args: string[]) =>
  childMethod('execFG', args)
const runChild = async (args: string[]) => childMethod('run', args)
const runFGChild = async (args: string[]) =>
  childMethod('runFG', args)

main(process.argv.slice(2))
