'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Where the email-confirmation link lands. Supabase establishes the session from
// the link, then we greet the (now confirmed) user and send them into the app.
export default function WelcomePage() {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [name, setName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function apply(session: import('@supabase/supabase-js').Session | null) {
      setHasSession(!!session)
      setName(session?.user?.user_metadata?.full_name?.split(' ')[0] || '')
      setReady(true)
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    // The session can arrive a moment after load (token in the URL).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col">
      <div className="flex flex-col items-center justify-center pt-20 pb-8 px-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <span className="text-3xl">📋</span>
        </div>
        <h1 className="text-3xl font-bold text-white">ExamPrep</h1>
      </div>

      <div className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-10 pb-10 text-center">
        {!ready ? (
          <p className="text-gray-400 animate-pulse mt-6">Confirming your account…</p>
        ) : hasSession ? (
          <>
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-gray-900">
              {name ? `You're all set, ${name}!` : "You're all set!"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Your email is confirmed and your account is ready.
            </p>

            <div className="card border-amber-200 bg-amber-50 text-left mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="font-semibold text-amber-900 text-sm">You're on the free trial</p>
                  <p className="text-xs text-amber-700">Preview the first 20 questions of each bank. Ask your admin to unlock everything.</p>
                </div>
              </div>
            </div>

            <button onClick={() => { router.push('/dashboard'); router.refresh() }} className="btn-primary">
              Start studying →
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-gray-900">Email confirmed</h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">Please log in to continue.</p>
            <button onClick={() => router.push('/auth')} className="btn-primary">Go to log in</button>
          </>
        )}
      </div>
    </div>
  )
}
