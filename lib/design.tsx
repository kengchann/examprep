'use client'
import { createContext, useContext, useEffect, useState } from 'react'

// UI design variant: 'classic' = original design, 'modern' = premium dark
// SaaS redesign. Stored in localStorage (ui-design) and applied as a `modern`
// class on <html> so a single CSS token layer can reskin every page at once
// (same mechanism the dark theme uses). Instant switch, no reload.

export type Design = 'classic' | 'modern'
const KEY = 'ui-design'

export function readDesign(): Design {
  if (typeof window === 'undefined') return 'classic'
  try { return localStorage.getItem(KEY) === 'modern' ? 'modern' : 'classic' } catch { return 'classic' }
}

function applyDesign(d: Design) {
  const el = document.documentElement
  el.classList.toggle('modern', d === 'modern')
  // Modern mode is designed dark-first; force the dark token layer with it so
  // classic light styles never bleed through. Classic keeps the user's theme.
  if (d === 'modern') el.classList.add('dark')
}

type Ctx = { design: Design; setDesign: (d: Design) => void }
const DesignContext = createContext<Ctx>({ design: 'classic', setDesign: () => {} })

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [design, setDesignState] = useState<Design>('classic')

  useEffect(() => {
    const d = readDesign()
    setDesignState(d)
    applyDesign(d)
  }, [])

  function setDesign(d: Design) {
    setDesignState(d)
    try { localStorage.setItem(KEY, d) } catch {}
    applyDesign(d)
    // Leaving modern: restore the theme the user actually chose in Settings.
    if (d === 'classic') {
      try {
        const s = JSON.parse(localStorage.getItem('examprep_settings') || '{}')
        const t = s.theme || 'system'
        const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.toggle('dark', dark)
      } catch {}
    }
  }

  return <DesignContext.Provider value={{ design, setDesign }}>{children}</DesignContext.Provider>
}

export function useDesign() {
  return useContext(DesignContext)
}
