'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [canResend, setCanResend] = useState(false)   // offer to resend confirmation email
  const router = useRouter()
  const supabase = createClient()

  // If a session already exists (e.g. arriving here from a confirmation link),
  // skip the form and go straight into the app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [])

  function switchMode(m: Mode) {
    setMode(m); setError(''); setMessage(''); setCanResend(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage(''); setCanResend(false)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setMessage('If that email has an account, a password reset link is on its way. Check your inbox.')
      setLoading(false); return
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      })
      if (error) setError(error.message)
      else if (data.session) { router.push('/dashboard'); router.refresh() }   // confirmation off
      else { setMessage('Account created! Check your email to confirm your address, then log in.'); setCanResend(true) }
      setLoading(false); return
    }

    // login
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (/confirm/i.test(error.message)) {
        setError('Please confirm your email address first.')
        setCanResend(true)
      } else {
        setError('Incorrect email or password.')
      }
    } else { router.push('/dashboard'); router.refresh() }
    setLoading(false)
  }

  async function resendVerification() {
    if (!email) { setError('Enter your email above first.'); return }
    setLoading(true); setError(''); setMessage('')
    const { error } = await supabase.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    })
    if (error) setError(error.message)
    else { setMessage('Confirmation email re-sent. Check your inbox (and spam).'); setCanResend(false) }
    setLoading(false)
  }

  const title = mode === 'forgot' ? 'Reset password' : mode === 'signup' ? 'Create account' : 'Log in'

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col">
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <span className="text-3xl">📋</span>
        </div>
        <h1 className="text-3xl font-bold text-white">ExamPrep</h1>
        <p className="text-brand-200 text-sm mt-1">IT & Academic Exam Simulator</p>
      </div>

      <div className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-8 pb-10">
        {mode === 'forgot' ? (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800">Reset password</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your email and we’ll send you a link to set a new password.</p>
          </div>
        ) : (
          <div className="flex bg-gray-200 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Full name</label>
              <input className="input-field" type="text" placeholder="Juan Dela Cruz"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input className="input-field" type="email" placeholder="you@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="text-xs font-medium text-brand-600 active:scale-95">
                    Forgot password?
                  </button>
                )}
              </div>
              <input className="input-field" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{message}</div>}

          {canResend && (
            <button type="button" onClick={resendVerification} disabled={loading}
              className="w-full border border-brand-600 text-brand-600 font-medium py-2.5 rounded-xl active:scale-95">
              Resend confirmation email
            </button>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Please wait…'
              : mode === 'login' ? 'Log in'
              : mode === 'signup' ? 'Create account'
              : 'Send reset link'}
          </button>

          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('login')}
              className="w-full text-sm text-gray-500 py-1 active:scale-95">
              ← Back to log in
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
