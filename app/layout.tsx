import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HavenClean — Trusted, background-checked house cleaners near you',
  description:
    'Find background-checked, reviewed local cleaners and cleaning teams. See photos, bios, rates and reviews, then book the exact clean you need.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
