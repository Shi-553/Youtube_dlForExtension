@echo off
cd /d %~dp0

py -3-32 setup_py2exe.py py2exe Youtube_dlForExtension.py 2 c
pause