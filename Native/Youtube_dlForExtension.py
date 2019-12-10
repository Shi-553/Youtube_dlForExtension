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
    return re.sub(r'[\\|/|:|?|.|"|<|>|\|]',"_",url)

#JSONファイルに書き出す
def writeJson(path,dictionary,isCacheRefresh):
    if not isCacheRefresh and os.path.isfile(path):
        return
    jsonString = json.dumps(dictionary)
    with open(path,"w") as f:
        f.write(jsonString)
        
#JSONファイルから読みこむ
def GetJsonFromCache(receivedMessage):
    path = os.path.join(absDirectoryPath(), "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"])))
    if not os.path.isfile(path):
        sendMessage(encodeMessage(None))
    try:
        with open(path,"r") as f:
            sendMessage(encodeMessage(json.load(f)))
        
    except json.JSONDecodeError as e:
        sendMessage(encodeMessage(None))

#今このファイルがあるディレクトリの絶対パス
def absDirectoryPath():
    return os.path.abspath(os.path.dirname(__file__))


def To_Youtube_dl(receivedMessage):
    receivedMessage["status"] = "started"
    #sendMessage(encodeMessage(receivedMessage))
    #JSONがあればここ
    if "json" in receivedMessage:
        absPath = os.path.join(absDirectoryPath(), "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"])))
        receivedMessage["command"] = receivedMessage["command"].replace("<JSONPATH>",absPath)
        writeJson(absPath,receivedMessage["json"],receivedMessage["isCacheRefresh"])
            
   # sendMessage(encodeMessage(receivedMessage))
   #youtube dlの文字列を絶対パスにしておく
   # absYoutube_dlPath=os.path.join(absDirectoryPath(), "youtube-dl")#.exe
   #receivedMessage["command"]=
   #receivedMessage["command"].replace("\"youtube-dl\"",absYoutube_dlPath)#
   #"\""++"\""

    #dirがあれば置き換えと存在確認
    if "dir" in receivedMessage:
        receivedMessage["dir"] = replaceUserPofile(receivedMessage["dir"])

        if not os.path.isdir(receivedMessage["dir"]):
            receivedMessage["status"] = "DoesNotExistDirectory"
            sendMessage(encodeMessage(receivedMessage))
            return

    else:
        receivedMessage["dir"] = None

    sendMessage(encodeMessage(receivedMessage))
    #送るところ本体
    try:
        if receivedMessage["callbackString"] == "ReceiveDownload":
            proc = subprocess.Popen(receivedMessage["command"],
                                    cwd=receivedMessage["dir"],
                                    stdout = subprocess.PIPE,
                                    stderr = subprocess.STDOUT)
            
            receivedMessage["status"] = "Progress"
            for line in iter(proc.stdout.readline,b""):
                receivedMessage["stdout"] = line.rstrip().decode("cp932")
                sendMessage(encodeMessage(receivedMessage))

            proc.wait()
        else:
            proc = subprocess.run(receivedMessage["command"],
                                cwd=receivedMessage["dir"],
                                stdout = subprocess.PIPE,
                                stderr = subprocess.STDOUT)
            
    except json.JSONDecodeError as e:
        receivedMessage["status"] = "error"
        receivedMessage["e"] = str(e)
        sendMessage(encodeMessage(receivedMessage))
        return

    receivedMessage["status"] = "finishedDownload"
    receivedMessage["returncode"] = proc.returncode
    #出力をデコードして
    if not receivedMessage["callbackString"] == "ReceiveDownload":
        if proc.stdout is not None :
            receivedMessage["stdout"] = proc.stdout.decode("cp932")#utf-8
        else:
            receivedMessage["stdout"] = ""
    #sendMessage(encodeMessage(receivedMessage))

        
    #jsonがなくてできるならJSON化
    if " -j " in receivedMessage["command"]:
        try:
            receivedMessage["returnJson"] = json.loads(receivedMessage["stdout"])
            if not "json" in receivedMessage:
                absPath = os.path.join(absDirectoryPath(), "JSONCache\{}.json".format(urlToFilename(receivedMessage["url"])))
                writeJson(absPath,receivedMessage["returnJson"],receivedMessage["isCacheRefresh"])
        except json.JSONDecodeError as e:
            pass
            

    #マージするとき拡張子が変わったらここ
    m = re.search("WARNING: Requested formats are incompatible for merge and will be merged into (.+?)\.", receivedMessage["stdout"])
    if not m is None:
        newExtension = m.groups()[0]
        receivedMessage["json"]["_filename"] = re.sub("\.[^.]+?$","." + newExtension,receivedMessage["json"]["_filename"])

    #上書きできなかったらここに入る
    if ("has already been downloaded" in receivedMessage["stdout"]):
        filePath = os.path.join(receivedMessage["dir"],receivedMessage["json"]["_filename"])
        if receivedMessage["isOverwrite"] is None:
            receivedMessage["status"] = "AskOverwrite"
            sendMessage(encodeMessage(receivedMessage))
            #p=directoryManager({"path":filePath,"isSelect":True},True)
            receivedMessage["isOverwrite"] = askOverwriteSaveAsCancel(receivedMessage["dir"],receivedMessage["json"]["_filename"])
            #p.kill() not working
            
        if receivedMessage["isOverwrite"] == "Yes":
            os.remove(filePath)
            To_Youtube_dl(receivedMessage)
            receivedMessage["status"] = "Overwritten"
            sendMessage(encodeMessage(receivedMessage))
            
        elif receivedMessage["isOverwrite"] == "Save as":
            receivedMessage["isOverwrite"] = None
            receivedMessage["dir"] = directoryManager({"initialDir":receivedMessage["dir"]},True)
            if receivedMessage["dir"] == "":
                receivedMessage["status"] = "NotOverwritten"
                sendMessage(encodeMessage(receivedMessage))
            else:
                To_Youtube_dl(receivedMessage)
        
        elif receivedMessage["isOverwrite"] == "No":
            receivedMessage["status"] = "NotOverwritten"
            sendMessage(encodeMessage(receivedMessage))
            
        return

    receivedMessage["status"] = "finished"
    sendMessage(encodeMessage(receivedMessage))

