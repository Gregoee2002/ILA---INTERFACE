import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

bad_str = """        <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8 px-7 py-8 md:px-10 md:py-10 text-left">
          <motion.div
            className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center ring-1 ring-white/25 group-hover:bg-white/20 group-hover:ring-white/40 transition-all self-start md:self-auto"
            animate={launching === 'catalog' && launchStage === 'lit' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          >
            {React.cloneElement(heroSection.icon as React.ReactElement, { className: 'h-6 w-6 md:h-7 md:w-7' })}
          </motion.div>

          <div className="w-px self-stretch my-2 bg-gradient-to-b from-transparent via-white/20 to-transparent hidden md:block" />

          <div className="flex-1 min-w-0 flex flex-col justify-center pr-4">
            <div className="text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-white/60 mb-2 md:mb-1.5">Punto di partenza</div>
            <div className="font-serif font-bold text-white text-2xl md:text-3xl mb-2 md:mb-1.5 leading-tight">{heroSection.label}</div>
            <p className="text-sm text-white/70 leading-relaxed md:leading-snug max-w-lg">{heroSection.desc}</p>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center shrink-0 pl-2">
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/40 transition-all">
              <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <span className="text-[8px] font-sans font-bold uppercase tracking-[0.2em] text-white/40 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Esplora</span>
          </div>
          <ChevronRight className="md:hidden absolute right-6 top-10 h-5 w-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
        </div>"""

good_str = """        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10 px-7 py-8 md:px-12 md:py-10 text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 flex-1">
            <motion.div
              className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full bg-white/10 text-white flex items-center justify-center ring-1 ring-white/25 group-hover:bg-white/20 group-hover:ring-white/40 transition-all self-start md:self-auto shadow-inner"
              animate={launching === 'catalog' && launchStage === 'lit' ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              {React.cloneElement(heroSection.icon as React.ReactElement, { className: 'h-7 w-7 md:h-8 md:w-8 text-white/90' })}
            </motion.div>

            <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/25 to-transparent hidden md:block shrink-0" />

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="text-[9px] md:text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-white/60 mb-2 md:mb-1">Punto di partenza</div>
              <div className="font-serif font-bold text-white text-3xl md:text-4xl mb-2 md:mb-2 leading-tight tracking-tight">{heroSection.label}</div>
              <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-lg">{heroSection.desc}</p>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center shrink-0 pl-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/15 group-hover:border-white/50 transition-all">
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>
          <ChevronRight className="md:hidden absolute right-6 top-10 h-6 w-6 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
        </div>"""

if bad_str in content:
    content = content.replace(bad_str, good_str)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Fixed hero proportions successfully.")
else:
    print("Could not find the target string!")
