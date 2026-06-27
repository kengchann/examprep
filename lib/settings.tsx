'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ExamMode } from './types'

export type Theme = 'light' | 'dark' | 'system'
export type FontSize = 'normal' | 'large'

export type Settings = {
  theme: Theme
  fontSize: FontSize
  defaultMode: ExamMode | 'ask'   // 'ask' = don't pre-select a mode
  hideTimer: boolean
  feedback: boolean               // tap sound + haptic vibration
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  fontSize: 'normal',
  defaultMode: 'ask',
  hideTimer: false,
  feedback: true,
}

const STORAGE_KEY = 'examprep_settings'

function readStored(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Apply theme + font size to the <html> element (kept in sync with the no-FOUC
// script in app/layout.tsx).
function applyToDocument(s: Settings) {
  const el = document.documentElement
  const dark = s.theme === 'dark' ||
    (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  el.classList.toggle('dark', dark)
  el.classList.toggle('text-large', s.fontSize === 'large')
}

type Ctx = {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, update: () => {} })

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  // Load once on mount (client only).
  useEffect(() => {
    const s = readStored()
    setSettings(s)
    applyToDocument(s)
  }, [])

  // Re-apply when the OS theme changes while on 'system'.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (settings.theme === 'system') applyToDocument(settings) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings])

  function update(patch: Partial<Settings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      applyToDocument(next)
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

// Fire a short tap sound + haptic buzz, respecting the user's feedback setting.
let audioCtx: AudioContext | null = null
export function tapFeedback(enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  try { navigator.vibrate?.(10) } catch {}
  try {
    audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = 420
    g.gain.value = 0.04
    o.connect(g); g.connect(audioCtx.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08)
    o.stop(audioCtx.currentTime + 0.09)
  } catch {}
}
