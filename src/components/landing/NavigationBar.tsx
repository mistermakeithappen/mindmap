'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export function NavigationBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className={`font-bold text-xl ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                MindGrid
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')}
              className={`transition-colors ${
                scrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white/90 hover:text-white'
              }`}
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('use-cases')}
              className={`transition-colors ${
                scrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white/90 hover:text-white'
              }`}
            >
              Use Cases
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className={`transition-colors ${
                scrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white/90 hover:text-white'
              }`}
            >
              Pricing
            </button>
            <Link 
              href="/auth/login"
              className={`transition-colors ${
                scrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-white/90 hover:text-white'
              }`}
            >
              Sign In
            </Link>
            <Link 
              href="/auth/signup"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all transform hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
          >
            <svg 
              className={`w-6 h-6 ${scrolled ? 'text-gray-900' : 'text-white'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white rounded-lg shadow-lg mt-2 py-4">
            <button 
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('use-cases')}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Use Cases
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Pricing
            </button>
            <Link 
              href="/auth/login"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/signup"
              className="block mx-4 mt-2 text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-full"
            >
              Get Started Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}