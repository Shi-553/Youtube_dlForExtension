from distutils.core import setup
import py2exe

option = {
    "bundle_files":2,
    "compressed": True,
    "includes": ["tkinter"]
}
setup(
    options = {"py2exe": option},
    windows = [
    {"script" : "Youtube_dlForExtension.py"}],
    zipfile = None 
    )