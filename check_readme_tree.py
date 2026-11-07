#!/usr/bin/env python3
import re
import subprocess
import sys

README = "README.md"

text = open(README, encoding="utf-8").read()
m = re.search(r"## 10\. ファイル構成\s*```\n(.*?)\n```", text, re.S)
if not m:
    sys.exit("README.md に「## 10. ファイル構成」のコードブロックが見つかりません。")

stack = []
listed = set()
for raw in m.group(1).splitlines()[1:]:
    mm = re.match(r"^([│ ]*)(?:├── |└── )(\S+)", raw)
    if not mm:
        continue
    depth = len(mm.group(1)) // 4
    name = mm.group(2)
    stack = stack[:depth]
    path = "/".join([s for _, s in stack] + [name])
    is_dir = not re.search(r"\.[A-Za-z0-9]+$", name)
    if name.startswith(".") and "." not in name[1:]:
        is_dir = False
    if is_dir:
        stack.append((depth, name))
    else:
        listed.add(path)

actual = set(subprocess.check_output(["git", "ls-files"], text=True).splitlines())
missing_in_readme = sorted(actual - listed)
missing_in_repo = sorted(listed - actual)

if not missing_in_readme and not missing_in_repo:
    print("OK: README のファイル構成は、git ls-files と一致しています。")
    sys.exit(0)
if missing_in_readme:
    print("README に載っていないファイル（リポジトリにはある）:")
    for p in missing_in_readme:
        print("  +", p)
if missing_in_repo:
    print("README にあるが、リポジトリに無いファイル:")
    for p in missing_in_repo:
        print("  -", p)
sys.exit(1)
