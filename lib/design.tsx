'use client'
import { createContext, useContext, useEffect, useState } from 'react'

// UI design variant: 'classic' = original design, 'modern' = premium SaaS
// redesign (light AND dark aware — it follows the user's theme setting).
// Stored in localStorage (ui-design / ui-accent) and applied as classes /
// data-accent on <html> so a single CSS token layer reskins every page at
// once. Instant switch, no reload.
//
// 'simulator' reskins the EXAM SCREEN ONLY, to look like a desktop exam
// simulator. Every other page falls back to Modern, so it carries the
// 'modern' class on <html> just like Modern does.

export type Design = 'classic' | 'modern' | 'simulator'
export type Accent = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber'

const KEY = 'ui-design'
const ACCENT_KEY = 'ui-accent'

export const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'violet', label: 'Violet', color: '#7C5CFF' },
  { id: 'blue', label: 'Blue', color: '#3B82F6' },
  { id: 'emerald', label: 'Emerald', color: '#10B981' },
  { id: 'rose', label: 'Rose', color: '#F43F5E' },
  { id: 'amber', label: 'Amber', color: '#D97706' },
]

// Simulator is the default (it only changes the exam screen — every other page
// still renders Modern). Anyone who explicitly picked a design keeps it.
export function readDesign(): Design {
  if (typeof window === 'undefined') return 'classic'
  try {
    const d = localStorage.getItem(KEY)
    return d === 'classic' || d === 'modern' || d === 'simulator' ? d : 'simulator'
  } catch { return 'simulator' }
}

function readAccent(): Accent {
  if (typeof window === 'undefined') return 'violet'
  try {
    const a = localStorage.getItem(ACCENT_KEY) as Accent | null
    return a && ACCENTS.some(x => x.id === a) ? a : 'violet'
  } catch { return 'violet' }
}

type Ctx = {
  design: Design
  setDesign: (d: Design) => void
  accent: Accent
  setAccent: (a: Accent) => void
}
const DesignContext = createContext<Ctx>({
  design: 'classic', setDesign: () => {}, accent: 'violet', setAccent: () => {},
})

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [design, setDesignState] = useState<Design>('classic')
  const [accent, setAccentState] = useState<Accent>('violet')

  useEffect(() => {
    const d = readDesign()
    const a = readAccent()
    setDesignState(d)
    setAccentState(a)
    document.documentElement.classList.toggle('modern', d !== 'classic')
    if (a !== 'violet') document.documentElement.dataset.accent = a
  }, [])

  function setDesign(d: Design) {
    setDesignState(d)
    try { localStorage.setItem(KEY, d) } catch {}
    document.documentElement.classList.toggle('modern', d !== 'classic')
  }

  function setAccent(a: Accent) {
    setAccentState(a)
    try { localStorage.setItem(ACCENT_KEY, a) } catch {}
    if (a === 'violet') delete document.documentElement.dataset.accent
    else document.documentElement.dataset.accent = a
  }

  return (
    <DesignContext.Provider value={{ design, setDesign, accent, setAccent }}>
      {children}
    </DesignContext.Provider>
  )
}

export function useDesign() {
  return useContext(DesignContext)
}
