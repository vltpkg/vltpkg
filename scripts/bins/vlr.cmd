@ECHO off
SETLOCAL
SET "ROOT_DIR=%~dp0..\.."
SET "NODE_OPTIONS=--no-warnings --enable-source-maps --experimental-strip-types"
SET "__VLT_INTERNAL_LIVE_RELOAD=1"
node "%ROOT_DIR%\infra\build\src\bins\vlr.ts" %*
