@echo off
cd /d %~dp0

call py -3-32 setup_py2exe.py py2exe Youtube_dlForExtension.py 2 c
if %ERRORLEVEL% neq 0 (
pause
)