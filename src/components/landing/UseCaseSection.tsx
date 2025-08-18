'use client'

import { useState } from 'react'
import Image from 'next/image'

interface UseCase {
  id: string
  title: string
  subtitle: string
  description: string
  benefits: string[]
  icon: string
  color: string
  image?: string
}

export function UseCaseSection() {
  const [activeCase, setActiveCase] = useState('entrepreneurs')

  const useCases: UseCase[] = [
    {
      id: 'entrepreneurs',
      title: 'Entrepreneurs',
      subtitle: 'Turn Vision into Reality',
      description: 'Map out your business ideas, create pitch decks, and visualize your product roadmap. MindGrid helps you see the big picture while managing the details.',
      benefits: [
        'Business model canvas visualization',
        'Product roadmap planning',
        'Pitch deck organization',
        'Market research mapping',
        'Competitor analysis boards',
      ],
      icon: '🚀',
      color: '#8b5cf6',
    },
    {
      id: 'product-teams',
      title: 'Product Teams',
      subtitle: 'Build Better Products Together',
      description: 'Collaborate on feature planning, user journey mapping, and sprint organization. Keep your entire team aligned with visual workflows.',
      benefits: [
        'User story mapping',
        'Feature prioritization',
        'Sprint planning boards',
        'Dependency tracking',
        'Release planning',
      ],
      icon: '💻',
      color: '#6366f1',
    },
    {
      id: 'creative-teams',
      title: 'Creative Teams',
      subtitle: 'Unleash Creative Potential',
      description: 'Brainstorm campaigns, organize content calendars, and develop design systems. Transform creative chaos into structured brilliance.',
      benefits: [
        'Campaign brainstorming',
        'Content calendar planning',
        'Design system documentation',
        'Mood board creation',
        'Creative brief organization',
      ],
      icon: '🎨',
      color: '#ec4899',
    },
    {
      id: 'project-managers',
      title: 'Project Managers',
      subtitle: 'Master Complex Projects',
      description: 'Visualize project timelines, map dependencies, and organize resources. Keep stakeholders informed with clear, visual project updates.',
      benefits: [
        'Project timeline visualization',
        'Resource allocation mapping',
        'Risk assessment boards',
        'Stakeholder communication',
        'Task dependency tracking',
      ],
      icon: '📋',
      color: '#10b981',
    },
    {
      id: 'educators',
      title: 'Educators',
      subtitle: 'Enhance Learning Experiences',
      description: 'Create interactive course materials, develop curriculum maps, and facilitate visual learning. Make complex topics accessible and engaging.',
      benefits: [
        'Curriculum mapping',
        'Lesson plan organization',
        'Knowledge graphs',
        'Student collaboration spaces',
        'Visual study guides',
      ],
      icon: '🎓',
      color: '#f59e0b',
    },
  ]

  const currentCase = useCases.find(uc => uc.id === activeCase) || useCases[0]

  return (
    <section id="use-cases" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Built for Teams That
            <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Think Differently
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you&apos;re building a startup or managing enterprise projects, MindGrid adapts to your workflow
          </p>
        </div>

        {/* Use case selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {useCases.map((useCase) => (
            <button
              key={useCase.id}
              onClick={() => setActiveCase(useCase.id)}
              className={`px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                activeCase === useCase.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{useCase.icon}</span>
              {useCase.title}
            </button>
          ))}
        </div>

        {/* Active use case content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-purple-100 rounded-full">
              <span 
                className="text-2xl mr-2"
                style={{ filter: `hue-rotate(${useCases.indexOf(currentCase) * 30}deg)` }}
              >
                {currentCase.icon}
              </span>
              <span className="text-purple-700 font-semibold">{currentCase.subtitle}</span>
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900">
              Designed for {currentCase.title}
            </h3>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              {currentCase.description}
            </p>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Key Benefits:</h4>
              <ul className="space-y-2">
                {currentCase.benefits.map((benefit, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 transform transition-all duration-300"
                    style={{ 
                      transitionDelay: `${index * 50}ms`,
                      opacity: activeCase === currentCase.id ? 1 : 0,
                      transform: activeCase === currentCase.id ? 'translateX(0)' : 'translateX(-20px)'
                    }}
                  >
                    <svg 
                      className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4">
              <a 
                href="/auth/signup"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white font-semibold transform hover:scale-105 transition-all"
              >
                Start Free for {currentCase.title}
                <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right side - Visual representation */}
          <div className="relative">
            <div className="relative bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl p-8 min-h-[400px] overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full" 
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 80%, ${currentCase.color}40 0%, transparent 50%),
                                      radial-gradient(circle at 80% 20%, ${currentCase.color}30 0%, transparent 50%),
                                      radial-gradient(circle at 40% 40%, ${currentCase.color}20 0%, transparent 50%)`,
                  }}
                />
              </div>

              {/* Floating elements animation */}
              <div className="relative z-10 flex items-center justify-center h-full">
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                    <div
                      key={item}
                      className="w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center transform transition-all duration-500 hover:scale-110"
                      style={{
                        animation: `float ${3 + item * 0.5}s ease-in-out infinite`,
                        animationDelay: `${item * 0.2}s`,
                      }}
                    >
                      <span className="text-2xl opacity-70">
                        {['📝', '💡', '🎯', '📊', '🔗', '📌', '🌟', '⚡', '🚀'][item - 1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="absolute -bottom-6 left-8 right-8 bg-white rounded-xl shadow-xl p-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">85%</div>
                <div className="text-sm text-gray-600">Faster Planning</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="text-2xl font-bold text-indigo-600">3x</div>
                <div className="text-sm text-gray-600">More Productive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">92%</div>
                <div className="text-sm text-gray-600">Team Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-10px) rotate(5deg);
          }
          75% {
            transform: translateY(5px) rotate(-5deg);
          }
        }
      `}</style>
    </section>
  )
}