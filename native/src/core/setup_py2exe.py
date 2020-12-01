from distutils.core import setup
import py2exe
import sys
import tkinter

script =[ sys.argv.pop(2)]
bf = sys.argv.pop(2)
cw = sys.argv.pop(2)

options = {
    "py2exe":  {
        "bundle_files":bf,
        "compressed": True
    }
}

if cw == "w":
    setup(
        options=options,
        zipfile=None,
        windows=script
        )

if cw == "c":
    setup(options=options,
        zipfile=None,
        console=script
        )