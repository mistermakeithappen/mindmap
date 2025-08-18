'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { NavigationBar } from './NavigationBar'
import { HeroSection } from './HeroSection'
import { FeaturesSection } from './FeatureCard'
import { UseCaseSection } from './UseCaseSection'
import { PricingSection } from './PricingSection'
import { Footer } from './Footer'

export function LandingPageClient() {
  const searchParams = useSearchParams()
  const [showImportBanner, setShowImportBanner] = useState(false)
  const fromShare = searchParams.get('from') === 'share'
  const canvasId = searchParams.get('canvas')

  useEffect(() => {
    // Check if user came from a shared file or HTML export
    if (fromShare || canvasId) {
      setShowImportBanner(true)
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setShowImportBanner(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [fromShare, canvasId])

  return (
    <>
      {/* Import Detection Banner */}
      {showImportBanner && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 relative">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">
                {canvasId 
                  ? `Want to view this shared mind map? Sign up for free to import and edit it!`
                  : `Welcome! Sign up to import and edit shared mind maps with MindGrid.`
                }
              </span>
            </div>
            <button
              onClick={() => setShowImportBanner(false)}
              className="text-white/80 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <NavigationBar />
      <main className="overflow-x-hidden">
        <HeroSection />
        <FeaturesSection />
        <UseCaseSection />
        <PricingSection />
        
        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Ideas?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Join thousands of teams already using MindGrid to visualize success and execute with clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/auth/signup"
                className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold text-lg transform hover:scale-105 transition-all hover:shadow-2xl"
              >
                Start Your Free Trial
              </a>
              <a 
                href="#demo"
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold text-lg transform hover:scale-105 transition-all hover:bg-white/10"
              >
                Schedule a Demo
              </a>
            </div>
            <p className="mt-8 text-white/70 text-sm">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Loved by Visual Thinkers
              </h2>
              <p className="text-xl text-gray-600">
                See what our users are saying about MindGrid
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  quote: "MindGrid transformed how our team brainstorms. We went from chaotic meetings to structured, visual planning sessions.",
                  author: "Sarah Chen",
                  role: "Product Manager at TechCorp",
                  rating: 5,
                },
                {
                  quote: "The synapse nodes are game-changing. I can organize complex projects with infinite depth without losing clarity.",
                  author: "Marcus Rodriguez",
                  role: "Startup Founder",
                  rating: 5,
                },
                {
                  quote: "Finally, a mind mapping tool that actually thinks like I do. The automation features save me hours every week.",
                  author: "Emily Watson",
                  role: "Creative Director",
                  rating: 5,
                },
              ].map((testimonial, index) => (
                <div key={index} className="bg-white rounded-xl p-8 shadow-lg">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}