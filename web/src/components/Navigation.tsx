import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'


export default function Navigation() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!chatDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      const dropdown = document.getElementById('chat-dropdown-menu');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setChatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [chatDropdownOpen]);

  return (
    <nav className={isScrolled ? 'scrolled' : ''}>
      <div className="navwrap">
        <BrandLink />
        <div className="navlinks">
          <Link to="/home">Explore</Link>
          <Link to="/nearby">Nearby</Link>
          <Link to="/calendar">📅 Calendar</Link>
          <div className="dropdown" style={{ position: 'relative' }}>
            <button className="btn secondary" onClick={() => setChatDropdownOpen(v => !v)} aria-haspopup="true" aria-expanded={chatDropdownOpen}>
              Chat ▾
            </button>
            {chatDropdownOpen && (
              <div id="chat-dropdown-menu" className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, background: "rgba(0, 0, 200, 0.5)", width: '120px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', borderRadius: '4px', padding: '10px' }}>
                <Link to="/guide-chat" onClick={() => setChatDropdownOpen(false)}>Guide Chat</Link> <br />
                <a href="/Gemini-Landmark-Description-App/GeminiLandmarkApp/index.html" target="_blank" rel="noopener noreferrer" onClick={() => setChatDropdownOpen(false)}>Info Chat</a>
                {/* <a href="/Gemini-Landmark-Description-App/GeminiLandmarkApp/index.html">Info Chat</a> */}
              </div>
            )}
          </div>
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
