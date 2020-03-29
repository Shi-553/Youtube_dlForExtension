import sys
import os
import urllib.request

#ファイル名
myFilename= os.path.basename(sys.argv[0])
if myFilename == "Youtube_dlForExtensionUpdater.py":
    url="https://drive.google.com/uc?id=1DNA02s4mn9bvQBSfZqXP6ThpUUB1RIO9"
    filename="Youtube_dlForExtension.py"

elif myFilename == "Youtube_dlForExtensionUpdater.exe":
    url="https://drive.google.com/uc?id=1MRGbG68I-07P91MJoLOV0onVDikFXlhd"
    filename="Youtube_dlForExtension.exe"
else:
    exit()

urllib.request.urlretrieve(url,filename)
