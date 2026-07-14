'use client'
import { useState } from 'react'
import { useDesign, type Design } from '@/lib/design'

// Compact design switcher for the exam screen, so a student can change the look
// mid-question. Safe to switch while answering: the design only decides which
// view ExamRunner renders — answers, position, timer and confirm state all live
// in ExamRunner's own state, which survives the swap.

const OPTIONS: { id: Design; label: string }[] = [
  { id: 'classic', label: '◱ Classic' },
  { id: 'modern', label: '✨ Modern' },
  { id: 'simulator', label: '🖥 Simulator' },
]

export default function DesignSwitch({ compact = false }: { compact?: boolean }) {
  const { design, setDesign } = useDesign()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch design"
        className={compact
          ? 'text-[13px] text-[#15599c] underline hover:text-[#0d3f74]'
          : 'text-lg active:scale-95'}>
        {compact ? 'Design' : '🎨'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {OPTIONS.map(o => (
              <button key={o.id}
                onClick={() => { setDesign(o.id); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-gray-100 ${
                  design === o.id ? 'text-brand-600 font-semibold' : 'text-gray-700'
                }`}>
                {o.label}{design === o.id ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
