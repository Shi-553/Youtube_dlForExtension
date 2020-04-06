from distutils.core import setup
import py2exe
import sys
import os
import re

script=sys.argv.pop(2)
bf=sys.argv.pop(2)


option = {
    "bundle_files":bf,
    "compressed": True
}

setup(
    options = {
        'py2exe': option,
        },
    windows = [
        {"script":script}
    ],
    zipfile = None,
)