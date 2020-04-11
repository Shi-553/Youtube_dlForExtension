import sys
import os
import urllib.request
import zipfile
from io import BytesIO
import winreg
import urllib.request
import tkinter as tk
from tkinter import filedialog
import threading
import admin
import shutil
import pathlib

def selectDirectory(entry,nextBu):
    dirPath = filedialog.askdirectory(initialdir=entry.get())
    if dirPath is "":
        return
    entry.delete(0, tk.END)
    entry.insert(0,dirPath)

    #p = subprocess.run('powershell "Get-ACL -Path \\"{}\\""'.format(dirPath),stdout=subprocess.PIPE)
    #print(p.stdout.decode("cp932"))

def install():
    finishPage.tkraise()

    def callback(log):
        if "error" in log:
            resultLa["fg"] = "red"
        if "finish" in log:
            finishBu["state"] = tk.ACTIVE

        resultLa["text"]+=log["message"] + "\n"

    th = threading.Thread(target=InstallYoutube_dl, args=(os.path.normpath(installDirectoryEn.get()),ffmpegOpeionVal.get(),callback))
    th.start()


def InstallYoutube_dl(folderPath,isFfmpeg,callback):

    os.chdir(folderPath)
    url = "https://drive.google.com/uc?export=download&id=1yhHlH-xtX2XjIa7DzEq5SOOxJT14I4A4"

    try:
        callback({"message":"Download..."})
        req = urllib.request.Request(url)

        try:
            with urllib.request.urlopen(req) as res:
                with zipfile.ZipFile(BytesIO(res.read())) as zip:
                    zip.extractall()
        except zipfile.BadZipfile as err:
            callback({"message":str(err)})
            callback({"message":"Retry..."})
            with urllib.request.urlopen(req) as res:
                with zipfile.ZipFile(BytesIO(res.read())) as zip:
                    zip.extractall()
        
        p = pathlib.Path(folderPath+"\\Youtube_dlForExtension")

        for ini in p.glob("desktop.ini"):
            ini.unlink()

        callback({"message":"Change registory..."})

        path = "SOFTWARE\\Mozilla\\NativeMessagingHosts\\Youtube_dlForExtension"

        with winreg.CreateKeyEx(winreg.HKEY_LOCAL_MACHINE, path) as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, folderPath + "Youtube_dlForExtension\\Youtube_dlForExtension.json")
            

        if isFfmpeg:
            callback({"message":"Download ffmpeg..."})

            os.chdir(folderPath + "Youtube_dlForExtension\\")
            url = "https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-20200401-afa5e38-win64-static.zip"
            

            req = urllib.request.Request(url)
            req.add_header("User-Agent", 'Mozilla/5.0')

            with urllib.request.urlopen(req) as res:
                with zipfile.ZipFile(BytesIO(res.read())) as zip:
                    zip.extractall()
                    list = zip.namelist()
                    for x in list:
                        if "ffmpeg.exe" in x:
                            shutil.move(x,folderPath + "Youtube_dlForExtension\\ffmpeg.exe")

                        if "ffprobe.exe" in x:
                            shutil.move(x,folderPath + "Youtube_dlForExtension\\ffprobe.exe")

    except Exception as err:
        callback({"error":True,"finish":True,"message":str(err)})
    else:
        callback({"finish":True,"message":"Complete! \nIf Firefox is running, restart."})



