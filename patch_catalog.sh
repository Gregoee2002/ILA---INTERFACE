#!/bin/bash

# We will use python to replace the section in App.tsx
python3 - << 'PYEOF'
import sys
import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace the Header
header_search = r'<div className="grid grid-cols-13 gap-2 border-b border-border py-4 text-\[10px\] font-bold uppercase tracking-tighter text-muted/60 sticky top-0 bg-parchment/80 backdrop-blur-md z-10 px-2 lg:px-0" style={{gridTemplateColumns: \'1.5rem 1fr 1fr 1fr 3fr 2fr 1fr 2fr 1.5rem\'}}>'
header_replace = r'<div className="hidden md:grid md:grid-cols-[1.5rem_1fr_1fr_1fr_3fr_2fr_1fr_2fr_1.5rem] gap-2 border-b border-border py-4 text-[10px] font-bold uppercase tracking-tighter text-muted/60 sticky top-0 bg-parchment/80 backdrop-blur-md z-10 px-2 lg:px-0">'
content = re.sub(header_search, header_replace, content)

# Remove the style gridTemplateColumns from the row
content = content.replace("style={{gridTemplateColumns: '1.5rem 1fr 1fr 1fr 3fr 2fr 1fr 2fr 1.5rem'}}", "")

# Replace the row classes
row_classes_search = r'"relative grid gap-2 border-b py-4 group items-center px-2 lg:px-0 h-\[76px\] overflow-hidden \[\&>div\]:min-w-0",'
row_classes_replace = r'"relative border-b py-3 md:py-4 group px-3 lg:px-0 min-h-[76px] overflow-hidden [&>div]:min-w-0 cursor-pointer block md:grid md:grid-cols-[1.5rem_1fr_1fr_1fr_3fr_2fr_1fr_2fr_1.5rem] md:gap-2 md:items-center",'
content = re.sub(row_classes_search, row_classes_replace, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
PYEOF
chmod +x patch_catalog.sh
./patch_catalog.sh
