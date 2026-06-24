'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase'

export type Role = 'admin' | 'student'

// Fetches the signed-in user's role from the profiles table.
// Defaults to 'student' if no profile row exists yet.
export function useUserRole() {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (active) { setRole(null); setLoading(false) } return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (active) {
        setRole((data?.role as Role) ?? 'student')
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  return { role, loading, isAdmin: role === 'admin' }
}
