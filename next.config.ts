import type { NextConfig } from 'next';

// Statischer Export (Ordner "out") für GitHub Pages.
// Auf GitHub Pages liegt die Seite unter /<repository-name>/, das setzt die GitHub Action über NEXT_PUBLIC_BASE_PATH.
// Lokal (npm run dev) bleibt der Pfad leer.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
};

export default nextConfig;
