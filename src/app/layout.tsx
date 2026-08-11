import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { CartProvider } from '@/components/CartProvider';

export const metadata: Metadata = {
  title: 'Outroll — Music promotion, curated',
  description:
    'Connect with independent music curators across Instagram, TikTok, YouTube Shorts, Twitter/X, Snapchat, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <CartProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
