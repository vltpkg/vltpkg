/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts > TAP > env shebang > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
\\r
IF EXIST "%dp0%\\node.exe" (\\r
  SET "_prog=%dp0%\\node.exe"\\r
) ELSE (\\r
  SET "_prog=node"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\from.env" %*\\r

`

exports[`test/index.ts > TAP > env shebang > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe"  "$basedir/from.env" $args
  } else {
    & "$basedir/node$exe"  "$basedir/from.env" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe"  "$basedir/from.env" $args
  } else {
    & "node$exe"  "$basedir/from.env" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > env shebang > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/from.env" "$@"
else 
  exec node  "$basedir/from.env" "$@"
fi

`

exports[`test/index.ts > TAP > env shebang with args > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
\\r
IF EXIST "%dp0%\\node.exe" (\\r
  SET "_prog=%dp0%\\node.exe"\\r
) ELSE (\\r
  SET "_prog=node"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" --expose_gc "%dp0%\\from.env.args" %*\\r

`

exports[`test/index.ts > TAP > env shebang with args > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe" --expose_gc "$basedir/from.env.args" $args
  } else {
    & "$basedir/node$exe" --expose_gc "$basedir/from.env.args" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe" --expose_gc "$basedir/from.env.args" $args
  } else {
    & "node$exe" --expose_gc "$basedir/from.env.args" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > env shebang with args > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node" --expose_gc "$basedir/from.env.args" "$@"
else 
  exec node --expose_gc "$basedir/from.env.args" "$@"
fi

`

exports[`test/index.ts > TAP > env shebang with variables > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
@SET NODE_PATH=./lib:%NODE_PATH%\\r
\\r
IF EXIST "%dp0%\\node.exe" (\\r
  SET "_prog=%dp0%\\node.exe"\\r
) ELSE (\\r
  SET "_prog=node"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\from.env.variables" %*\\r

`

exports[`test/index.ts > TAP > env shebang with variables > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe"  "$basedir/from.env.variables" $args
  } else {
    & "$basedir/node$exe"  "$basedir/from.env.variables" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe"  "$basedir/from.env.variables" $args
  } else {
    & "node$exe"  "$basedir/from.env.variables" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > env shebang with variables > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir/node" ]; then
  exec NODE_PATH=./lib:$NODE_PATH "$basedir/node"  "$basedir/from.env.variables" "$@"
else 
  exec NODE_PATH=./lib:$NODE_PATH node  "$basedir/from.env.variables" "$@"
fi

`

exports[`test/index.ts > TAP > explicit shebang > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
\\r
IF EXIST "%dp0%\\/usr/bin/sh.exe" (\\r
  SET "_prog=%dp0%\\/usr/bin/sh.exe"\\r
) ELSE (\\r
  SET "_prog=/usr/bin/sh"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\from.sh" %*\\r

`

exports[`test/index.ts > TAP > explicit shebang > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir//usr/bin/sh$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir//usr/bin/sh$exe"  "$basedir/from.sh" $args
  } else {
    & "$basedir//usr/bin/sh$exe"  "$basedir/from.sh" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "/usr/bin/sh$exe"  "$basedir/from.sh" $args
  } else {
    & "/usr/bin/sh$exe"  "$basedir/from.sh" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > explicit shebang > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir//usr/bin/sh" ]; then
  exec "$basedir//usr/bin/sh"  "$basedir/from.sh" "$@"
else 
  exec /usr/bin/sh  "$basedir/from.sh" "$@"
fi

`

exports[`test/index.ts > TAP > explicit shebang with args > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
\\r
IF EXIST "%dp0%\\/usr/bin/sh.exe" (\\r
  SET "_prog=%dp0%\\/usr/bin/sh.exe"\\r
) ELSE (\\r
  SET "_prog=/usr/bin/sh"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" -x "%dp0%\\from.sh.args" %*\\r

`

exports[`test/index.ts > TAP > explicit shebang with args > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir//usr/bin/sh$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir//usr/bin/sh$exe" -x "$basedir/from.sh.args" $args
  } else {
    & "$basedir//usr/bin/sh$exe" -x "$basedir/from.sh.args" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "/usr/bin/sh$exe" -x "$basedir/from.sh.args" $args
  } else {
    & "/usr/bin/sh$exe" -x "$basedir/from.sh.args" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > explicit shebang with args > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir//usr/bin/sh" ]; then
  exec "$basedir//usr/bin/sh" -x "$basedir/from.sh.args" "$@"
else 
  exec /usr/bin/sh -x "$basedir/from.sh.args" "$@"
fi

`

exports[`test/index.ts > TAP > if exists (it does exist) > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
"%dp0%\\from.exe"   %*\\r

`

exports[`test/index.ts > TAP > if exists (it does exist) > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
# Support pipeline input
if ($MyInvocation.ExpectingInput) {
  $input | & "$basedir/from.exe"   $args
} else {
  & "$basedir/from.exe"   $args
}
exit $LASTEXITCODE

`

exports[`test/index.ts > TAP > if exists (it does exist) > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

exec "$basedir/from.exe"   "$@"

`

exports[`test/index.ts > TAP > just proceed if reading fails > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
"%dp0%\\"   %*\\r

`

exports[`test/index.ts > TAP > just proceed if reading fails > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
# Support pipeline input
if ($MyInvocation.ExpectingInput) {
  $input | & "$basedir/"   $args
} else {
  & "$basedir/"   $args
}
exit $LASTEXITCODE

`

exports[`test/index.ts > TAP > just proceed if reading fails > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

exec "$basedir/"   "$@"

`

exports[`test/index.ts > TAP > multiple variables > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
@SET key=value\\r
@SET key2=value2\\r
\\r
IF EXIST "%dp0%\\node.exe" (\\r
  SET "_prog=%dp0%\\node.exe"\\r
) ELSE (\\r
  SET "_prog=node"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" --flag-one --flag-two "%dp0%\\from.env.multiple.variables" %*\\r

`

exports[`test/index.ts > TAP > multiple variables > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe" --flag-one --flag-two "$basedir/from.env.multiple.variables" $args
  } else {
    & "$basedir/node$exe" --flag-one --flag-two "$basedir/from.env.multiple.variables" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe" --flag-one --flag-two "$basedir/from.env.multiple.variables" $args
  } else {
    & "node$exe" --flag-one --flag-two "$basedir/from.env.multiple.variables" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > multiple variables > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir/node" ]; then
  exec key=value key2=value2 "$basedir/node" --flag-one --flag-two "$basedir/from.env.multiple.variables" "$@"
else 
  exec key=value key2=value2 node --flag-one --flag-two "$basedir/from.env.multiple.variables" "$@"
fi

`

exports[`test/index.ts > TAP > no shebang > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
"%dp0%\\from.exe"   %*\\r

`

exports[`test/index.ts > TAP > no shebang > ps1 1`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
# Support pipeline input
if ($MyInvocation.ExpectingInput) {
  $input | & "$basedir/from.exe"   $args
} else {
  & "$basedir/from.exe"   $args
}
exit $LASTEXITCODE

`

exports[`test/index.ts > TAP > no shebang > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

exec "$basedir/from.exe"   "$@"

`

exports[`test/index.ts > TAP > removed by env shebang 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/env.shim",
  "{CWD}/.tap/fixtures/test-index.ts/env.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/env.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/env.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by env shebang with args 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/env.args.shim",
  "{CWD}/.tap/fixtures/test-index.ts/env.args.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/env.args.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/env.args.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by env shebang with variables 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/env.variables.shim",
  "{CWD}/.tap/fixtures/test-index.ts/env.variables.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/env.variables.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/env.variables.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by explicit shebang 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/sh.shim",
  "{CWD}/.tap/fixtures/test-index.ts/sh.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/sh.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/sh.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by explicit shebang with args 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/sh.args.shim",
  "{CWD}/.tap/fixtures/test-index.ts/sh.args.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/sh.args.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/sh.args.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by fails if from doesnt exist 1`] = `
Array []
`

exports[`test/index.ts > TAP > removed by fails if mkdir fails 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/from.env/a/b/c",
  "{CWD}/.tap/fixtures/test-index.ts/from.env/a/b/c.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/from.env/a/b/c.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/from.env/a/b/c.pwsh",
]
`

exports[`test/index.ts > TAP > removed by fails if to is a dir 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts",
  "{CWD}/.tap/fixtures/test-index.ts.cmd",
  "{CWD}/.tap/fixtures/test-index.ts.ps1",
  "{CWD}/.tap/fixtures/test-index.ts.pwsh",
]
`

exports[`test/index.ts > TAP > removed by if exists (it does exist) 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim",
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by if exists (it does not exist) 1`] = `
Array []
`

exports[`test/index.ts > TAP > removed by just proceed if reading fails 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/env.shim",
  "{CWD}/.tap/fixtures/test-index.ts/env.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/env.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/env.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by multiple variables 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/sh.multiple.shim",
  "{CWD}/.tap/fixtures/test-index.ts/sh.multiple.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/sh.multiple.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/sh.multiple.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by no shebang 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim",
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/exe.shim.pwsh",
]
`

exports[`test/index.ts > TAP > removed by shebang with env -S 1`] = `
Array [
  "{CWD}/.tap/fixtures/test-index.ts/sh.env.S.shim",
  "{CWD}/.tap/fixtures/test-index.ts/sh.env.S.shim.cmd",
  "{CWD}/.tap/fixtures/test-index.ts/sh.env.S.shim.ps1",
  "{CWD}/.tap/fixtures/test-index.ts/sh.env.S.shim.pwsh",
]
`

exports[`test/index.ts > TAP > shebang with env -S > cmd 1`] = `
@ECHO off\\r
GOTO start\\r
:find_dp0\\r
SET dp0=%~dp0\\r
EXIT /b\\r
:start\\r
SETLOCAL\\r
CALL :find_dp0\\r
\\r
IF EXIST "%dp0%\\node.exe" (\\r
  SET "_prog=%dp0%\\node.exe"\\r
) ELSE (\\r
  SET "_prog=node"\\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\\r
)\\r
\\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" --expose_gc "%dp0%\\from.env.S" %*\\r

`

exports[`test/index.ts > TAP > shebang with env -S > cmd 2`] = `
#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "$basedir/node$exe" --expose_gc "$basedir/from.env.S" $args
  } else {
    & "$basedir/node$exe" --expose_gc "$basedir/from.env.S" $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & "node$exe" --expose_gc "$basedir/from.env.S" $args
  } else {
    & "node$exe" --expose_gc "$basedir/from.env.S" $args
  }
  $ret=$LASTEXITCODE
}
exit $ret

`

exports[`test/index.ts > TAP > shebang with env -S > shell 1`] = `
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node" --expose_gc "$basedir/from.env.S" "$@"
else 
  exec node --expose_gc "$basedir/from.env.S" "$@"
fi

`
