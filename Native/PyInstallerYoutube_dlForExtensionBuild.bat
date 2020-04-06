@echo off
cd /d %~dp0

py -3-64 -m PyInstaller Youtube_dlForExtension.py --onedir --onefile  --clean --noconsole
py -3-64 -m PyInstaller Youtube_dlForExtensionUpdater.py --onedir  --onefile --clean --noconsole
pause