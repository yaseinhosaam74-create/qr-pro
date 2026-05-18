// components/Navbar.js
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  QrCode, Settings, Sun, Moon, Crown,
  User, LogOut, LayoutDashboard, ChevronDown, History
} from 'lucide-react';
import styles from '../styles/Navbar.module.css';

export default function Navbar({ theme, toggleTheme }) {
  const { user, userData, logout, isAdmin, isVIP } = useAuth();
  const router   = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef  = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  const initial = (userData?.name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <motion.nav
      className={styles.nav}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.inner}>

        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}><QrCode size={17} /></div>
          <span className={styles.logoTxt}>QR<span className="gradient-text">Pro</span></span>
        </Link>

        {/* Links */}
        <div className={styles.links}>
          <Link href="/"
            className={router.pathname === '/' ? styles.linkOn : styles.link}>
            Generator
          </Link>
          {user && (
            <Link href="/dashboard"
              className={router.pathname === '/dashboard' ? styles.linkOn : styles.link}>
              My Codes
            </Link>
          )}
        </div>

        {/* Right actions */}
        <div className={styles.actions}>

          {/* Theme toggle */}
          <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle theme">
            <motion.div key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </motion.div>
          </button>

          {user ? (
            <>
              {isAdmin && (
                <Link href="/qrcode.yasein1997" className={styles.iconBtn} title="Admin Panel">
                  <Settings size={16} />
                </Link>
              )}

              {/* User menu */}
              <div className={styles.menuWrap} ref={menuRef}>
                <button
                  className={`${styles.avatarBtn} ${open ? styles.avatarOpen : ''}`}
                  onClick={() => setOpen(o => !o)}
                >
                  <div className={styles.avatar}>{initial}</div>
                  {isVIP && <Crown size={9} className={styles.crownBadge} />}
                  <ChevronDown size={13} className={`${styles.chevron} ${open ? styles.chevronUp : ''}`} />
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      className={styles.dropdown}
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* User info */}
                      <div className={styles.dropHeader}>
                        <div className={styles.dropAvatar}>{initial}</div>
                        <div>
                          <div className={styles.dropName}>{userData?.name || 'User'}</div>
                          <div className={styles.dropEmail}>{user.email}</div>
                        </div>
                        {isVIP && (
                          <span className="badge badge-vip" style={{ marginLeft: 'auto' }}>
                            <Crown size={9} />
                            {isAdmin ? 'Admin' : 'VIP'}
                          </span>
                        )}
                      </div>

                      <div className={styles.dropDivider} />

                      <Link href="/dashboard" className={styles.dropItem}
                        onClick={() => setOpen(false)}>
                        <History size={15} /> My QR Codes
                      </Link>

                      <Link href="/profile" className={styles.dropItem}
                        onClick={() => setOpen(false)}>
                        <User size={15} /> My Account
                      </Link>

                      {isAdmin && (
                        <Link href="/qrcode.yasein1997" className={styles.dropItem}
                          onClick={() => setOpen(false)}>
                          <Settings size={15} /> Admin Panel
                        </Link>
                      )}

                      <div className={styles.dropDivider} />

                      <button className={`${styles.dropItem} ${styles.dropLogout}`}
                        onClick={handleLogout}>
                        <LogOut size={15} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.signInBtn}>Sign In</Link>
              <Link href="/login?mode=signup" className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '14px' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
