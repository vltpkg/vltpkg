@ECHO off
SETLOCAL
SET "ROOT_DIR=%~dp0..\..\.."
IF NOT EXIST "%ROOT_DIR%\.build-compile\vlx.exe" (
  pushd "%ROOT_DIR%"
  vlx vlt-build --bins=vlx --outdir=".build-compile" compile > NUL 2>&1
  popd
)
"%ROOT_DIR%\.build-compile\vlx.exe" %*
