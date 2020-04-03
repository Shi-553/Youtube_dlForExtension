import subprocess
import ctypes
import os

def isAdmin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def runAdmin(path,hideConsole=True):
    (base,ext) =os.path.splitext(path)

    if ext==".py":
        parameters=path
        file="pythonw" if hideConsole else "python"
    else:
        parameters=""
        file=path

    ctypes.windll.shell32.ShellExecuteW(None, "runas", file,parameters, None, 1)
   # subprocess.Popen("powershell.exe -command start-process {}  '{}' -Verb runas".format(s,path))