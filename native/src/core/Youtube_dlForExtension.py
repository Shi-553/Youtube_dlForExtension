import os
from os import path
import sys
import json
import struct
import subprocess
import tkinter
from tkinter import filedialog
import re
from urllib import request
import platform
import traceback
import zipfile
import shutil
from io import BytesIO


#今このファイルがあるディレクトリの絶対パス
absDirectoryPath = path.normpath(path.abspath(path.dirname(sys.argv[0])))

#ファイル名
myFilename = path.basename(sys.argv[0])

pf = platform.system()

if pf == "Windows":
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
else:
    startupinfo = None


def printErr(str):
    print(str,file=sys.stderr)

# Python 3.x version
# Read a message from stdin and decode it.
def getMessage():
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        sys.exit(0)
    messageLength = struct.unpack("@I", rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode("utf-8")
    return json.loads(message)

# Encode a message for transmission,
# given its content.
def encodeMessage(messageContent):
    encodedContent = json.dumps(messageContent).encode("utf-8")
    encodedLength = struct.pack("@I", len(encodedContent))
    return {"length": encodedLength, "content": encodedContent}

# Send an encoded message to stdout
def sendMessage(encodedMessage):
    sys.stdout.buffer.write(encodedMessage["length"])
    sys.stdout.buffer.write(encodedMessage["content"])
    sys.stdout.buffer.flush()


#独自の方式(大嘘)でURLをファイルネームにする
def urlToFilename(url):
    return re.sub(r'[\\|/|:|?|.|"|<|>|\|]',"_",url)[:90]

#JSONファイルに書き出す
def writeJson(p,dictionary):
    
    #フォルダがないとき
    dir = path.join(absDirectoryPath, "JSONCache")

    if not path.isdir(dir):
        os.mkdir(dir)

    jsonString = json.dumps(dictionary)

    with open(p,"w", encoding="utf-8") as f:
        f.write(jsonString)


#JSONファイルを消す
def removeJson(receivedMessage):
    p = path.normpath(path.join(absDirectoryPath, "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"] + str(receivedMessage["tabId"]) + receivedMessage["key"]))))

    if not path.isfile(p):
        sendMessage(encodeMessage(None))
    else:
        os.remove(p)
        sendMessage(encodeMessage(True))
        


def isFoundYoutube_dl():
    for p in os.listdir(absDirectoryPath):
        if path.isfile(p) and path.splitext(path.basename(p))[0] == "youtube-dl":
            return True

    return False

