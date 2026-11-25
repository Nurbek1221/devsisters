import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0d071d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://devsisters.uz'),
  title: {
    default: 'devsisters.uz — Raqamli avlod qizlar uchun o‘quv platformasi',
    template: '%s | devsisters.uz',
  },
  description:
    'O‘zbekistondagi qizlar uchun zamonaviy va bepul IT, til va fan ta‘lim platformasi. 8 ta yo‘nalish (IT va Dasturlash, Ingliz tili, Arab tili, Kimyo, Ona tili, Geografiya, Rus tili, Sport), AI repetitor va QR-kodli sertifikatlar.',
  authors: [{ name: 'Nurbek Jabborov', url: 'https://devsisters.uz' }],
  creator: 'Nurbek Jabborov',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    'devsisters',
    'devsisters.uz',
    'raqamli avlod qizlari',
    'qizlar IT ta‘lim',
    'bepul o‘quv platformasi',
    'IT va dasturlash',
    'ingliz tili',
    'arab tili',
    'kimyo',
    'ona tili',
    'geografiya',
    'rus tili',
    'sport',
  ],
  openGraph: {
    title: 'devsisters.uz — Raqamli avlod qizlar uchun o‘quv platformasi',
    description:
      '8 ta yo‘nalish, bepul video darslar, SisterAI 24/7 repetitor va QR-kodli sertifikatlar platformasi.',
    url: 'https://devsisters.uz',
    siteName: 'devsisters.uz',
    locale: 'uz_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'devsisters.uz — Raqamli avlod qizlari platformasi',
    description:
      'O‘zbekistondagi qizlar uchun bepul IT, tillar va fanlar akademiyasi.',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'devsisters.uz',
  url: 'https://devsisters.uz',
  description:
    'O‘zbekistondagi qizlar uchun IT, tillar, fanlar va sog‘lom turmush tarziga ixtisoslashgan bepul o‘quv va mentorlik platformasi.',
  founder: {
    '@type': 'Person',
    name: 'Nurbek Jabborov',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${plusJakarta.variable} scroll-smooth`}>
      <body className="min-h-screen w-full bg-[#0d071d] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
      </body>
    </html>
  );
}