isTkInit = False
def askOverwriteSaveAsCancel(directory,filename):
    global isTkInit
    if not isTkInit:
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
        isTkInit = True
        
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
    
    return answer.get()

    
def directoryManager(receivedMessage,isValueReturn=False):
 #   receivedMessage["status"]="started"
#    sendMessage(encodeMessage(receivedMessage))
        
    if not "path" in receivedMessage:
        iDir = replaceUserPofile(receivedMessage["initialDir"])
        if not os.path.isdir(iDir):
            iDir = None
        dirname = filedialog.askdirectory(initialdir=iDir)
        if isValueReturn:
            return dirname
        
        if not dirname == "":
            receivedMessage["status"] = "success"
            receivedMessage["dir"] = dirname
            
        else:
            receivedMessage["status"] = "fail"
            
    else:
        if  os.path.exists(receivedMessage["path"]):
            select = "/select,"if receivedMessage["isSelect"] else ""
            subprocess.run("explorer {}'{}'".format(select,receivedMessage["path"]))
            receivedMessage["status"] = "success"
        
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
    return directory.replace("<USERPROFILE>\\",os.environ["USERPROFILE"])


#このファイルのアップデート
def Update():
    if __file__ == "Youtube_dlForExtension.py":
        proc = subprocess.run(["python","Youtube_dlForExtensionUpdater.py"])
    elif __file__ == "Youtube_dlForExtension.exe":
        subprocess.run(["exe","Youtube_dlForExtensionUpdater.exe"])


def GetVersion():
    receivedMessage["version"] = "1.1.0"
    sendMessage(encodeMessage(receivedMessage))


#youtube-dlの準備
def InitYoutube_dl():
    if __file__ == "Youtube_dlForExtension.py":
        subprocess.call([sys.executable, "-m", "pip", "install", "youtube-dl"])
    elif __file__ == "Youtube_dlForExtension.exe":
        urllib.request.urlretrieve("https://youtube-dl.org/downloads/latest/youtube-dl.exe","youtube-dl.exe")
        

def UpdateYoutube_dl():
    if __file__ == "Youtube_dlForExtension.py":
        subprocess.call([sys.executable, "-m", "pip", "install","-U", "youtube-dl"])
    elif __file__ == "Youtube_dlForExtension.exe":
        subprocess.run(["youtube-dl", "-U"])


receivedMessage = getMessage()
##receivedMessage["status"]="1919810"
##sendMessage(encodeMessage(receivedMessage))


if receivedMessage["name"] == "To_Youtube_dl":
    To_Youtube_dl(receivedMessage["value"])
    
if receivedMessage["name"] == "DirectoryManager":
    directoryManager(receivedMessage["value"])

if receivedMessage["name"] == "PathManager":
    pathManager(receivedMessage["value"])
    
if receivedMessage["name"] == "GetJsonFromCache":
    GetJsonFromCache(receivedMessage["value"])
    
if receivedMessage["name"] == "GetFilename":
    GetFilename(receivedMessage["value"])
    
if receivedMessage["name"] == "GetVersion":
    GetVersion()
    
if receivedMessage["name"] == "Update":
    Update()
    
if receivedMessage["name"] == "UpdateYoutube_dl":
    if (not os.path.exists("youtube-dl.exe")) and (not os.path.exists("youtube-dl.py")):
        InitYoutube_dl()
    else:
        UpdateYoutube_dl()
