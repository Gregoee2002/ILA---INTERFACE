import re

with open("src/App.tsx", "r") as f:
    content = f.read()

bad_str = """                    </AnimatePresence>
                  </div>
             </>
           )}"""

good_str = """                    </AnimatePresence>
                  </div>
                </div>
            </>
          )}"""

content = content.replace(bad_str, good_str)

with open("src/App.tsx", "w") as f:
    f.write(content)

