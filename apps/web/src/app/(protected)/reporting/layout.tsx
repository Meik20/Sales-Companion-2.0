import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reporting'
}

export default function ReportingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

