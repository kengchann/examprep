'use client'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

// The optional "Learn" hub — houses the new drills and links to the existing
// adaptive practice. Nothing here replaces Classic Review or Exam Simulation.
const TILES = [
  { href: '/learn/review', icon: '🔁', title: 'Review Queue', desc: 'Spaced repetition — resurfaces what you\'re about to forget' },
  { href: '/study/mistakes', icon: '📌', title: 'My Mistakes', desc: 'Auto-collected — stays until you mark it mastered' },
  { href: '/learn/confusion', icon: '🧠', title: 'Confusion Trainer', desc: 'Master commonly-confused services (SQS vs SNS, ALB vs NLB…)' },
  { href: '/learn/trigger', icon: '⚡', title: 'Trigger Trainer', desc: 'Recognize exam keywords → the right service, fast' },
  { href: '/learn/architecture', icon: '🏗️', title: 'Architecture Spotter', desc: 'Which service completes or fixes this design?' },
  { href: '/learn/mastery', icon: '📊', title: 'Mastery', desc: 'See your strength per topic (🔴🟡🟢)' },
  { href: '/study', icon: '📈', title: 'Adaptive practice & decks', desc: 'Weak areas, wrong answers, and starred questions' },
]

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-brand-600 px-4 pt-12 pb-5">
        <h1 className="text-white text-xl font-bold">Learn</h1>
        <p className="text-brand-200 text-sm mt-0.5">Different ways to learn — pick what fits today</p>
      </div>

      <div className="px-4 pt-5 space-y-3">
        {TILES.map(t => (
          <Link key={t.href} href={t.href} className="card flex items-center gap-3 active:scale-[0.98] transition-transform">
            <span className="text-2xl">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-400">{t.desc}</p>
            </div>
            <span className="text-brand-600 text-lg">→</span>
          </Link>
        ))}
        <p className="text-center text-xs text-gray-400 pt-3">
          Your timed exams and classic review are still on the Home screen — unchanged.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
