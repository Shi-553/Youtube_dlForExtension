import os
import sys
import json
import struct
import subprocess
import tkinter
from tkinter import filedialog
import os.path
import re
import urllib.request
import pathlib
import platform
import traceback

pf = platform.system()

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
def writeJson(path,dictionary,isCacheRefresh):
    if not isCacheRefresh and os.path.isfile(path):
        return
    
    #フォルダがないとき
    dir = os.path.join(absDirectoryPath, "JSONCache")

    if not os.path.isdir(dir):
        os.mkdir(dir)

    jsonString = json.dumps(dictionary)

    p = pathlib.Path(path)
    p.touch()
    p.write_text(jsonString)


#JSONファイルを消す
def removeJson(receivedMessage):
    path = os.path.normpath(os.path.join(absDirectoryPath, "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"]+str(receivedMessage["tabId"])+receivedMessage["key"]))))

    if not os.path.isfile(path):
        sendMessage(encodeMessage(None))
    else:
        os.remove(path);
        sendMessage(encodeMessage(True))

#JSONファイルから読みこむ
#def GetJsonFromCache(receivedMessage):
#    path = os.path.normpath(os.path.join(absDirectoryPath, "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"]))))
#    if not os.path.isfile(path):
#        sendMessage(encodeMessage(None))
#    else:
#        try:
#            with open(path,"r") as f:
#                sendMessage(encodeMessage(json.load(f)))
        
#        except json.JSONDecodeError as e:
#            sendMessage(encodeMessage(None))

#今このファイルがあるディレクトリの絶対パス
absDirectoryPath = os.path.normpath(os.path.abspath(os.path.dirname(sys.argv[0])))

#ファイル名
myFilename = os.path.basename(sys.argv[0])

if pf == "Windows":
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
else:
    startupinfo=None

def isFoundYoutube_dl():
    abs=pathlib.Path(absDirectoryPath)
    ps=abs.iterdir()

    for p in ps:
        if p.stem=="youtube-dl":
            return True

    return False

