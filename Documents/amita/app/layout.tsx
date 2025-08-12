import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/context'
import { VoiceProfileProvider } from '@/lib/context/VoiceProfileContext'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const poppins = Poppins({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'amita.ai - Preserve Your Authentic Writing Voice',
  description: 'The only AI tool designed to make you a better human writer. Detect AI usage while building real writing skills and maintaining your authentic voice.',
  keywords: ['AI writing detection', 'authentic writing', 'writing analysis', 'AI detection', 'writing voice'],
  authors: [{ name: 'amita.ai' }],
  creator: 'amita.ai',
  publisher: 'amita.ai',
  metadataBase: new URL('https://amita.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'amita.ai - Preserve Your Authentic Writing Voice',
    description: 'For writers, students, and professionals who want to use AI tools without losing their authentic voice.',
    url: 'https://amita.ai',
    siteName: 'amita.ai',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'amita.ai - AI Writing Analysis Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'amita.ai - Preserve Your Authentic Writing Voice',
    description: 'The only AI tool designed to make you a better human writer.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased bg-white text-neutral-900">
        <AuthProvider>
          <VoiceProfileProvider>
            {children}
          </VoiceProfileProvider>
        </AuthProvider>
      </body>
    </html>
  )
}