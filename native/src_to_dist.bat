@echo off
cd /d %~dp0

call py src_to_dist.py
pause