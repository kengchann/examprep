'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserRole } from '@/lib/useUserRole'

const baseTabs = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/history', label: 'History', icon: '📊' },
]

const adminTabs = [
  { href: '/admin/banks', label: 'Banks', icon: '📚' },
  { href: '/admin/questions', label: 'Questions', icon: '✏️' },
  { href: '/admin/students', label: 'Students', icon: '👥' },
]

const settingsTab = { href: '/settings', label: 'Settings', icon: '⚙️' }

export default function BottomNav() {
  const pathname = usePathname()
  const { isAdmin } = useUserRole()
  const tabs = isAdmin
    ? [...baseTabs, ...adminTabs, settingsTab]
    : [...baseTabs, settingsTab]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${active ? 'text-brand-600' : 'text-gray-400'}`}>
            <span className="text-xl leading-none">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