def To_Youtube_dl(receivedMessage):
    receivedMessage["status"] = "started"
    #sendMessage(encodeMessage(receivedMessage))

    if not isFoundYoutube_dl():
        receivedMessage["command"] = receivedMessage["command"].replace("youtube-dl","python -m youtube_dl",1)

    #JSONがあればここ
    absPath = path.normpath(path.join(absDirectoryPath, "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"] + str(receivedMessage["tabId"]) + receivedMessage["key"]))))
    if "json" in receivedMessage:
        receivedMessage["command"] = receivedMessage["command"].replace("<JSONPATH>",absPath,1)
        writeJson(absPath,receivedMessage["json"])
            
   # sendMessage(encodeMessage(receivedMessage))

    #dirがあれば置き換えと存在確認
    if "dir" in receivedMessage:
        receivedMessage["dir"] = path.normpath(replaceUserProfile(receivedMessage["dir"]))

        if not path.isdir(receivedMessage["dir"]):
            receivedMessage["status"] = "DoesNotExistDirectory"
            sendMessage(encodeMessage(receivedMessage))
            return

    else:
        receivedMessage["dir"] = None

        
    if (("usePopen" in receivedMessage) and (receivedMessage["usePopen"])):
        receivedMessage["filePath"] = path.join(receivedMessage["dir"],receivedMessage["json"]["_filename"])

        #上書きできなかったらここに入る
        if(path.isfile(receivedMessage["filePath"])):
            if receivedMessage["overwrite"] == "Show dialog to select":
                receivedMessage["status"] = "AskOverwrite"
                sendMessage(encodeMessage(receivedMessage))
                receivedMessage["overwrite"] = askOverwriteSaveAsCancel(receivedMessage["dir"],receivedMessage["json"]["_filename"])
            
            if receivedMessage["overwrite"] == "Yes":
                os.remove(receivedMessage["filePath"])
                To_Youtube_dl(receivedMessage)
                receivedMessage["status"] = "Overwritten"
                sendMessage(encodeMessage(receivedMessage))
            
            elif receivedMessage["overwrite"] == "Save as":
                receivedMessage["status"] = "Save as"
                sendMessage(encodeMessage(receivedMessage))
                receivedMessage["overwrite"] = "Show dialog to select"
                receivedMessage["dir"] = directoryManager({"initialDir":receivedMessage["dir"]},True)

                if receivedMessage["dir"] == "":
                    receivedMessage["status"] = "NotOverwritten"
                    sendMessage(encodeMessage(receivedMessage))
                else:
                    To_Youtube_dl(receivedMessage)
        
            elif receivedMessage["overwrite"] == "No":
                receivedMessage["status"] = "NotOverwritten"
                sendMessage(encodeMessage(receivedMessage))
            
            return
    
    sendMessage(encodeMessage(receivedMessage))
    #送るところ本体
    try:
        if ("usePopen" in receivedMessage) and (receivedMessage["usePopen"]):
            proc = subprocess.Popen(receivedMessage["command"],
                                    cwd=receivedMessage["dir"],
                                    stdout = subprocess.PIPE,
                                    stderr = subprocess.STDOUT,
                                    startupinfo=startupinfo)
            
            receivedMessage["status"] = "Progress"
            for line in iter(proc.stdout.readline,b""):
                receivedMessage["stdout"] = line.rstrip().decode(sys.stdout.encoding,errors="ignore")
                sendMessage(encodeMessage(receivedMessage))

            proc.wait()

        else:
            proc = subprocess.run(receivedMessage["command"],
                                cwd=receivedMessage["dir"],
                                stdout = subprocess.PIPE,
                                stderr = subprocess.STDOUT,
                                startupinfo=startupinfo)

            if proc.stdout is not None :
                receivedMessage["stdout"] = proc.stdout.decode(sys.stdout.encoding,errors="ignore")
            else:
                receivedMessage["stdout"] = ""
            

        receivedMessage["status"] = "finishedDownload"
        receivedMessage["returncode"] = proc.returncode

        #sendMessage(encodeMessage(receivedMessage))

        
        if (path.isfile(absPath)):
            os.remove(absPath)

        #jsonがなくてできるならJSON化
        if " -j " in receivedMessage["command"]:
            try:
                receivedMessage["returnJson"] = json.loads(receivedMessage["stdout"])

            except json.JSONDecodeError as e:
               receivedMessage["error"] = str(e)
            
        #sendMessage(encodeMessage(receivedMessage))

    except json.JSONDecodeError as e:
        sendMessage(encodeMessage(receivedMessage))
        receivedMessage["status"] = "error"
        receivedMessage["error"] = str(e)
        sendMessage(encodeMessage(receivedMessage))
        return

    #マージするとき拡張子が変わったらここ
    m = re.search("WARNING: Requested formats are incompatible for merge and will be merged into (.+?)\.", receivedMessage["stdout"])
    if not m is None:
        newExtension = m.groups()[0]
        receivedMessage["json"]["_filename"] = re.sub("\.[^.]+?$","." + newExtension,receivedMessage["json"]["_filename"])


    receivedMessage["status"] = "finished"
    sendMessage(encodeMessage(receivedMessage))

def askOverwriteSaveAsCancel(directory,filename):
    root = tkinter.Tk()
    root.title("File is already exists")
    root.attributes("-topmost", True)
    root.resizable(0,0)

    overwriteLa = tkinter.Label(root, text="Overwrite?",font=("",20))
    overwriteLa.pack()

    showDirectoryVar = tkinter.StringVar()
    showDirectoryBu = tkinter.Button(root,text="showDirectory", width=15,font=("",10), command=lambda: directoryManager({"path":showDirectoryVar.get(),"isSelect":True},True))
    showDirectoryBu.pack()
    filenameLaVar = tkinter.StringVar()
    directoryLaVar = tkinter.StringVar()
    directoryLa = tkinter.Label(root, textvariable=directoryLaVar,font=("",12))
    directoryLa.pack()
    filenameLa = tkinter.Label(root, textvariable=filenameLaVar,font=("",15))
    filenameLa.pack()
        

    answer = tkinter.StringVar()
    root.protocol("WM_DELETE_WINDOW", lambda:answer.set("No"))
    yesBu = tkinter.Button(root,text="Yes", width=25,font=("",20),  command=lambda: answer.set("Yes"))
    yesBu.pack()
    saveAsBu = tkinter.Button(root,text="Save as", width=25,font=("",20), command=lambda: answer.set("Save as"))
    saveAsBu.pack()
    noBu = tkinter.Button(root,text="No", width=25,font=("",20), command=lambda: answer.set("No"))
    noBu.pack()
        
    showDirectoryVar.set(path.join(directory,filename))
    directoryLaVar.set(directory)
    filenameLaVar.set(filename)
    root.update_idletasks()
    w = root.winfo_screenwidth()
    h = root.winfo_screenheight()
    size = tuple(int(_) for _ in root.geometry().split("+")[0].split("x"))
    x = w / 2 - size[0] / 2
    y = h / 2 - size[1] / 2
    root.geometry("%dx%d+%d+%d" % (size + (x, y)))
    root.deiconify() 
    root.wait_variable(answer)
    root.withdraw()
    root.destroy()

    return answer.get()

    
