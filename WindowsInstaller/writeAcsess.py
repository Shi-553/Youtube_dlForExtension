import os
import sys

print(sys.argv[1])

print(os.access(sys.argv[1],os.W_OK))