if __name__ == "__main__":
    if not admin.isAdmin():
        admin.runAdmin(os.path.abspath(sys.argv[0]))
        sys.exit(0)
        

    root = tk.Tk()
    
    w = 400
    h = 300

    ws = root.winfo_screenwidth()
    hs = root.winfo_screenheight()
    x = (ws / 2) - (w / 2)
    y = (hs / 2) - (h / 2)

    root.geometry('%dx%d+%d+%d' % (w, h, x, y))

    root.resizable(0,0)

    root.title("Youtube-dl For Extension Installer")
    
    root.grid_rowconfigure(0, weight=1)
    root.grid_columnconfigure(0, weight=1)



    firstPage = tk.Frame()
    firstPage.grid(row=0, column=0, sticky="nsew")
    
    mainTitleLa = tk.Label(firstPage, text="Youtube-dl For Extension Installer",font=("",16))
    mainTitleLa.place(x=38,y=100)

    nextBu = tk.Button(firstPage,text="Next", width=10,font=("",10),command=lambda:selectDirectoryPage.tkraise())
    nextBu.place(x=300,y=230)

    prevBu = tk.Button(firstPage,text="Prev", width=10,font=("",10), state=tk.DISABLED)
    prevBu.place(x=200,y=230)



    selectDirectoryPage = tk.Frame()
    selectDirectoryPage.grid(row=0, column=0, sticky="nsew")
    
    mainTitleLa = tk.Label(selectDirectoryPage, text="Youtube-dl For Extension Installer",font=("",16))
    mainTitleLa.place(x=38,y=50)
    
    nextBu = tk.Button(selectDirectoryPage,text="Next", width=10,font=("",10),command=lambda:optionPage.tkraise())
    nextBu.place(x=300,y=230)

    prevBu = tk.Button(selectDirectoryPage,text="Prev", width=10,font=("",10),command=lambda:firstPage.tkraise())
    prevBu.place(x=200,y=230)
    
    attentionLa = tk.Label(selectDirectoryPage,font=("",11),text="Attention:Please do not put it in the folder\n   which uses non-ASCII characters or\n   those that require special privileges.")
    attentionLa.place(x=70,y=85)
    
    installDirectoryLa = tk.Label(selectDirectoryPage, text="Install Directory",font=("",13))
    installDirectoryLa.place(x=38,y=140)
    
    installDirectoryEn = tk.Entry(selectDirectoryPage,font=("",10), width=50)
    installDirectoryEn.insert(0,"C:\\")
    installDirectoryEn.place(x=38,y=170)

    selectInstallDirectoryBu = tk.Button(selectDirectoryPage,text="select", width=10,font=("",10),command=lambda:selectDirectory(installDirectoryEn,selectInstallDirectoryBu))
    selectInstallDirectoryBu.place(x=38,y=200)
    
    

    optionPage = tk.Frame()
    optionPage.grid(row=0, column=0, sticky="nsew")
    
    mainTitleLa = tk.Label(optionPage, text="Youtube-dl For Extension Installer",font=("",16))
    mainTitleLa.place(x=38,y=50)

    ffmpegOpeionVal = tk.BooleanVar()
    ffmpegOpeionVal.set(True)
    ffmpegOptionCb = tk.Checkbutton(optionPage, text="Download ffmpeg.exe.",font=("",13),variable=ffmpegOpeionVal)
    ffmpegOptionCb.place(x=38,y=100)
    
    nextBu = tk.Button(optionPage,text="Install", width=10,font=("",10),command=lambda:install())
    nextBu.place(x=300,y=230)

    prevBu = tk.Button(optionPage,text="Prev", width=10,font=("",10),command=lambda:selectDirectoryPage.tkraise())
    prevBu.place(x=200,y=230)



    finishPage = tk.Frame()
    finishPage.grid(row=0, column=0, sticky="nsew")
    
    mainTitleLa = tk.Label(finishPage, text="Youtube-dl For Extension Installer",font=("",16))
    mainTitleLa.place(x=38,y=100)
    
    resultLa = tk.Label(finishPage,font=("",13),wraplength=300, justify='left')
    resultLa.place(x=70,y=150)
    
    finishBu = tk.Button(finishPage,text="Finish", width=10,font=("",10),command=lambda:sys.exit(0), state=tk.DISABLED)
    finishBu.place(x=300,y=230)

    firstPage.tkraise()

    root.mainloop()
