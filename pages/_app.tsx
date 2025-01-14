import type { AppProps } from 'next/app';
import { Navigation } from '../components/Navigation';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Script from 'next/script';
import Head from 'next/head';
import '../styles/globals.css';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="color-scheme" content="light dark" />
      </Head>
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            } catch (_) {}
          `,
        }}
      />
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Navigation />
          <Component {...pageProps} />
        </div>
      </ThemeProvider>
    </>
  );
}