def directoryManager(receivedMessage,isValueReturn=False):
 #   receivedMessage["status"]="started"
#    sendMessage(encodeMessage(receivedMessage))
        
    if "path" not in receivedMessage:
        iDir = replaceUserProfile(receivedMessage["initialDir"])
        if not path.isdir(iDir):
            iDir = None
        root = tkinter.Tk()
        root.attributes("-topmost", True)
        root.withdraw() 
        dirname = filedialog.askdirectory(initialdir=iDir)
        root.destroy()

        if isValueReturn:
            return dirname
        
        if not dirname == "":
            receivedMessage["status"] = "success"
            receivedMessage["dir"] = dirname
            
        else:
            receivedMessage["status"] = "fail"
            
    else:
        p = receivedMessage["path"]

        if not path.exists(p):
            if path.exists(path.dirname(p)):
                p = path.dirname(p)
                receivedMessage["isSelect"] = False
            else:
                receivedMessage["status"] = "fail"
                sendMessage(encodeMessage(receivedMessage))

        fileManagerName = ""

        if pf == 'Windows':
            fileManagerName = "explorer"
            select = "/select,"if receivedMessage["isSelect"] else ""

        elif pf == 'Darwin':
            fileManagerName = "open"
            select = "-R "if receivedMessage["isSelect"] else ""

        elif pt == 'Linux':
            p = path.dirname(p)
            fileManagerName = "xdg-open"
            select = ""

        command = '{} {}"{}"'.format(fileManagerName,select,path.normpath(p))
        subprocess.run(command)
        receivedMessage["status"] = "success"
        receivedMessage["command"] = command
        sendMessage(encodeMessage(receivedMessage))
        
    if isValueReturn:
        return
    sendMessage(encodeMessage(receivedMessage))




def replaceUserProfile(directory):
    if pf == 'Windows':
        return directory.replace("<USERPROFILE>\\",os.environ["USERPROFILE"])
    else:
        return directory.replace("<USERPROFILE>\\",os.environ["HOME"])


def GetUserProfile():
    if pf == 'Windows':
        sendMessage(encodeMessage(os.environ["USERPROFILE"]))
    else:
        sendMessage(encodeMessage(os.environ["HOME"]))

        
#このファイルのアップデート
def Update(receivedMessage):
    if not os.access(sys.argv[0], os.W_OK):
        receivedMessage["status"] = "error"
        receivedMessage["message"] = "no write permissions on " + absDirectoryPath
        sendMessage(encodeMessage(receivedMessage))
        sys.exit()
        
    isDebug = receivedMessage["isDebug"]

    if myFilename == "Youtube_dlForExtension.py":
        if isDebug:
            url = "https://drive.google.com/uc?id=1DvriaW84QMn2BM-AaD0cc6wsmCMQ_YIf"
        else:
            url = "https://drive.google.com/uc?id=1DNA02s4mn9bvQBSfZqXP6ThpUUB1RIO9"

        req = request.Request(url)
        with request.urlopen(req) as res:
            with open(myFilename,"wb") as f:
                f.write(res.read())


    elif myFilename == "Youtube_dlForExtension.exe":
        if isDebug:
            url = "https://drive.google.com/uc?id=14k1nn2b4xiI5moDC7yKeT9T85p9LYfgy"
        else:
            url = "https://drive.google.com/uc?id=1RaIaMmVeQX9ilpGJtmU0iRveBQzzYqHP"
        
        newDir = path.join(absDirectoryPath,"new")

        if path.isdir(newDir):
            shutil.rmtree(newDir)


        req = request.Request(url)

        def DownloadZip():
            with request.urlopen(req) as res:
                with zipfile.ZipFile(BytesIO(res.read())) as zip:
                    zip.extractall(newDir)

        try:
            DownloadZip()
        except zipfile.BadZipfile:
            #Google Drive, so if it's a large file,
            #you'll see a confirmation screen.
            DownloadZip()

        desktopPath = path.join(newDir,"desktop.ini")

        if path.isfile(desktopPath):
            os.remove(desktopPath)

        bat = path.join(absDirectoryPath, 'Youtube_dlForExtensionUpdater.bat')

        with open(bat, 'w') as f:
            f.write('''
@echo off
setlocal enabledelayedexpansion

set CD={}
set NEWD={}
set EXEPATH={}


if exist UpdateExe.log (
    del UpdateExe.log
)

call :main >> UpdateExe.log 2>&1
exit



:main

    echo Start.
    echo;


    call :autoRetry deleteOldFile "%EXEPATH%"

    echo Remove %EXEPATH%
    echo;
    
    
    for /d %%d in ("%NEWD%\*") do (
        call :deleteOldDirFor "%%d"
    )
    
    
    echo;
    call :autoRetry move "%NEWD%\*" "%CD%"
    echo;
    
    for /d %%d in ("%NEWD%\*") do (
        call :autoRetry move "%%d" "%CD%"
    )

    echo;
    echo Remove %NEWD%
    
    rmdir  "%NEWD%"

    del /f "%~dp0%~nx0" & echo;& echo End.& exit



:autoRetry
    echo %2
    if "%1"=="" (
        echo  Argument 1 must have a label name
        exit
    )
    for /l %%i in (1,1,10) do (
    
        if "%3"=="" (
            if "%2"=="" (
                call :%1
            ) else (
                call :%1 %2
            )
        ) else (
            call :%1 %2 %3
        )
        
        if !errorlevel! equ 0 (
            echo Successful %1
            echo Number of attempts %%i

            exit /b
        )

        timeout /t 1
    )
    echo Timeout Error.
    exit

    
:deleteOldFile
    del /Q %1
    if exist %1 (
        exit /b 1
    )
    exit /b 0


:deleteOldDirFor
    call :setbasename %1
  
    if exist "%CD%\%BASENAME%" (
        call :autoRetry deleteOldDir "%CD%\%BASENAME%"

        echo Remove %CD%\%BASENAME%
    )
    exit /b

:deleteOldDir
    rmdir /s /q %1
    if exist %1 (
        exit /b 1
    )
    exit /b 0


:move
    move /Y %1 %2
    exit /b %errorlevel%


:setbasename
    set BASENAME=%~n1
    exit /b

'''.format(".",".\\new",sys.argv[0]))

        subprocess.Popen([bat],
                            creationflags= subprocess.CREATE_BREAKAWAY_FROM_JOB,
                            start_new_session=True,
                            startupinfo=startupinfo)
    else:
        receivedMessage["status"] = "error"
        receivedMessage["message"] = "Is not .py or .exe."
        sendMessage(encodeMessage(receivedMessage))
        sys.exit()


   
    receivedMessage["status"] = "success"
    sendMessage(encodeMessage(receivedMessage))


def GetVersion(receivedMessage):
    receivedMessage["version"] = "1.7.0"
    sendMessage(encodeMessage(receivedMessage))

        

#youtube-dlのアップデート
def UpdateYoutube_dl(receivedMessage):
    #receivedMessage["filename"] = myFilename

    #youtube-dlのexeがあれば更新確認
    if isFoundYoutube_dl():
        proc = subprocess.run(["youtube-dl", "-U"],
                                    stdout = subprocess.PIPE,
                                    stderr = subprocess.STDOUT,
                                    startupinfo=startupinfo)
            
        receivedMessage["stdout"] = proc.stdout.decode(sys.stdout.encoding,errors="ignore")
        receivedMessage["update"] = "youtube-dl -U"
        
    #youtube-dlのexeなくてこのファイルがexeならダウンロード
    elif myFilename == "Youtube_dlForExtension.exe":
        request.urlretrieve("https://youtube-dl.org/downloads/latest/youtube-dl.exe","youtube-dl.exe")
        receivedMessage["stdout"] = "Download Youtube_dlForExtension.exe"

    #このファイルがexeじゃないなら
    else:
        proc = subprocess.run(receivedMessage["youtube_dlUpdateCommand"],
                                    stdout = subprocess.PIPE,
                                    stderr = subprocess.STDOUT,
                                    startupinfo=startupinfo)
        
        receivedMessage["stdout"] = proc.stdout.decode(sys.stdout.encoding,errors="ignore")
        receivedMessage["update"] = receivedMessage["youtube_dlUpdateCommand"]


    sendMessage(encodeMessage(receivedMessage))


try:
    receivedMessage = getMessage()
   
    ##receivedMessage["status"]="1919810"
    ##sendMessage(encodeMessage(receivedMessage))

    if receivedMessage["name"] == "To_Youtube_dl":
        To_Youtube_dl(receivedMessage["value"])
    
    if receivedMessage["name"] == "DirectoryManager":
        directoryManager(receivedMessage["value"])

    if receivedMessage["name"] == "RemoveJson":
        removeJson(receivedMessage["value"])

    if receivedMessage["name"] == "GetUserProfile":
        GetUserProfile()

    
    if receivedMessage["name"] == "UpdateYoutube_dl":
        UpdateYoutube_dl(receivedMessage["value"])
    
    if receivedMessage["name"] == "Update":
        Update(receivedMessage["value"])
    
    if receivedMessage["name"] == "GetVersion":
        GetVersion(receivedMessage["value"])
    
except Exception as e:
    tb = traceback.format_exc()
    printErr(tb)

    receivedMessage["status"] = "error"
    receivedMessage["trakback"] = tb
    sendMessage(encodeMessage(receivedMessage))