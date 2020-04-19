@echo off
cd /d %~dp0


py -3-64 -m PyInstaller Youtube_dlForExtension.py --onedir --onefile  --clean --noconsole --distpath .\dist_pyinstaller
if %ERRORLEVEL% neq 0 (
pause
)