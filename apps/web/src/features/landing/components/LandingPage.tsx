'use client'

import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Testimonials } from '@/components/landing/testimonials'
import { Pricing } from '@/components/landing/pricing'
import { BlogSection } from '@/components/landing/blog-section'
import { Faq } from '@/components/landing/faq'
import { CtaFooter } from '@/components/landing/cta-footer'

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <BlogSection />
        <Faq />
        <CtaFooter />
      </main>
    </div>
  )
}
