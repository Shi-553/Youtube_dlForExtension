cd /d %~dp0

py -3-32 -m PyInstaller Youtube_dlForExtensionInstaller.py -F --uac-admin -w --clean

pause