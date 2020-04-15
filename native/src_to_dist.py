from os import path
import zipfile
import shutil
import pathlib



def SetCode():
    d_code = dist / "code"
    d_code.mkdir(exist_ok=True)

    shutil.make_archive(d_code / YFE, 'zip', root_dir=s_core / "dist")

    shutil.copy(s_core / f"{YFE}.py",d_code)
    shutil.copy(s_core / "dist_pyinstaller" / f"{YFE}.exe",d_code)


def SetWindows():
    d_windows = dist / "windows"
    d_windows.mkdir(exist_ok=True)

    s_windows = src / "windows"
    s_windowsInstaller = src / "windows_installer"

    s_core_dist = s_core / "dist"

    with zipfile.ZipFile(d_windows / f"{YFE}.zip",'w', compression=zipfile.ZIP_DEFLATED) as zip:
        for f in s_windows.glob('**/*'):
            zip.write(f,path.join(YFE,f.relative_to(s_windows)))

        for f in s_core_dist.glob('**/*'):
            zip.write(f,path.join(YFE,f.relative_to(s_core_dist)))

    shutil.copy(s_windows / "readme.txt",d_windows)
    shutil.copy(s_windowsInstaller / "dist" / f"{YFE}Installer.exe",d_windows)


def SetOthers():
    d_others = dist / "others"
    d_others.mkdir(exist_ok=True)

    s_others = src / "others"

    with zipfile.ZipFile(d_others / f"{YFE}.zip",'w', compression=zipfile.ZIP_DEFLATED) as zip:
        for f in s_others.glob('**/*'):
            if f.name == f"{YFE}.json":
                zip.write(f,path.join(YFE,f.relative_to(s_others)))
            else:
                zip.write(f,path.join(YFE,YFE,f.relative_to(s_others)))

        zip.write(s_core / f"{YFE}.py",path.join(YFE,YFE,f"{YFE}.py"))

    shutil.copy(s_others / "readme.txt",d_others)


print("start src_to_dist")
cwd = pathlib.Path()

dist = cwd / "dist"
dist.mkdir(exist_ok=True)

src = cwd / "src"
s_core = src / "core"

YFE = "Youtube_dlForExtension"

SetCode()
SetWindows()
SetOthers()

print("end src_to_dist")