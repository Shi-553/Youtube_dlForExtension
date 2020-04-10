@echo off
cd /d %~dp0

py setup.py py2exe Youtube_dlForExtension.py 2 c
pause