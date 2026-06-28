'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: name },
          // Send the confirmation link back to whatever site they signed up from
          // (production or localhost) instead of Supabase's default Site URL.
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      })
      if (error) setError(error.message)
      else if (data.session) {
        // Email confirmation is OFF → user is signed in right away.
        router.push('/dashboard'); router.refresh()
      } else {
        // Email confirmation is ON → they must confirm before logging in.
        setMessage('Account created! Check your email to confirm, then log in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Incorrect email or password.')
      else { router.push('/dashboard'); router.refresh() }
    }
    setLoading(false)
  }

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
        <div className="flex bg-gray-200 rounded-xl p-1 mb-6">
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
              {m === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

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
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input className="input-field" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{message}</div>}
          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
