// pages/_app.js
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  const [theme, setTheme] = useState('dark');
  const [lang,  setLang]  = useState('ar');

  useEffect(() => {
    const t = localStorage.getItem('theme') || 'dark';
    const l = localStorage.getItem('lang')  || 'ar';
    setTheme(t); setLang(l);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('dir',  l === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', l);
  }, []);

  const toggleTheme = () => {
    const n = theme === 'dark' ? 'light' : 'dark';
    setTheme(n); localStorage.setItem('theme', n);
    document.documentElement.setAttribute('data-theme', n);
  };

  const toggleLang = () => {
    const n = lang === 'ar' ? 'en' : 'ar';
    setLang(n); localStorage.setItem('lang', n);
    document.documentElement.setAttribute('dir',  n === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', n);
  };

  return (
    <AuthProvider>
      <Head>
        <title>QR Pro — مولّد كودات QR احترافي</title>
        <meta name="description" content="ولّد كودات QR عالية الجودة" />
        <meta name="theme-color" content="#08080f" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <Component {...pageProps} theme={theme} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} />
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'var(--bg2)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: '12px',
          fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }} />
    </AuthProvider>
  );
}
