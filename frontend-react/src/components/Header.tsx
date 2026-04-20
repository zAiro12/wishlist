import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function Header(){
  const {theme, toggle} = useTheme()
  return (
    <header className="header" role="banner">
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <Link to="/" aria-label="Home" style={{color:'inherit',textDecoration:'none',fontWeight:700}}>Wishlist</Link>
        <nav aria-label="Main navigation">
          <Link to="/" style={{color:'inherit',marginLeft:12}}>Home</Link>
        </nav>
      </div>
      <div>
        <button className="btn" onClick={toggle} aria-pressed={theme==='dark'} aria-label="Toggle tema">{theme==='dark'?'🌙':'☀️'}</button>
      </div>
    </header>
  )
}
