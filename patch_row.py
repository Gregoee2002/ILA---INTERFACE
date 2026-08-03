import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

start_marker = "                            {/* Checkbox */}"
end_marker = """                          </motion.div>
                          );
                        })}"""

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    checkbox_code = """<div className="flex items-center justify-center pt-0.5 md:pt-0" onClick={e => { e.stopPropagation(); toggleSelect(m); }}>
                              <motion.div
                                whileTap={{ scale: 0.85 }}
                                animate={{
                                  scale: isSelected ? [1, 1.15, 1] : 1,
                                  backgroundColor: isSelected ? 'rgb(45,161,153)' : 'rgba(0,0,0,0)',
                                  borderColor: isSelected ? 'rgb(45,161,153)' : 'var(--border)',
                                }}
                                transition={{ duration: 0.28, ease: EASE_OUT }}
                                className="w-4 h-4 border rounded-sm flex items-center justify-center cursor-pointer"
                              >
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0, opacity: 0 }}
                                      transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                                    >
                                      <Check className="h-2.5 w-2.5 text-white" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            </div>"""

    replacement = """
                            {/* --- MOBILE VIEW --- */}
                            <div className="md:hidden flex w-full gap-3 items-start">
                              [CHECKBOX_CODE]
                              
                              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-mono text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded-sm border border-accent/10 tabular-nums">#{m.id.toString().padStart(3, '0')}</span>
                                    {searchResultIds?.has(m.id) && matchInSuppliedById.get(m.id) && (
                                      <span className="font-mono text-[8px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded-sm border border-amber-500/20">RICOSTR.</span>
                                    )}
                                    {(m.corpus || m.numero) && (
                                      <span className="text-[9px] font-sans font-bold text-muted/60 uppercase ml-1">
                                        {m.corpus || ''} {m.numero || ''}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-ink/75 tabular-nums shrink-0">{formatDateRange(m.data_inizio, m.data_fine)}</span>
                                </div>
                                
                                <div className="text-sm font-bold text-ink leading-tight line-clamp-2">{getDisplayTitle(m)}</div>
                                
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                  <span className="text-[9px] font-bold uppercase text-muted tracking-tighter">{m.tipo}</span>
                                  {m.regione && <span className="text-[7px] font-sans text-accent font-bold uppercase tracking-wider bg-accent/5 px-1 rounded-xs border border-accent/10">{m.regione}</span>}
                                  {m.citta && (
                                     <span className="flex items-center gap-0.5 text-[8px] font-sans text-muted uppercase tracking-tighter">
                                       <MapPin className="h-1.5 w-1.5 opacity-50" />
                                       {m.citta}
                                     </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="shrink-0 pl-1 self-center">
                                <ChevronRight className="h-4 w-4 text-border group-hover:text-accent group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>

                            {/* --- DESKTOP VIEW --- */}
                            <div className="hidden md:contents">
                              [CHECKBOX_CODE]
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded-sm border border-accent/10 tabular-nums">#{m.id.toString().padStart(3, '0')}</span>
                                {searchResultIds?.has(m.id) && matchInSuppliedById.get(m.id) && (
                                  <span
                                    className="font-mono text-[8px] font-bold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded-sm border border-amber-500/20 whitespace-nowrap"
                                    title="Il termine cercato compare in una parte ricostruita editorialmente (supplied), non attestata sulla pietra"
                                  >
                                    RICOSTR.
                                  </span>
                                )}
                              </div>
                              <div className="hidden lg:block">
                                 <span className="text-[9px] font-sans font-bold text-muted/60 uppercase line-clamp-1">{m.corpus || '-'}</span>
                              </div>
                              <div className="hidden lg:block">
                                 <span className="text-[9px] font-sans font-bold text-ink/70 tabular-nums block text-right">{m.numero || '-'}</span>
                              </div>
                              <div>
                                <div className="text-sm font-bold text-ink line-clamp-1 group-hover:text-accent transition-colors">{getDisplayTitle(m)}</div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                  {m.regione && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, regione: m.regione })); }}
                                      className="text-[7px] font-sans text-accent font-bold uppercase tracking-wider bg-accent/5 px-1 rounded-xs border border-accent/10 hover:bg-accent hover:text-white transition-all cursor-pointer"
                                    >
                                      {m.regione}
                                    </button>
                                  )}
                                  {m.citta && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, citta: m.citta })); }}
                                      className="flex items-center gap-1 opacity-70 hover:opacity-100 hover:text-accent transition-all cursor-pointer"
                                    >
                                      <MapPin className="h-1.5 w-1.5 text-muted/50" />
                                      <span className="text-[8px] font-sans text-muted uppercase tracking-tighter">{m.citta}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                 <span className="text-[10px] font-bold text-ink/75 tabular-nums whitespace-nowrap block text-right">{formatDateRange(m.data_inizio, m.data_fine)}</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, tipo: m.tipo })); }}
                                   className="text-[9px] font-bold uppercase text-muted tracking-tighter line-clamp-1 opacity-70 hover:text-accent transition-colors cursor-pointer text-left"
                                 >
                                   {m.tipo}
                                 </button>
                              </div>
                              <div
                                className="hidden xl:block text-[10px] italic text-muted/50 leading-relaxed font-serif overflow-hidden"
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}
                              >
                                {stripXml(m.testo) || '[Anepigrafe]'}
                              </div>
                              <div className="text-right flex justify-end items-center">
                                <ChevronRight className="h-4 w-4 text-border group-hover:text-accent group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
""".replace("[CHECKBOX_CODE]", checkbox_code)

    content = content[:start_idx] + replacement + content[end_idx:]
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Row content replaced successfully.")
else:
    print("Could not find start or end markers for replacement.")
