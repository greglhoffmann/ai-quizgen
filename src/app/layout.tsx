/**
 * Root layout
 * - Applies global CSS and a simple header/nav.
 * - Wraps all pages; part of Next.js App Router conventions.
 */
import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI QuizGen',
  description: 'Generate AI-powered multiple-choice quizzes instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen text-gray-100">
        <div className="mx-auto max-w-3xl p-6">
          <header className="mb-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">AI QuizGen</h1>
                <p className="text-sm text-gray-400">Generate AI-powered multiple-choice quizzes instantly.</p>
              </div>
              <nav className="text-sm">
                <ul className="flex items-center gap-4">
                  <li><Link className="text-blue-400 hover:underline hover:text-blue-300" href="/">Home</Link></li>
                  <li><Link className="text-blue-400 hover:underline hover:text-blue-300" href="/results">Results</Link></li>
                  <li><Link className="text-blue-400 hover:underline hover:text-blue-300" href="/review">Review</Link></li>
                </ul>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
