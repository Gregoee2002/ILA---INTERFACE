import sys
import xml.etree.ElementTree as ET

for path in sys.argv[1:]:
    try:
        ET.parse(path)
        print(f"OK  {path}")
    except Exception as e:
        print(f"ERRORE  {path}: {e}")