def To_Youtube_dl(receivedMessage):
    receivedMessage["status"] = "started"
    #sendMessage(encodeMessage(receivedMessage))

    if not isFoundYoutube_dl():
        receivedMessage["command"]=receivedMessage["command"].replace("youtube-dl","py -m youtube_dl",1)

    #JSONがあればここ
    absPath = os.path.normpath(os.path.join(absDirectoryPath, "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"]+str(receivedMessage["tabId"])+receivedMessage["key"]))))
    if "json" in receivedMessage:
        receivedMessage["command"] = receivedMessage["command"].replace("<JSONPATH>",absPath,1)
        writeJson(absPath,receivedMessage["json"],receivedMessage["isCacheRefresh"])
        #print(receivedMessage["command"], file=sys.stderr)
            
   # sendMessage(encodeMessage(receivedMessage))

    #dirがあれば置き換えと存在確認
    if "dir" in receivedMessage:
        receivedMessage["dir"] = os.path.normpath(replaceUserPofile(receivedMessage["dir"]))

        if not os.path.isdir(receivedMessage["dir"]):
            receivedMessage["status"] = "DoesNotExistDirectory"
            sendMessage(encodeMessage(receivedMessage))
            return

    else:
        receivedMessage["dir"] = None
        
    #上書きできなかったらここに入る
    if (("usePopen" in receivedMessage) and (receivedMessage["usePopen"])):
        receivedMessage["filePath"]=os.path.join(receivedMessage["dir"],receivedMessage["json"]["_filename"])
        if(os.path.isfile(receivedMessage["filePath"])):
            if receivedMessage["overwrite"] is None:
                receivedMessage["status"] = "AskOverwrite"
                sendMessage(encodeMessage(receivedMessage))
                #p=directoryManager({"path":receivedMessage["filePath"],"isSelect":True},True)
                receivedMessage["overwrite"] = askOverwriteSaveAsCancel(receivedMessage["dir"],receivedMessage["json"]["_filename"])
                #p.kill() not working
            
            if receivedMessage["overwrite"] == "Yes":
                os.remove(receivedMessage["filePath"])
                To_Youtube_dl(receivedMessage)
                receivedMessage["status"] = "Overwritten"
                sendMessage(encodeMessage(receivedMessage))
            
            elif receivedMessage["overwrite"] == "Save as":
                receivedMessage["status"] = "Save as"
                sendMessage(encodeMessage(receivedMessage))
                receivedMessage["overwrite"] = None
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
                receivedMessage["stdout"] = line.rstrip().decode("cp932")
                sendMessage(encodeMessage(receivedMessage))

            proc.wait()
        else:
            proc = subprocess.run(receivedMessage["command"],
                                cwd=receivedMessage["dir"],
                                stdout = subprocess.PIPE,
                                stderr = subprocess.STDOUT,
                                startupinfo=startupinfo)
            

        receivedMessage["status"] = "finishedDownload"
        receivedMessage["returncode"] = proc.returncode
        #出力をデコードして
        if ("usePopen" not in receivedMessage) or (not receivedMessage["usePopen"]):
            if proc.stdout is not None :
                receivedMessage["stdout"] = proc.stdout.decode("cp932")#utf-8
            else:
                receivedMessage["stdout"] = ""
        sendMessage(encodeMessage(receivedMessage))

        
        if (os.path.isfile(absPath)):
            os.remove(absPath)
        #jsonがなくてできるならJSON化
        if " -j " in receivedMessage["command"]:
            try:
                receivedMessage["returnJson"] = json.loads(receivedMessage["stdout"])
                #if not "json" in receivedMessage:
                #    absPath = os.path.join(absDirectoryPath, "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"])))
                #    writeJson(absPath,receivedMessage["returnJson"],receivedMessage["isCacheRefresh"])
            except json.JSONDecodeError as e:
               receivedMessage["e"] = str(e)
            
        #sendMessage(encodeMessage(receivedMessage))

    except json.JSONDecodeError as e:
        sendMessage(encodeMessage(receivedMessage))
        receivedMessage["status"] = "error"
        receivedMessage["e"] = str(e)
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
    # if(showDirectoryVar is None):
    showDirectoryVar = tkinter.StringVar()
    showDirectoryBu = tkinter.Button(root,text="showDirectory", width=15,font=("",10), command=lambda: directoryManager({"path":showDirectoryVar.get(),"isSelect":True},True))
    showDirectoryBu.pack()
    filenameLaVar = tkinter.StringVar()
    directoryLaVar = tkinter.StringVar()
    directoryLa = tkinter.Label(root, textvariable=directoryLaVar,font=("",12))
    directoryLa.pack()
    filenameLa = tkinter.Label(root, textvariable=filenameLaVar,font=("",15))
    filenameLa.pack()
        
    #if(answer is None):
    answer = tkinter.StringVar()
    root.protocol("WM_DELETE_WINDOW", lambda:answer.set("No"))
    yesBu = tkinter.Button(root,text="Yes", width=25,font=("",20),  command=lambda: answer.set("Yes"))
    yesBu.pack()
    saveAsBu = tkinter.Button(root,text="Save as", width=25,font=("",20), command=lambda: answer.set("Save as"))
    saveAsBu.pack()
    noBu = tkinter.Button(root,text="No", width=25,font=("",20), command=lambda: answer.set("No"))
    noBu.pack()
        
    showDirectoryVar.set(os.path.join(directory,filename))
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
        
    if not "path" in receivedMessage:
        iDir = replaceUserPofile(receivedMessage["initialDir"])
        if not os.path.isdir(iDir):
            iDir = None
        root = tkinter.Tk()
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
        if  os.path.exists(receivedMessage["path"]):
            path=receivedMessage["path"]
            fileManagerName=""

            if pf == 'Windows':
                fileManagerName="explorer"
                select = "/select,"if receivedMessage["isSelect"] else ""

            elif pf == 'Darwin':
                fileManagerName="open"
                select = "-R "if receivedMessage["isSelect"] else ""

            elif pt == 'Linux':
                path=os.path.dirname(path)
                fileManagerName="xdg-open"
                select = ""

            command = '{} {}"{}"'.format(fileManagerName,select,os.path.normpath(path))
            subprocess.run(command)
            receivedMessage["status"] = "success"
            receivedMessage["command"] = command
            sendMessage(encodeMessage(receivedMessage))
        
        else:
            receivedMessage["status"] = "fail"
    if isValueReturn:
        return
    sendMessage(encodeMessage(receivedMessage))


def pathManager(receivedMessage):
    iDir = replaceUserPofile(receivedMessage["initialDir"])
    dirname = filedialog.askopenfilename(initialdir=iDir)
    if not dirname == "":
        receivedMessage["status"] = "success"
        receivedMessage["path"] = dirname
    else:
        receivedMessage["status"] = "fail"
            
    sendMessage(encodeMessage(receivedMessage))


