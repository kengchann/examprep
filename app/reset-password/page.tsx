'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Where the password-reset email link lands. Supabase puts a temporary recovery
// session in place when the user arrives here; we then set the new password.
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setHasSession(!!data.session); setReady(true) })
    // The recovery session may arrive a moment after load (token in the URL).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session); setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError(''); setMessage('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else {
      setMessage('Password updated! Taking you in…')
      setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1200)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col">
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Set a new password</h1>
      </div>

      <div className="flex-1 bg-gray-50 rounded-t-3xl px-6 pt-8 pb-10">
        {ready && !hasSession ? (
          <div className="text-center space-y-3">
            <p className="text-gray-700 font-medium">This page needs the reset link.</p>
            <p className="text-sm text-gray-500">Open the “Reset your password” email and tap the link in it — that brings you back here ready to set a new password.</p>
            <button onClick={() => router.push('/auth')} className="btn-primary mt-2">Back to log in</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">New password</label>
              <input className="input-field" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Confirm new password</label>
              <input className="input-field" type="password" placeholder="••••••••"
                value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
            {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{message}</div>}
            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? 'Please wait…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
