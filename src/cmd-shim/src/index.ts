// On windows, create a .cmd file.
// Read the #! in the file to see what it uses.  The vast majority
// of the time, this will be either:
// "#!/usr/bin/env <prog> <args...>"
// or:
// "#!<prog> <args...>"
//
// Write a binroot/pkg.bin + ".cmd" file that has this line in it:
// @<prog> <args...> %dp0%<target> %*

import {
  chmod,
  mkdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises'

import { error } from '@vltpkg/error-cause'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { dirname, relative } from 'node:path'
import { convertToSetCommands } from './to-batch-syntax.ts'
export {
  findCmdShim,
  findCmdShimIfExists,
  readCmdShim,
  readCmdShimIfExists,
} from './read.ts'

const shebangExpr =
  /^#!\s*(?:\/usr\/bin\/env\s+(?:-S\s+)?((?:[^ \t=]+=[^ \t=]+\s+)*))?([^ \t]+)(.*)$/

export const cmdShimIfExists = async (
  from: string,
  to: string,
  remover: RollbackRemove,
) => {
  try {
    await stat(from)
  } catch {
    return
  }
  await writeShim(from, to, remover)
}

export const cmdShim = async (
  from: string,
  to: string,
  remover: RollbackRemove,
) => {
  try {
    await stat(from)
    await writeShim(from, to, remover)
  } catch (er) {
    throw error('Could not shim to executable file', {
      path: from,
      target: to,
      cause: er,
    })
  }
}

const writeShim = async (
  from: string,
  to: string,
  remover: RollbackRemove,
) => {
  await Promise.all([
    remover.rm(to),
    remover.rm(to + '.cmd'),
    remover.rm(to + '.ps1'),
    remover.rm(to + '.pwsh'),
  ])
  // make a cmd file and a sh script
  // First, check if the bin is a #! of some sort.
  // If not, then assume it's something that'll be compiled, or some other
  // sort of script, and just call it directly.
  await mkdir(dirname(to), { recursive: true })
  const data = await readFile(from, 'utf8').catch(() => '')
  if (!data) {
    return await writeShim_(from, to)
  }
  const firstLine = data.trim().split(/\r*\n/)[0]
  const shebang = firstLine?.match(shebangExpr) ?? undefined
  return writeShim_(
    from,
    to,
    shebang?.[2],
    shebang?.[3],
    shebang?.[1],
  )
}

const writeShim_ = async (
  from: string,
  to: string,
  prog?: string,
  args?: string,
  variables?: string,
) => {
  let shTarget = relative(dirname(to), from)
  let target = shTarget.split('/').join('\\')
  let longProg
  let shProg = prog?.split('\\').join('/')
  let shLongProg
  let pwshProg = shProg && `"${shProg}$exe"`
  let pwshLongProg
  shTarget = shTarget.split('\\').join('/')
  args = args || ''
  variables = variables || ''
  if (!prog) {
    prog = `"%dp0%\\${target}"`
    shProg = `"$basedir/${shTarget}"`
    pwshProg = shProg
    args = ''
    target = ''
    shTarget = ''
  } else {
    longProg = `"%dp0%\\${prog}.exe"`
    shLongProg = `"$basedir/${prog}"`
    pwshLongProg = `"$basedir/${prog}$exe"`
    target = `"%dp0%\\${target}"`
    shTarget = `"$basedir/${shTarget}"`
  }

  // Subroutine trick to fix https://github.com/npm/cmd-shim/issues/10
  // and https://github.com/npm/cli/issues/969
  const head =
    '@ECHO off\r\n' +
    'GOTO start\r\n' +
    ':find_dp0\r\n' +
    'SET dp0=%~dp0\r\n' +
    'EXIT /b\r\n' +
    ':start\r\n' +
    'SETLOCAL\r\n' +
    'CALL :find_dp0\r\n'

  let cmd
  if (longProg) {
    /* c8 ignore next */
    shLongProg = (shLongProg ?? '').trim()
    args = args.trim()
    const variablesBatch = convertToSetCommands(variables)
    cmd =
      `${head}${variablesBatch}\r\n` +
      `IF EXIST ${longProg} (\r\n` +
      `  SET "_prog=${longProg.replace(/(^")|("$)/g, '')}"\r\n` +
      ') ELSE (\r\n' +
      `  SET "_prog=${prog.replace(/(^")|("$)/g, '')}"\r\n` +
      '  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n' +
      ')\r\n' +
      '\r\n' +
      // prevent "Terminate Batch Job? (Y/n)" message
      // https://github.com/npm/cli/issues/969#issuecomment-737496588
      'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & ' +
      `"%_prog%" ${args} ${target} %*\r\n`
  } else {
    cmd = `${head}${prog} ${args} ${target} %*\r\n`
  }

  let sh =
    '#!/bin/sh\n' +
    `basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")\n` +
    '\n' +
    'case `uname` in\n' +
    '    *CYGWIN*|*MINGW*|*MSYS*)\n' +
    '        if command -v cygpath > /dev/null 2>&1; then\n' +
    '            basedir=`cygpath -w "$basedir"`\n' +
    '        fi\n' +
    '    ;;\n' +
    'esac\n' +
    '\n'

  if (shLongProg) {
    sh +=
      `if [ -x ${shLongProg} ]; then\n` +
      `  exec ${variables}${shLongProg} ${args} ${shTarget} "$@"\n` +
      'else \n' +
      `  exec ${variables}${shProg} ${args} ${shTarget} "$@"\n` +
      'fi\n'
  } else {
    sh += `exec ${shProg} ${args} ${shTarget} "$@"\n`
  }

  let pwsh =
    '#!/usr/bin/env pwsh\n' +
    '$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent\n' +
    '\n' +
    '$exe=""\n' +
    'if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {\n' +
    '  # Fix case when both the Windows and Linux builds of Node\n' +
    '  # are installed in the same directory\n' +
    '  $exe=".exe"\n' +
    '}\n'

  if (shLongProg) {
    pwsh +=
      '$ret=0\n' +
      `if (Test-Path ${pwshLongProg}) {\n` +
      '  # Support pipeline input\n' +
      '  if ($MyInvocation.ExpectingInput) {\n' +
      `    $input | & ${pwshLongProg} ${args} ${shTarget} $args\n` +
      '  } else {\n' +
      `    & ${pwshLongProg} ${args} ${shTarget} $args\n` +
      '  }\n' +
      '  $ret=$LASTEXITCODE\n' +
      '} else {\n' +
      '  # Support pipeline input\n' +
      '  if ($MyInvocation.ExpectingInput) {\n' +
      `    $input | & ${pwshProg} ${args} ${shTarget} $args\n` +
      '  } else {\n' +
      `    & ${pwshProg} ${args} ${shTarget} $args\n` +
      '  }\n' +
      '  $ret=$LASTEXITCODE\n' +
      '}\n' +
      'exit $ret\n'
  } else {
    pwsh +=
      '# Support pipeline input\n' +
      'if ($MyInvocation.ExpectingInput) {\n' +
      `  $input | & ${pwshProg} ${args} ${shTarget} $args\n` +
      '} else {\n' +
      `  & ${pwshProg} ${args} ${shTarget} $args\n` +
      '}\n' +
      'exit $LASTEXITCODE\n'
  }

  await Promise.all([
    writeFile(to + '.cmd', cmd, 'utf8'),
    writeFile(to + '.ps1', pwsh, 'utf8'),
    writeFile(to, sh, 'utf8'),
  ])
  await chmodShim(to)
}

const chmodShim = async (to: string) =>
  await Promise.all([
    chmod(to, 0o755),
    chmod(to + '.cmd', 0o755),
    chmod(to + '.ps1', 0o755),
  ])
