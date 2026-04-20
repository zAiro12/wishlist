import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import WishlistDetail from './pages/WishlistDetail'
import Header from './components/Header'
import { ThemeProvider } from './hooks/useTheme'

export default function App() {
  return (
    <ThemeProvider>
      <div className="app-root">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/wishlist/:id" element={<WishlistDetail />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  )
}
