'use client'
import { useRouter } from 'next/navigation'
import { CHANGELOG } from '@/lib/changelog'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-brand-600 px-4 pt-12 pb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl leading-none active:scale-95">←</button>
        <div>
          <h1 className="text-white text-xl font-bold">About &amp; What&apos;s New</h1>
          <p className="text-brand-200 text-sm mt-0.5">ExamPrep — IT &amp; Academic Exam Simulator</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <div className="card text-center py-5">
          <div className="text-4xl mb-1">📋</div>
          <p className="font-semibold text-gray-900">ExamPrep</p>
          <p className="text-xs text-gray-400 mt-0.5">Study smarter, pass sooner.</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">What&apos;s new</h2>
          <div className="space-y-3">
            {CHANGELOG.map(entry => (
              <div key={entry.date} className="card">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 text-sm">{entry.title}</p>
                  <span className="text-xs text-gray-400">{entry.date}</span>
                </div>
                <ul className="space-y-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 leading-snug flex gap-2">
                      <span className="text-brand-400 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">Thanks for studying with ExamPrep. 🎓</p>
      </div>
    </div>
  )
}
