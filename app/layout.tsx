import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SettingsProvider } from '@/lib/settings'
import { DesignProvider } from '@/lib/design'

// Loaded always, but only applied (via CSS variable) when Modern design is on.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://examprep-blue.vercel.app'),
  title: { default: 'ExamPrep', template: '%s · ExamPrep' },
  description: 'IT & Academic Exam Simulator — practice real exam questions, track your progress, and pass with confidence.',
  applicationName: 'ExamPrep',
  appleWebApp: { capable: true, title: 'ExamPrep', statusBarStyle: 'default' },
  openGraph: {
    title: 'ExamPrep',
    description: 'IT & Academic Exam Simulator',
    siteName: 'ExamPrep',
    type: 'website',
  },
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#534AB7',
}

// Runs before the page paints so dark mode / large text / modern design apply
// with no flash.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('examprep_settings')||'{}');var t=s.theme||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);var e=document.documentElement;if(d)e.classList.add('dark');if(s.fontSize==='large')e.classList.add('text-large');if(localStorage.getItem('ui-design')!=='classic')e.classList.add('modern');var a=localStorage.getItem('ui-accent');if(a&&a!=='violet')e.dataset.accent=a;}catch(_){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <SettingsProvider>
          <DesignProvider>{children}</DesignProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
