'use client'
import { CATEGORY_META, STRENGTH_META, type TriggerCategory } from '@/lib/keywords'

// What the trigger-highlight colours and weights mean. Without this the colour
// coding is just decoration — the legend is what makes it teachable.

const ORDER: TriggerCategory[] = [
  'cost', 'ops', 'availability', 'performance', 'security',
  'integration', 'storage', 'data', 'network', 'migration',
]

export default function KeywordLegend() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {ORDER.map(c => (
          <span key={c} className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${CATEGORY_META[c].chip}`}>
            {CATEGORY_META[c].label}
          </span>
        ))}
      </div>
      <ul className="text-[12px] leading-relaxed space-y-0.5">
        <li><b className="underline decoration-2 underline-offset-2">Bold, solid underline</b> — {STRENGTH_META.strong.label.toLowerCase()}: {STRENGTH_META.strong.blurb.toLowerCase()}</li>
        <li><span className="underline decoration-dotted underline-offset-2">Dotted underline</span> — {STRENGTH_META.medium.label.toLowerCase()}: {STRENGTH_META.medium.blurb.toLowerCase()}</li>
        <li>Plain tint — {STRENGTH_META.weak.label.toLowerCase()}: {STRENGTH_META.weak.blurb.toLowerCase()}</li>
      </ul>
      <p className="text-[12px] leading-relaxed">Tap any highlighted phrase for what it points to and the trap it rules out.</p>
    </div>
  )
}
