import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SettingsProvider } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'ExamPrep',
  description: 'IT & Academic Exam Simulator',
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// Runs before the page paints so dark mode / large text apply with no flash.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('examprep_settings')||'{}');var t=s.theme||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);var e=document.documentElement;if(d)e.classList.add('dark');if(s.fontSize==='large')e.classList.add('text-large');}catch(_){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  )
}
