'use client'

import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { StatsSection } from '@/components/landing/stats-section'
import { ProblemSection } from '@/components/landing/problem-section'
import { WorkflowSection } from '@/components/landing/workflow-section'
import { Features } from '@/components/landing/features'
import { DataTrustSection } from '@/components/landing/data-trust-section'
import { UseCasesSection } from '@/components/landing/use-cases-section'
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
        <StatsSection />
        <ProblemSection />
        <WorkflowSection />
        <Features />
        <DataTrustSection />
        <UseCasesSection />
        <Testimonials />
        <Pricing />
        <BlogSection />
        <Faq />
        <CtaFooter />
      </main>
    </div>
  )
}
