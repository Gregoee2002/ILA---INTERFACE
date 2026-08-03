import re

with open("src/App.tsx", "r") as f:
    content = f.read()

start_marker = "                      </AnimatePresence>\n                    </div>\n             </div>"
end_marker = "             </>\n           )}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    new_block = """                      </AnimatePresence>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="mt-8 mb-6 flex items-center justify-between border-t border-border/20 pt-6 px-6">
                        <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
                          Pagina {currentPage} di {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 border border-border/40 rounded-sm hover:bg-accent/10 disabled:opacity-20 transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) pageNum = i + 1;
                              else if (currentPage <= 3) pageNum = i + 1;
                              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                              else pageNum = currentPage - 2 + i;

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={cn(
                                    "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-sm border transition-all",
                                    currentPage === pageNum
                                       ? "bg-accent border-accent text-white"
                                       : "border-border/40 hover:border-accent text-muted"
                                  )}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 border border-border/40 rounded-sm hover:bg-accent/10 disabled:opacity-20 transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Selection Bar */}
                    <AnimatePresence>
                      {selectedIds.size > 0 && (
                        <motion.div
                          initial={{ y: 60, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 60, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          className="sticky bottom-0 left-0 right-0 bg-parchment border-t-2 border-accent px-6 py-3 flex items-center justify-between gap-4 shadow-lg z-20"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-sans font-bold text-accent flex items-center gap-1">
                              <AnimatePresence mode="popLayout" initial={false}>
                                <motion.span
                                  key={selectedIds.size}
                                  initial={{ y: -10, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  exit={{ y: 10, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="tabular-nums inline-block"
                                >
                                  {selectedIds.size}
                                </motion.span>
                              </AnimatePresence>
                              {selectedIds.size === 1 ? 'scheda selezionata' : 'schede selezionate'}
                            </span>
                            <button
                              onClick={deselectAll}
                              className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Deseleziona
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { exportFilteredData(); flashExport('xml'); }}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent/90 transition-colors rounded-sm"
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {exportFlash === 'xml' ? (
                                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Check className="h-3 w-3" />
                                  </motion.span>
                                ) : (
                                  <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Download className="h-3 w-3" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              {exportFlash === 'xml' ? 'Esportato' : 'Esporta XML'}
                            </button>
                            <button
                              onClick={() => { exportToPDF(); flashExport('pdf'); }}
                              className="flex items-center gap-1.5 px-4 py-1.5 border border-accent text-accent text-[9px] font-sans font-bold uppercase tracking-widest hover:bg-accent/5 transition-colors rounded-sm"
                            >
                              <AnimatePresence mode="wait" initial={false}>
                                {exportFlash === 'pdf' ? (
                                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <Check className="h-3 w-3" />
                                  </motion.span>
                                ) : (
                                  <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING_SNAPPY}>
                                    <FileText className="h-3 w-3" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              {exportFlash === 'pdf' ? 'Esportato' : 'Esporta PDF'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
             </>
           )}"""

    content = content[:start_idx] + new_block + content[end_idx:]
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Fixed JSX!")
else:
    print("Could not find start or end markers!")
