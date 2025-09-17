import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Navigation() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={isScrolled ? 'scrolled' : ''}>
      <div className="navwrap">
        <BrandLink />
        <div className="navlinks">
          <Link to="/home">Explore</Link>
          <Link to="/nearby">Nearby</Link>
          <Link to="/chat">Chat</Link>
          <Link to="/marketplace">Marketplace</Link>
          <AuthSlot />
        </div>
      </div>
    </nav>
  )

  function AuthSlot() {
    if (user) {
      return (
        <button 
          className="btn secondary" 
          onClick={async () => { 
            await signOut()
            navigate('/')
          }}
        >
          Logout
        </button>
      )
    }
    return <Link to="/login" className="btn secondary">Login</Link>
  }

  function BrandLink() {
    return (
      <div className="brand">
        <Link to={user ? '/home' : '/'}>Smart Tourism</Link>
      </div>
    )
  }
}
