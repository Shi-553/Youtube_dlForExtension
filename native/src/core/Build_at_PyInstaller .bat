@echo off
cd /d %~dp0


py -3-32 -m PyInstaller Youtube_dlForExtension.py --onedir --onefile  --clean --noconsole --distpath .\dist_pyinstaller
rem py -3-32 -m PyInstaller Youtube_dlForExtensionUpdater.py --onedir --onefile  --clean --noconsole --distpath .\dist_pyinstaller
pause