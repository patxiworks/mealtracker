import type { Metadata } from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import ServiceWorkerCleanup from '@/components/sw-cleanup';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MealTicker',
  description: 'A quick way to tick off your availability at mealtimes',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <link rel="manifest" href="/manifest.json" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased  bg-[#e0e7fc]`}
      >
        {children} 
        <ServiceWorkerCleanup />
      </body>
    </html>
  );
}
