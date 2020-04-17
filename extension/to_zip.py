from os import path
import zipfile
import shutil
import pathlib


print("start to_zip")
cwd = pathlib.Path()

src = cwd / "src"

with zipfile.ZipFile(cwd / "Youtube_dlForExtension@SHi.zip",'w', compression=zipfile.ZIP_DEFLATED) as zip:
    for f in src.glob('**/*'):
        if f.suffix == ".xcf":
            continue
        zip.write(f,f.relative_to(src))


print("end src_to_dist")