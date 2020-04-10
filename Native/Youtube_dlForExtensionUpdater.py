import sys
import os
import urllib.request
import time
import traceback


try:
    #ファイル名
    myFilename = os.path.basename(sys.argv[0])
    if myFilename == "Youtube_dlForExtensionUpdater.py":
        url = "https://drive.google.com/uc?id=1DNA02s4mn9bvQBSfZqXP6ThpUUB1RIO9"
        filename = "Youtube_dlForExtension.py"

    elif myFilename == "Youtube_dlForExtensionUpdater.exe":
        url = "https://drive.google.com/uc?id=1MRGbG68I-07P91MJoLOV0onVDikFXlhd"
        filename = "Youtube_dlForExtension.exe"
    else:
        print("not open file\n")
        sys.stdout.flush()
        sys.exit()



    req = urllib.request.Request(url)

        
    with urllib.request.urlopen(req) as res:
        print("open file\n")
        sys.stdout.flush()

        for i in range(10):
            time.sleep(1)
            try:
                os.remove(filename)
                with open(filename,"wb") as f:
                    f.write(res.read())

            except Exception as e:
                with open("log.txt","a") as f:
                    f.write(str(e) + "\n")

            else:
                with open("log.txt","a") as f:
                    f.write("success" + "\n")
                sys.exit()
        

except Exception as e:
    print("error\n")
    sys.stdout.flush()
    with open("log.txt","a") as f:
        f.write(traceback.format_exc());
