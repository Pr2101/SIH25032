import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

type AuthContextType = {
  user: any
  loading: boolean
  role: 'user' | 'artisan' | 'official' | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'user'|'artisan'|'official'|null>(null)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null
      setUser(u)
      if (u) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', u.id).single()
        setRole((prof?.role as any) || null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => { sub?.subscription.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, role, signOut: async () => { await supabase?.auth.signOut() } }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }


