import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Place() {
  const { id } = useParams()
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('places').select('*').eq('place_id', id).single()
      if (data) setDetail(data)
      // Also call server to enrich with Gemini details
      try {
        const base = (import.meta as any).env?.VITE_SUPABASE_URL as string
        const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string
        const fnBase = base.replace('.supabase.co', '.functions.supabase.co')
        const r = await fetch(`${fnBase}/place-detail`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${anon}`, 'apikey': anon },
          body: JSON.stringify({ place_id: id })
        })
        if (r.ok) {
          const j = await r.json()
          setDetail(j)
        }
      } catch {}
    })()
  }, [id])

  if (!detail) return <div style={{ padding:16 }}>Loading...</div>
  const route = (detail.lat && detail.lon) ? `https://www.google.com/maps/dir/?api=1&destination=${detail.lat},${detail.lon}` : undefined
  const pano = (detail.lat && detail.lon) ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${detail.lat},${detail.lon}` : undefined

  return (
    <div className="container">
      <h2>{detail.name}</h2>
      <p>{detail.long_desc || detail.short_desc}</p>
      {detail.gemini?.history_summary && (
        <>
          <h3>History</h3>
          <p>{detail.gemini.history_summary}</p>
        </>
      )}
      {detail.gemini?.visiting_tips && (
        <>
          <h3>Visiting Tips</h3>
          <ul>
            {detail.gemini.visiting_tips.map((t:string, i:number) => <li key={i}>{t}</li>)}
          </ul>
        </>
      )}
      {detail.gemini?.suggested_itinerary_snippet && (
        <>
          <h3>1‑Day Itinerary</h3>
          <ul>
            {detail.gemini.suggested_itinerary_snippet.map((it:any, i:number) => <li key={i}><strong>{it.time}</strong> — {it.activity}</li>)}
          </ul>
        </>
      )}
      <div style={{ display:'flex', gap:12, marginTop:12 }}>
        {route && <a className="btn" href={route} target="_blank">Directions</a>}
        {pano && <a className="btn secondary" href={pano} target="_blank">Street View</a>}
      </div>
      {detail.lat && detail.lon && (
        <div style={{ marginTop:12 }}>
          <iframe
            title="map"
            width="100%"
            height="320"
            style={{ borderRadius: 8, border: '1px solid #1f2937' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${detail.lat},${detail.lon}&hl=en&z=13&output=embed`}
          />
        </div>
      )}
      {detail.images?.[0] && <img src={detail.images[0]} style={{ width:'100%', borderRadius:6, marginTop:12 }} />}
    </div>
  )
}


