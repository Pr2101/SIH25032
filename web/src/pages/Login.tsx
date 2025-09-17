import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'user'|'artisan'|'official'>('user')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else navigate('/home')
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data, error: fnErr } = await (supabase as any).functions.invoke('register', { body: { email, password, name, role } })
      if (fnErr) throw fnErr
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) throw signInErr
      navigate(role === 'artisan' ? '/nearby' : '/home')
    } catch (e: any) {
      // Show helpful message if function unreachable
      const msg = e?.message || 'Failed to reach server. Ensure Edge Function "register" is deployed and CORS/env are set.'
      setError(String(msg))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
      <div className="login-form">
        <h2>{creating ? 'Create Account' : 'Welcome Back'}</h2>
        
        <form onSubmit={creating ? signUp : signIn}>
          <div className="form-group">
            <input 
              className="input" 
              placeholder="Email address" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
            />
          </div>
          
          <div className="form-group">
            <input 
              className="input" 
              placeholder="Password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          
          {creating && (
            <>
              <div className="form-group">
                <label>Account Type</label>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="user">Traveler / User</option>
                  <option value="artisan">Artisan</option>
                  <option value="official">Official (restricted)</option>
                </select>
              </div>
              
              <div className="form-group">
                <input 
                  className="input" 
                  placeholder="Full name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
            </>
          )}
          
          {error && <div className="error">{error}</div>}
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn" type="submit" disabled={busy} style={{ flex: 1 }}>
              {busy ? <span className="loading"></span> : (creating ? 'Create Account' : 'Sign In')}
            </button>
          </div>
        </form>
        
        <div className="form-toggle">
          <button 
            type="button" 
            onClick={() => {
              setCreating(!creating)
              setError('')
            }}
          >
            {creating ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
        
        {creating && (
          <p className="muted text-center" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
            Officials must use allowed email domain configured on server.
          </p>
        )}
      </div>
    </div>
  )
}