def replaceUserPofile(directory):
    if pf == 'Windows':
        return directory.replace("<USERPROFILE>\\",os.environ["USERPROFILE"])
    else:
        return directory.replace("<USERPROFILE>\\",os.environ["HOME"])


def GetUserPofile():
    if pf == 'Windows':
        sendMessage(encodeMessage(os.environ["USERPROFILE"]))
    else:
        sendMessage(encodeMessage(os.environ["HOME"]))

        
#このファイルのアップデート
def Update():
    if myFilename == "Youtube_dlForExtension.py":
        if pf=="Windows":
            proc=subprocess.Popen(["py","Youtube_dlForExtensionUpdater.py"],
                                        stdout=subprocess.PIPE,
                                        creationflags= subprocess.CREATE_BREAKAWAY_FROM_JOB,
                                        start_new_session=True)
        else:
            proc=subprocess.Popen(["py","Youtube_dlForExtensionUpdater.py"],
                                        stdout=subprocess.PIPE,
                                        start_new_session=True)

    elif myFilename == "Youtube_dlForExtension.exe":
        proc=subprocess.Popen(["Youtube_dlForExtensionUpdater.exe"],
                                        stdout=subprocess.PIPE,
                                        creationflags= subprocess.CREATE_BREAKAWAY_FROM_JOB,
                                        start_new_session=True)
        
    line = proc.stdout.readline()
    receivedMessage["stdout"] = line.decode("cp932")
    sendMessage(encodeMessage(receivedMessage))
    sys.exit(0)


def GetVersion():
    receivedMessage["version"] = "1.4.1"
    sendMessage(encodeMessage(receivedMessage))

        

#youtube-dlのアップデート
def UpdateYoutube_dl():
    receivedMessage["filename"] = myFilename

    #youtube-dlのexeがあれば更新確認
    if os.path.isfile("youtube-dl.exe"):
        proc = subprocess.run(["youtube-dl", "-U"],
                                    stdout = subprocess.PIPE,
                                    stderr = subprocess.STDOUT,
                                    startupinfo=startupinfo)
            
        receivedMessage["stdout"] = proc.stdout.decode("cp932")#utf-8
        
    #youtube-dlのexeなくてこのファイルがexeならダウンロード
    elif myFilename == "Youtube_dlForExtension.exe":
        urllib.request.urlretrieve("https://youtube-dl.org/downloads/latest/youtube-dl.exe","youtube-dl.exe")
        receivedMessage["stdout"] = "Download Youtube_dlForExtension.exe"

    #このファイルがexeじゃないならpipを試す
    else:
        proc = subprocess.run(["py", "-m", "pip", "install","-U", "youtube-dl","--user"],
                                    stdout = subprocess.PIPE,
                                    stderr = subprocess.STDOUT,
                                    startupinfo=startupinfo)
        
        receivedMessage["stdout"] = proc.stdout.decode("cp932")#utf-8


    sendMessage(encodeMessage(receivedMessage))


try:
    receivedMessage = getMessage()
   
    ##receivedMessage["status"]="1919810"
    ##sendMessage(encodeMessage(receivedMessage))

    if receivedMessage["name"] == "To_Youtube_dl":
        To_Youtube_dl(receivedMessage["value"])
    
    if receivedMessage["name"] == "DirectoryManager":
        directoryManager(receivedMessage["value"])

    if receivedMessage["name"] == "PathManager":
        pathManager(receivedMessage["value"])

    if receivedMessage["name"] == "RemoveJson":
        removeJson(receivedMessage["value"])
    
    #if receivedMessage["name"] == "GetJsonFromCache":
    #    GetJsonFromCache(receivedMessage["value"])
    
    if receivedMessage["name"] == "GetUserPofile":
        GetUserPofile()

    
    if receivedMessage["name"] == "UpdateYoutube_dl":
        UpdateYoutube_dl()
    
    if receivedMessage["name"] == "Update":
        Update()
    
    if receivedMessage["name"] == "GetVersion":
        GetVersion()
    
except Exception as e:
    tb=traceback.format_exc()
    printErr(tb)

    receivedMessage["status"]="error"
    receivedMessage["trakback"]=tb
    sendMessage(encodeMessage(receivedMessage))