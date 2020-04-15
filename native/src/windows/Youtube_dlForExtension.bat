@echo off
cd /d %~dp0

if exist "Youtube_dlForExtension.py" (
  call python "Youtube_dlForExtension.py"
) else (
  if exist "Youtube_dlForExtension.exe" (
    call "Youtube_dlForExtension.exe"
  )
)