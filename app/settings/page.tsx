'use client'
import BottomNav from '@/components/BottomNav'
import { useSettings, tapFeedback, type Theme, type FontSize } from '@/lib/settings'
import type { ExamMode } from '@/lib/types'

// A segmented control (pick one of several).
function Segmented<T extends string>({ value, options, onChange }: {
  value: T
  options: { val: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-gray-200 rounded-xl p-1">
      {options.map(o => (
        <button key={o.val} onClick={() => onChange(o.val)}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
            value === o.val ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// An on/off switch.
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`w-12 h-7 rounded-full flex-shrink-0 transition-colors relative ${on ? 'bg-brand-600' : 'bg-gray-300'}`}>
      <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function SettingsPage() {
  const { settings, update } = useSettings()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Settings</h1>
        <p className="text-brand-200 text-sm mt-0.5">Personalize your experience</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Appearance */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600">Appearance</h2>
          <div className="card space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Theme</p>
              <Segmented<Theme>
                value={settings.theme}
                onChange={v => update({ theme: v })}
                options={[
                  { val: 'light', label: '☀️ Light' },
                  { val: 'dark', label: '🌙 Dark' },
                  { val: 'system', label: '⚙️ System' },
                ]}
              />
              <p className="text-xs text-gray-400 mt-1">System follows your device's light/dark setting.</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Text size</p>
              <Segmented<FontSize>
                value={settings.fontSize}
                onChange={v => update({ fontSize: v })}
                options={[
                  { val: 'normal', label: 'Normal' },
                  { val: 'large', label: 'Large' },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Exam preferences */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600">Exam</h2>
          <div className="card space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Default mode</p>
              <Segmented<ExamMode | 'ask'>
                value={settings.defaultMode}
                onChange={v => update({ defaultMode: v })}
                options={[
                  { val: 'ask', label: 'Ask' },
                  { val: 'practice', label: 'Practice' },
                  { val: 'learning', label: 'Learning' },
                  { val: 'custom', label: 'Custom' },
                ]}
              />
              <p className="text-xs text-gray-400 mt-1">Pre-select a mode on the home screen.</p>
            </div>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-800">Hide timer</span>
                <p className="text-xs text-gray-400">Hide the countdown during exams for less pressure.</p>
              </div>
              <Toggle on={settings.hideTimer} onChange={v => update({ hideTimer: v })} />
            </label>
          </div>
        </section>

        {/* Feedback */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-600">Feedback</h2>
          <div className="card">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-800">Sound &amp; vibration</span>
                <p className="text-xs text-gray-400">A tap sound and buzz when you select an answer.</p>
              </div>
              <Toggle on={settings.feedback} onChange={v => { update({ feedback: v }); if (v) tapFeedback(true) }} />
            </label>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pt-2">Settings are saved on this device.</p>
      </div>

      <BottomNav />
    </div>
  )
}
