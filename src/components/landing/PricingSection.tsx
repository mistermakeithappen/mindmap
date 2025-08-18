'use client'

import { useState } from 'react'
import Link from 'next/link'

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const plans = [
    {
      name: 'Starter',
      price: billingPeriod === 'monthly' ? 0 : 0,
      description: 'Perfect for individuals getting started',
      features: [
        '3 Mind Maps',
        'Unlimited nodes per map',
        'Basic node types',
        'Auto-save',
        'Export to image',
        'Community support',
      ],
      cta: 'Start Free',
      ctaLink: '/auth/signup',
      popular: false,
      color: 'gray',
    },
    {
      name: 'Professional',
      price: billingPeriod === 'monthly' ? 19 : 190,
      description: 'For professionals and growing teams',
      features: [
        'Unlimited Mind Maps',
        'All node types',
        'Synapse nodes (nested canvases)',
        'Real-time collaboration',
        'Automation workflows',
        'Priority support',
        'Custom branding',
        'Advanced export options',
      ],
      cta: 'Start 14-Day Trial',
      ctaLink: '/auth/signup',
      popular: true,
      color: 'purple',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large teams with advanced needs',
      features: [
        'Everything in Professional',
        'Unlimited team members',
        'SSO & SAML',
        'Advanced security',
        'API access',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option',
      ],
      cta: 'Contact Sales',
      ctaLink: '#',
      popular: false,
      color: 'indigo',
    },
  ]

  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
            <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              That Scales With You
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start free and upgrade as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-600'
              }`}
            >
              Yearly
              <span className="ml-2 text-sm text-green-600">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 ${
                plan.popular ? 'ring-2 ring-purple-600' : ''
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  {typeof plan.price === 'number' ? (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="ml-2 text-gray-600">
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">{plan.price}</div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <svg 
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  href={plan.ctaLink}
                  className={`block w-full text-center px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            {['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'].map((company) => (
              <div key={company} className="text-2xl font-bold text-gray-400">
                {company}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Have questions?{' '}
            <Link href="#" className="text-purple-600 font-semibold hover:underline">
              Check our FAQ
            </Link>
            {' or '}
            <Link href="#" className="text-purple-600 font-semibold hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}