'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, GraduationCap, Sparkles, History, BarChart3, Settings,
  Library, PencilLine, Users,
} from 'lucide-react'

// Shared Modern-mode navigation used on every page (rendered by BottomNav when
// ui-design=modern): fixed sidebar on desktop, blurred bottom bar on mobile.
// The `modern-side` class is targeted by CSS to left-pad page content on lg+.

const MAIN = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', Icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', short: 'Learn', Icon: GraduationCap },
  { href: '/study', label: 'Study Tools', short: 'Study', Icon: Sparkles },
  { href: '/history', label: 'History', short: 'History', Icon: History },
  { href: '/learn/mastery', label: 'Analytics', short: '', Icon: BarChart3 },
  { href: '/settings', label: 'Settings', short: 'Settings', Icon: Settings },
]
const ADMIN = [
  { href: '/admin/banks', label: 'Banks', Icon: Library },
  { href: '/admin/questions', label: 'Questions', Icon: PencilLine },
  { href: '/admin/students', label: 'Students', Icon: Users },
]

export default function ModernNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const active = (href: string) =>
    href === '/learn' ? pathname === '/learn' || (pathname.startsWith('/learn/') && pathname !== '/learn/mastery')
    : pathname.startsWith(href)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="modern-side hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-m-surface border-r border-m-line z-40">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-m-line">
          <span className="w-8 h-8 rounded-xl bg-m-primary flex items-center justify-center text-base">📋</span>
          <span className="font-bold tracking-tight text-white">ExamPrep</span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {MAIN.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active(href) ? 'bg-m-primary/20 text-white' : 'text-m-muted hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={17} strokeWidth={2} />{label}
            </Link>
          ))}
          {isAdmin && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-m-muted/70">Admin</p>
              {ADMIN.map(({ href, label, Icon }) => (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active(href) ? 'bg-m-primary/20 text-white' : 'text-m-muted hover:text-white hover:bg-white/5'
                  }`}>
                  <Icon size={17} strokeWidth={2} />{label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-40 bg-m-surface/95 backdrop-blur-md border-t border-m-line flex">
        {MAIN.filter(t => t.short).map(({ href, short, Icon }) => (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-medium ${
              active(href) ? 'text-m-secondary' : 'text-m-muted'
            }`}>
            <Icon size={20} strokeWidth={active(href) ? 2.4 : 2} />{short}
          </Link>
        ))}
      </nav>
    </>
  )
}
