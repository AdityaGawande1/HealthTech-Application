@echo off
setlocal
set "NODE_HOME=C:\Program Files\nodejs"
if not exist "%NODE_HOME%\npm.cmd" (
  echo Node.js was not found at "%NODE_HOME%".
  echo Install Node.js LTS, then run this launcher again.
  exit /b 1
)
set "PATH=%NODE_HOME%;%PATH%"
cd /d "%~dp0"
call "%NODE_HOME%\npm.cmd" run dev
