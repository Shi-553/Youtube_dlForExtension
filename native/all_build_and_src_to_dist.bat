@echo off
cd /d %~dp0
call ".\src\core\Build_at_py2exe.bat"
echo;
echo -------------------------------------------------------------------------------------
echo;
cd /d %~dp0
echo call ".\src\core\Build_at_PyInstaller.bat"
echo;
echo -------------------------------------------------------------------------------------
echo;
cd /d %~dp0
call ".\src\windows_installer\Youtube_dlForExtensionInstallerBuild.bat"
echo;
echo -------------------------------------------------------------------------------------
echo;
cd /d %~dp0
call py src_to_dist.py
echo;
pause