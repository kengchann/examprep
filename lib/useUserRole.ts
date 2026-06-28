'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase'

export type Role = 'superadmin' | 'admin' | 'student'
export type Tier = 'trial' | 'full'

// Fetches the signed-in user's role + tier from the profiles table.
// Defaults to a trial student if no profile row exists yet.
export function useUserRole() {
  const [role, setRole] = useState<Role | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (active) { setRole(null); setTier(null); setLoading(false) } return }
      const { data } = await supabase.from('profiles').select('role, tier').eq('id', user.id).maybeSingle()
      if (active) {
        setRole((data?.role as Role) ?? 'student')
        setTier((data?.tier as Tier) ?? 'trial')
        setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const isAdmin = role === 'admin' || role === 'superadmin'
  return {
    role,
    tier,
    loading,
    isAdmin,                                   // admin OR superadmin
    isSuperadmin: role === 'superadmin',
    isTrial: role === 'student' && tier === 'trial',
  }
}
