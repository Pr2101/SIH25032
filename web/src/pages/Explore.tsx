import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Explore() {
  const [state, setState] = useState('Jharkhand')
  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchPlaces() {
    setLoading(true)
    // Trigger server-side Gemini fetch & upsert
    try {
      setError('')
      const base = (import.meta as any).env?.VITE_SUPABASE_URL as string
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string
      const fnBase = base.replace('.supabase.co', '.functions.supabase.co')
      const resp = await fetch(`${fnBase}/places-fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anon}`, 'apikey': anon },
        body: JSON.stringify({ state })
      })
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(txt || `places-fetch failed (${resp.status})`)
      }
    } catch {}
    const { data } = await supabase
      .from('places')
      .select('place_id,name,short_desc,images')
      .ilike('state', `%${state}%`)
      .limit(20)
    setPlaces(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPlaces() }, [state])

  return (
    <div className="container">
      <section className="hero hero-bg">
        <h1 className="title">Discover {state}</h1>
        <p className="subtitle">Find top places, festivals and nearby attractions across India</p>
        
        <div style={{ maxWidth: '400px', margin: '2rem auto 0' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Select State</label>
          <select 
            className="input" 
            value={state} 
            onChange={(e) => setState(e.target.value)}
            style={{ fontSize: '1rem', padding: '1rem 1.25rem' }}
          >
            {[
              // States (28)
              'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
              // Union Territories (8)
              'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
            ].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </section>

      {loading && (
        <div className="text-center" style={{ padding: '2rem' }}>
          <div className="loading" style={{ margin: '0 auto 1rem' }}></div>
          <p className="muted">Discovering amazing places in {state}...</p>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      <div className="grid cards">
        {places.map(p => (
          <div key={p.place_id} className="place-card">
            {p.images?.[0] && (
              <img 
                src={p.images[0]} 
                alt={p.name}
                style={{ 
                  width: '100%', 
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '12px', 
                  marginBottom: '1rem',
                  border: '1px solid var(--border)'
                }} 
              />
            )}
            
            <h3>{p.name}</h3>
            <p>{p.short_desc}</p>
            
            <div className="buttons">
              <a className="btn" href={`/place/${p.place_id}`}>
                Explore Details
              </a>
              <a 
                className="btn secondary" 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + state)}`} 
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Map
              </a>
            </div>
          </div>
        ))}
        
        {!loading && places.length === 0 && (
          <div className="card text-center" style={{ gridColumn: '1 / -1', padding: '3rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>No places found yet</h3>
            <p className="muted">
              We're working on discovering amazing places in {state}. 
              Try switching to another state or check back later!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


