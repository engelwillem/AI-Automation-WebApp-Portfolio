
import os

app_dir = r"e:\thechoosentalksnext\src\app"
for root, dirs, files in os.walk(app_dir):
    for d in dirs:
        if "[" in d and "]" in d:
            print(os.path.relpath(os.path.join(root, d), app_dir))
