import type { Metadata } from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';

import { RegisterSW } from '@/components/register-sw';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MealTrack',
  description: 'Are you present at breakfast/lunch/dinner today?',
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
        {/*<RegisterSW />
        {typeof window !== 'undefined' && (
          <script>
            {`console.log('Service worker registered.');
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/service-worker.js');
            }`}
          </script>
        )}*/}
        {children} 
      </body>
    </html>
  );
}
