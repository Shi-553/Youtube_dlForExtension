powershell.exe -command start-process 'cmd' '/C reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla\NativeMessagingHosts\Youtube_dlForExtension" /d "%~dp0Youtube_dlForExtension.json" /f "&" pause'  -Verb runas