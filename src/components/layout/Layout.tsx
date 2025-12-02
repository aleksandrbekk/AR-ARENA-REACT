import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-ar-black flex flex-col" style={{ height: '100vh' }}>
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: 'var(--safe-area-top)' }}>
        {children}
      </main>
      <div style={{ paddingBottom: 'var(--safe-area-bottom)' }}>
        <Navbar />
      </div>
    </div>
  )
}
