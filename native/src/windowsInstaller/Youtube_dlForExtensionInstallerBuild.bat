@echo off
cd /d %~dp0

py -3-32 -m PyInstaller Youtube_dlForExtensionInstaller.py -F --uac-admin -w --clean

if %ERRORLEVEL% neq 0 (
pause
)