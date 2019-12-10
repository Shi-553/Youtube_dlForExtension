@echo off
if exist Youtube_dlForExtension.py(
  call python Youtube_dlForExtension.py
)else(
  if exist Youtube_dlForExtension.exe(
    call python Youtube_dlForExtension.exe
  )
)

pause