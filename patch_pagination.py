import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

sel_start = content.find("                    {/* Selection Bar */}")
sel_end = content.find("                    </AnimatePresence>\n", sel_start) + len("                    </AnimatePresence>\n")

if sel_start != -1 and sel_end != -1:
    selection_bar = content[sel_start:sel_end]
    content = content[:sel_start] + content[sel_end:]
    
    pag_idx = content.find("                    {/* Pagination Controls */}")
    
    # We want to insert Selection Bar AFTER Pagination Controls.
    # Where does Pagination end?
    # It ends with:
    #                     )}
    #                   </div>
    
    end_of_scroll_div = content.find("                  </div>\n", pag_idx)
    if end_of_scroll_div != -1:
        # Insert right before the closing div
        content = content[:end_of_scroll_div] + selection_bar + content[end_of_scroll_div:]
        
        with open("src/App.tsx", "w") as f:
            f.write(content)
        print("Swapped Selection Bar and Pagination Controls successfully.")
    else:
        print("Could not find end of scroll div.")
else:
    print("Could not find Selection Bar.")
