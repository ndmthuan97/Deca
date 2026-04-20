import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { AppBootstrap } from '@/components/AppBootstrap'

// Font: Mona Sans VF loaded via @font-face CDN in globals.css
// No next/font/local needed — just apply via font-sans Tailwind class

export const metadata: Metadata = {
  title: 'DACE - Learn English Conversational Phrases',
  description:
    'Learn English conversational phrases organized by topic. AI-powered phrase analysis with pronunciation, translation, and examples.',
  keywords: ['English learning', 'conversational English', 'ESL', 'DACE'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <AppBootstrap />
          {children}
          <Toaster richColors position="top-right" />
          <CommandPalette />
        </Providers>
      </body>
    </html>
  )
}
