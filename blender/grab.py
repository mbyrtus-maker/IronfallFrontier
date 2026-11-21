import os
import sys, re, base64, glob, os
f = sorted(glob.glob("/tmp/claude-tool-results/*/mcp-remote-devices-Blender__execute_blender_code-*.txt"), key=os.path.getmtime)[-1]
m = re.search(r'"b64":\s*"([A-Za-z0-9+/=]+)"', open(f).read())
open(sys.argv[1], "wb").write(base64.b64decode(m.group(1)))
print(sys.argv[1], os.path.getsize(sys.argv[1]))
