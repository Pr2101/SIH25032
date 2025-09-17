import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Marketplace() {
  const { user, role, loading } = useAuth()
  const isArtisan = useMemo(() => role === 'artisan', [role])
  const [products, setProducts] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [imageUrl, setImageUrl] = useState('')
  const [contactInfo, setContactInfo] = useState('')

  async function loadProducts() {
    const { data } = await supabase.from('products').select('product_id,title,description,images,price,category,contact_info').order('created_at', { ascending: false }).limit(50)
    setProducts(data || [])
  }

  async function addProduct() {
    if (!isArtisan || !user) return
    const images = imageUrl ? [imageUrl] : []
    await supabase.from('products').insert({ 
      artisan_id: user.id, 
      title, 
      description, 
      price: price === '' ? null : Number(price), 
      images,
      contact_info: contactInfo || null
    })
    setTitle(''); setDescription(''); setPrice(''); setImageUrl(''); setContactInfo('')
    loadProducts()
  }

  useEffect(() => { loadProducts() }, [])

  if (loading) return <div className="container"><div className="muted">Loading...</div></div>

  return (
    <div className="container">
      <section className="hero hero-bg">
        <h1 className="title">Artisan Marketplace</h1>
        <p className="subtitle">Discover unique handmade products from local artisans across India</p>
      </section>

      {role === 'artisan' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Add New Product</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <input 
                className="input" 
                placeholder="Product title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <input 
                className="input" 
                placeholder="Image URL (optional)" 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <textarea 
                className="input" 
                placeholder="Product description" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group">
              <input 
                className="input" 
                placeholder="Price in ₹ (optional)" 
                type="number" 
                value={price as any} 
                onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <input 
                className="input" 
                placeholder="Contact info (phone, email, social media)" 
                value={contactInfo} 
                onChange={e => setContactInfo(e.target.value)} 
              />
            </div>
            <button 
              className="btn" 
              onClick={addProduct} 
              disabled={!title}
              style={{ justifySelf: 'start' }}
            >
              Add Product
            </button>
          </div>
        </div>
      )}

      <div className="grid cards">
        {products.map(p => (
          <div key={p.product_id} className="place-card">
            {p.images?.[0] && (
              <img 
                src={p.images[0]} 
                alt={p.title}
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
            
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            
            {p.price != null && (
              <div className="chip" style={{ 
                background: 'var(--accent)', 
                color: '#052e16', 
                fontWeight: '600',
                marginBottom: '1rem'
              }}>
                ₹ {p.price}
              </div>
            )}
            
            <div className="buttons">
              <button className="btn">Buy Now</button>
              {p.contact_info ? (
                <button 
                  className="btn secondary"
                  onClick={() => {
                    // Copy contact info to clipboard
                    navigator.clipboard.writeText(p.contact_info)
                    alert('Contact information copied to clipboard!')
                  }}
                >
                  Contact Artisan
                </button>
              ) : (
                <button className="btn secondary" disabled>
                  No Contact Info
                </button>
              )}
            </div>
          </div>
        ))}
        
        {products.length === 0 && (
          <div className="card text-center" style={{ gridColumn: '1 / -1', padding: '3rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>No products available yet</h3>
            <p className="muted">
              {role === 'artisan' 
                ? "Start by adding your first product above!" 
                : "Check back soon for amazing handmade products from local artisans."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


