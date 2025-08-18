'use client'

import { useEffect, useRef, useState } from 'react'

interface FeatureCardProps {
  icon: string
  title: string
  description: string
  color: string
  delay?: number
}

export function FeatureCard({ icon, title, description, color, delay = 0 }: FeatureCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentCard = cardRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
        }
      },
      { threshold: 0.1 }
    )

    if (currentCard) {
      observer.observe(currentCard)
    }

    return () => {
      if (currentCard) {
        observer.unobserve(currentCard)
      }
    }
  }, [delay])

  return (
    <div
      ref={cardRef}
      className={`relative group transform transition-all duration-700 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      <div className="relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 overflow-hidden">
        {/* Background gradient */}
        <div 
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 transform translate-x-8 -translate-y-8"
          style={{ background: `radial-gradient(circle, ${color}, transparent)` }}
        />
        
        {/* Icon */}
        <div className="relative mb-6">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}40)` }}
          >
            {icon}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>

        {/* Hover effect line */}
        <div 
          className="absolute bottom-0 left-0 w-full h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
        />
      </div>
    </div>
  )
}

export function FeaturesSection() {
  const features = [
    {
      icon: '🧩',
      title: 'Drag & Drop Interface',
      description: 'Intuitive node-based system that makes organizing ideas as simple as dragging and dropping. Create complex mind maps in minutes.',
      color: '#8b5cf6',
    },
    {
      icon: '🌀',
      title: 'Synapse Nodes',
      description: 'Create nested canvases within nodes for infinite depth. Perfect for breaking down complex projects into manageable pieces.',
      color: '#6366f1',
    },
    {
      icon: '🤝',
      title: 'Real-time Collaboration',
      description: 'Work together with your team in real-time. Share ideas, comment, and build mind maps simultaneously.',
      color: '#ec4899',
    },
    {
      icon: '⚡',
      title: 'Automation Workflows',
      description: 'Visual automation builder with triggers and actions. Connect your ideas to create powerful automated workflows.',
      color: '#10b981',
    },
    {
      icon: '📊',
      title: 'Rich Media Support',
      description: 'Embed images, videos, files, and links directly into your mind maps. Keep all your resources in one place.',
      color: '#f59e0b',
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description: 'Your data is encrypted and secure. Control sharing permissions and keep sensitive information protected.',
      color: '#ef4444',
    },
  ]

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to
            <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Visualize Success
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed for teams who think visually and execute strategically
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              {...feature}
              delay={index * 100}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <a 
            href="/auth/signup"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white font-semibold text-lg transform hover:scale-105 transition-all"
          >
            Start Your Free Trial
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}