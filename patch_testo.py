import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

bad_str = """                              <div
                                className="hidden xl:block text-[10px] italic text-muted/50 leading-relaxed font-serif overflow-hidden"
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}
                              >
                                {stripXml(m.testo) || '[Anepigrafe]'}
                              </div>"""

good_str = """                              <div className="hidden xl:block">
                                <div
                                  className="text-[10px] italic text-muted/50 leading-relaxed font-serif overflow-hidden"
                                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}
                                >
                                  {stripXml(m.testo) || '[Anepigrafe]'}
                                </div>
                              </div>"""

if bad_str in content:
    content = content.replace(bad_str, good_str)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Fixed testo block!")
else:
    print("Could not find testo block!")
