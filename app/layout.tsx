import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Nunito } from 'next/font/google';
import { daten } from '@/data/daten';
import './globals.css';

// Schriften werden beim Build heruntergeladen und mit der Seite ausgeliefert.
const grotesk = Inter({ subsets: ['latin'], weight: ['300', '400', '600'], variable: '--font-grotesk' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
// runde, schwere Schrift für den Chrom-Titel
const rund = Nunito({ subsets: ['latin'], weight: ['900'], variable: '--font-rund' });

export const metadata: Metadata = {
  title: daten.klasse,
  description: daten.untertitel,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#04061f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${grotesk.variable} ${mono.variable} ${rund.variable}`}>
      <body>{children}</body>
    </html>
  );
}
