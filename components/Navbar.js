// components/Navbar.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { QrCode, LogOut, Settings, Sun, Moon, Crown, LayoutDashboard } from 'lucide-react';
import styles from '../styles/Navbar.module.css';

export default function Navbar({ theme, toggleTheme }) {
  const { user, userData, logout, isAdmin, isVIP } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <motion.nav
      className={styles.nav}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}><QrCode size={18} /></div>
          <span className={styles.logoText}>QR<span className="gradient-text">Pro</span></span>
        </Link>

        {/* Links */}
        <div className={styles.links}>
          <Link href="/" className={router.pathname === '/' ? styles.linkActive : styles.link}>Generator</Link>
          {user && (
            <Link href="/dashboard" className={router.pathname === '/dashboard' ? styles.linkActive : styles.link}>
              My Codes
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Theme Toggle */}
          <button className={styles.themeBtn} onClick={toggleTheme} title="Toggle theme">
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </motion.div>
          </button>

          {user ? (
            <>
              {isVIP && (
                <span className="badge badge-vip">
                  <Crown size={10} />
                  {isAdmin ? 'Admin' : 'VIP'}
                </span>
              )}
              {isAdmin && (
                <Link href="/qrcode.yasein1997" className={styles.iconBtn} title="Admin Panel">
                  <Settings size={16} />
                </Link>
              )}
              <Link href="/dashboard" className={styles.iconBtn} title="Dashboard">
                <LayoutDashboard size={16} />
              </Link>
              <div className={styles.avatar}>
                {userData?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.signInBtn}>Sign In</Link>
              <Link href="/login?mode=signup" className="btn-primary" style={{ padding: '8px 18px', fontSize: '14px' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
