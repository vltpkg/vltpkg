@ECHO off
SETLOCAL
SET "ROOT_DIR=%~dp0..\..\.."
IF NOT EXIST "%ROOT_DIR%\.build-bundle\vlrx.js" (
  pushd "%ROOT_DIR%"
  vlx vlt-build --bins=vlrx --outdir=".build-bundle" bundle > NUL 2>&1
  popd
)
SET "NODE_OPTIONS=--no-warnings --enable-source-maps"
node "%ROOT_DIR%\.build-bundle\vlrx.js" %*
