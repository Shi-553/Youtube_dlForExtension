import os
import urllib.request

if os.path.isfile(os.path.join(os.path.abspath(os.path.dirname(__file__)),"Youtube_dlForExtension.py")):
     url="https://drive.google.com/uc?id=1DNA02s4mn9bvQBSfZqXP6ThpUUB1RIO9"
     filename="Youtube_dlForExtension.py"
else:
    url="https://drive.google.com/uc?id=1MRGbG68I-07P91MJoLOV0onVDikFXlhd"
    filename="Youtube_dlForExtension.exe"


urllib.request.urlretrieve(url,filename)
