import os

path=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = os.listdir(path + "/images")

path_ = path + "/images/"

cur = 0

for file in files:
    
    while os.path.exists(path_ + str(cur) + ".png"):
        cur += 1
    
    os.rename(path_ + file, path_ + str(cur) + ".png")
    cur = 0
