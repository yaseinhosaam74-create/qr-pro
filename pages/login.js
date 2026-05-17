// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { QrCode, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import styles from '../styles/Login.module.css';

export default function Login({ theme, toggleTheme }) {
  const router            = useRouter();
  const { user, loading } = useAuth();
  const [mode,    setMode]    = useState('login');
  const [busy,    setBusy]    = useState(false);
  const [gBusy,   setGBusy]   = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [user, loading]);

  useEffect(() => {
    if (router.query.mode === 'signup') setMode('signup');
  }, [router.query]);

  // Handle Google redirect result (when popup is blocked)
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          toast.success('Signed in with Google! 🎉');
          router.replace('/');
        }
      } catch (err) {
        console.error('Redirect result error:', err.code, err.message);
      }
    };
    handleRedirect();
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleEmail = async () => {
    if (!form.email.trim() || !form.password) {
      toast.error('Please fill all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(
          auth, form.email.trim(), form.password
        );
        if (form.name.trim()) {
          await updateProfile(cred.user, { displayName: form.name.trim() });
        }
        toast.success('Account created! Welcome 🎉');
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
        toast.success('Welcome back!');
      }
      router.replace('/');
    } catch (err) {
      console.error('Email auth error:', err.code);
      const msgs = {
        'auth/user-not-found':       'No account with this email',
        'auth/wrong-password':       'Wrong password',
        'auth/invalid-credential':   'Invalid email or password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password':        'Password too weak (min 6)',
        'auth/invalid-email':        'Invalid email address',
        'auth/too-many-requests':    'Too many attempts — try later',
        'auth/network-request-failed': 'Network error — check connection',
      };
      toast.error(msgs[err.code] || `Error: ${err.code}`);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setGBusy(true);
    try {
      // Try popup first (works on desktop)
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        toast.success('Signed in with Google! 🎉');
        router.replace('/');
      }
    } catch (err) {
      console.error('Popup error:', err.code);
      // If popup blocked or not supported → fallback to redirect
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        try {
          toast('Redirecting to Google...', { icon: '🔄' });
          await signInWithRedirect(auth, googleProvider);
        } catch (e) {
          toast.error('Google sign-in failed');
          setGBusy(false);
        }
      } else {
        toast.error('Google sign-in failed: ' + err.code);
        setGBusy(false);
      }
    }
  };

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}>
      <div className={styles.spinSm} style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div className={styles.center}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles.logoIcon}><QrCode size={20} /></div>
            <span>QR<span className="gradient-text">Pro</span></span>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {['login', 'signup'].map(m => (
              <button key={m}
                className={mode === m ? styles.tabOn : styles.tab}
                onClick={() => setMode(m)}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google Button */}
          <button
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={gBusy}
          >
            {gBusy ? <div className={styles.spinSm} /> : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.251 17.64 11.943 17.64 9.2z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            {gBusy ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className={styles.divider}><span>or</span></div>

          {/* Form */}
          <div className={styles.form}>
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className={styles.field}>
                    <User size={14} className={styles.fIcon} />
                    <input className={styles.fInput} type="text" name="name"
                      placeholder="Full name" value={form.name}
                      onChange={handleChange} autoComplete="name" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.field}>
              <Mail size={14} className={styles.fIcon} />
              <input className={styles.fInput} type="email" name="email"
                placeholder="Email address" value={form.email}
                onChange={handleChange}
                onKeyDown={e => e.key === 'Enter' && handleEmail()}
                autoComplete="email" />
            </div>

            <div className={styles.field}>
              <Lock size={14} className={styles.fIcon} />
              <input className={styles.fInput}
                type={showPw ? 'text' : 'password'} name="password"
                placeholder="Password" value={form.password}
                onChange={handleChange}
                onKeyDown={e => e.key === 'Enter' && handleEmail()}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              <button className={styles.eyeBtn} onClick={() => setShowPw(p => !p)} type="button">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <motion.button
            className={`btn-primary ${styles.submitBtn}`}
            onClick={handleEmail}
            disabled={busy}
            whileTap={{ scale: 0.97 }}
          >
            {busy ? <div className={styles.spinSm} /> : <ArrowRight size={16} />}
            {busy ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </motion.button>

          <p className={styles.switchTxt}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button className={styles.switchBtn}
              onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? ' Sign up free' : ' Sign in'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
