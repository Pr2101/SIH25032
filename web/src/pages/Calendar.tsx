import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Festival {
  festival_id?: string
  name: string
  description: string
  festival_date: string | null
  duration_days: number
  significance: string
  traditions: string[]
  estimated_date: boolean
  gemini_processed: boolean
}

export default function Calendar() {
  const [selectedState, setSelectedState] = useState('Jharkhand')
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 
    'Ladakh', 'Lakshadweep', 'Puducherry'
  ]

  async function fetchFestivals() {
    setLoading(true)
    setError('')
    
    try {
      const base = import.meta.env.VITE_SUPABASE_URL as string
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const fnBase = base.replace('.supabase.co', '.functions.supabase.co')
      
      const response = await fetch(`${fnBase}/festivals-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anon}`,
          'apikey': anon
        },
        body: JSON.stringify({ state: selectedState })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Festivals API failed (${response.status})`)
      }

      const data = await response.json()
      setFestivals(data.festivals || [])
      setCached(data.cached || false)
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch festivals')
      console.error('Error fetching festivals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFestivals()
  }, [selectedState])

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Date TBD'
    
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function getDaysUntilFestival(dateString: string | null) {
    if (!dateString) return null
    
    const festivalDate = new Date(dateString)
    const today = new Date()
    const diffTime = festivalDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`
    } else if (diffDays === 0) {
      return 'Today!'
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else {
      return `In ${diffDays} days`
    }
  }

  function getFestivalStatus(dateString: string | null) {
    if (!dateString) return 'upcoming'
    
    const festivalDate = new Date(dateString)
    const today = new Date()
    const diffTime = festivalDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'past'
    if (diffDays <= 7) return 'soon'
    return 'upcoming'
  }

  return (
    <div className="container">
      <section className="hero hero-bg">
        <h1 className="title">Festival Calendar</h1>
        <p className="subtitle">Discover festivals and celebrations in {selectedState}</p>
        
        <div style={{ maxWidth: '400px', margin: '2rem auto 0' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
            Select State
          </label>
          <select 
            className="input" 
            value={selectedState} 
            onChange={(e) => setSelectedState(e.target.value)}
            style={{ fontSize: '1rem', padding: '1rem 1.25rem' }}
          >
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </section>

      {loading && (
        <div className="text-center" style={{ padding: '2rem' }}>
          <div className="loading" style={{ margin: '0 auto 1rem' }}></div>
          <p className="muted">Loading festivals for {selectedState}...</p>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      
      {cached && (
        <div className="success" style={{ marginBottom: '1rem' }}>
          📅 Showing cached festival data. Data may be updated periodically.
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {festivals.map((festival, index) => {
          const status = getFestivalStatus(festival.festival_date)
          const daysUntil = getDaysUntilFestival(festival.festival_date)
          
          return (
            <div key={index} className="place-card" style={{ position: 'relative' }}>
              {/* Status indicator */}
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: status === 'soon' ? 'var(--warning)' : 
                           status === 'past' ? 'var(--text-muted)' : 'var(--success)',
                color: status === 'soon' ? '#052e16' : 'white'
              }}>
                {status === 'soon' ? '🎉 Soon' : 
                 status === 'past' ? '📅 Past' : '📅 Upcoming'}
              </div>

              <h3 style={{ marginBottom: '0.5rem', paddingRight: '4rem' }}>
                {festival.name}
                {festival.estimated_date && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--warning)', 
                    marginLeft: '0.5rem',
                    fontWeight: 'normal'
                  }}>
                    (Estimated)
                  </span>
                )}
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>📅</span>
                  <span style={{ fontWeight: '600' }}>
                    {formatDate(festival.festival_date)}
                  </span>
                  {daysUntil && (
                    <span className="chip" style={{ 
                      background: 'var(--primary)', 
                      color: 'white',
                      fontSize: '0.75rem'
                    }}>
                      {daysUntil}
                    </span>
                  )}
                </div>
                
                {festival.duration_days > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1rem' }}>⏱️</span>
                    <span className="muted">
                      {festival.duration_days} day{festival.duration_days > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                {festival.description}
              </p>

              {festival.significance && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    color: 'var(--primary)'
                  }}>
                    Significance
                  </h4>
                  <p style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                    {festival.significance}
                  </p>
                </div>
              )}

              {festival.traditions && festival.traditions.length > 0 && (
                <div>
                  <h4 style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    color: 'var(--primary)'
                  }}>
                    Traditions
                  </h4>
                  <div className="chips">
                    {festival.traditions.map((tradition, idx) => (
                      <div key={idx} className="chip">
                        {tradition}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {festival.gemini_processed && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.5rem', 
                  background: 'rgba(79, 70, 229, 0.1)', 
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  textAlign: 'center'
                }}>
                  ✨ Enhanced with AI
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!loading && festivals.length === 0 && (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
            No festivals found
          </h3>
          <p className="muted">
            We're working on discovering festivals in {selectedState}. 
            Try selecting another state or check back later!
          </p>
        </div>
      )}
    </div>
  )
}
