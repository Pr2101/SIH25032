import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function haversine(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371
  const dLat = (lat2-lat1) * Math.PI/180
  const dLon = (lon2-lon1) * Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R*c
}

export default function Nearby() {
  const [coords, setCoords] = useState({ lat: 23.36, lon: 85.33 })
  const [radius, setRadius] = useState(50)
  const [rows, setRows] = useState<any[]>([])
  const [geoError, setGeoError] = useState('')

  async function load() {
    const { data } = await supabase.from('places').select('place_id,name,lat,lon,images,short_desc,type').not('lat','is',null).not('lon','is',null).limit(200)
    setRows(data || [])
  }

  function useMyLocation() {
    setGeoError('')
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation not supported by this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lon: longitude })
        load()
      },
      (err) => {
        setGeoError(err.message || 'Unable to fetch location')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  useEffect(() => {
    // Try auto-fetch once on mount
    useMyLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    return rows
      .map(r => ({ ...r, distance_km: haversine(coords.lat, coords.lon, r.lat, r.lon) }))
      .filter(r => r.distance_km <= radius)
      .sort((a,b) => a.distance_km - b.distance_km)
  }, [rows, coords, radius])

  return (
    <div className="container">
      <section className="hero">
        <h1 style={{ margin:0 }}>Nearby</h1>
        <p className="muted">Find attractions around your coordinates.</p>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button className="btn" onClick={useMyLocation}>Use my location</button>
          <label>Lat</label><input className="input" type="number" value={coords.lat} onChange={e => setCoords({ ...coords, lat: parseFloat(e.target.value) })} />
          <label>Lon</label><input className="input" type="number" value={coords.lon} onChange={e => setCoords({ ...coords, lon: parseFloat(e.target.value) })} />
          <label>Radius (km)</label><input className="input" type="number" value={radius} onChange={e => setRadius(parseInt(e.target.value))} />
          <button className="btn" onClick={load}>Load</button>
        </div>
        {geoError && <div className="muted" style={{ color:'#ef4444', marginTop:6 }}>{geoError}</div>}
      </section>
      <div className="grid cards">
        {filtered.map(p => (
          <div key={p.place_id} className="card">
            {p.images?.[0] && <img src={p.images[0]} style={{ width:'100%', borderRadius:8, marginBottom:8 }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <strong>{p.name}</strong>
              <span className="muted" style={{ fontSize:12 }}>{p.distance_km.toFixed(1)} km</span>
            </div>
            <p className="muted" style={{ fontSize:13 }}>{p.short_desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


