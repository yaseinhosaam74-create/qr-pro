// components/Navbar.js
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  QrCode, Sun, Moon, Crown,
  User, LogOut, ChevronDown, History,
  Globe, LayoutDashboard
} from 'lucide-react';
import styles from '../styles/Navbar.module.css';

export default function Navbar({ theme, toggleTheme, lang, toggleLang }) {
  const { user, userData, logout, isVIP } = useAuth();
  const router  = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const ar = lang === 'ar';

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => { setOpen(false); await logout(); router.push('/'); };
  const initial = (userData?.name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <motion.nav className={styles.nav}
      initial={{ y:-80, opacity:0 }} animate={{ y:0, opacity:1 }}
      transition={{ duration:.45, ease:[0.16,1,0.3,1] }}>
      <div className={styles.inner}>

        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}><QrCode size={17}/></div>
          <span className={styles.logoTxt}>QR<span className="gradient-text">Pro</span></span>
        </Link>

        {/* Links */}
        <div className={styles.links}>
          <Link href="/" className={router.pathname==='/' ? styles.linkOn : styles.link}>
            {ar ? 'المولّد' : 'Generator'}
          </Link>
          {user && (
            <Link href="/dashboard" className={router.pathname==='/dashboard' ? styles.linkOn : styles.link}>
              {ar ? 'كوداتي' : 'My Codes'}
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>

          {/* Language Toggle */}
          <button className={styles.langBtn} onClick={toggleLang} title="تبديل اللغة / Switch Language">
            <Globe size={15}/>
            <span>{ar ? 'EN' : 'عر'}</span>
          </button>

          {/* Theme Toggle */}
          <button className={styles.iconBtn} onClick={toggleTheme}>
            <motion.div key={theme}
              initial={{ rotate:-90, opacity:0 }} animate={{ rotate:0, opacity:1 }}
              transition={{ duration:.25 }}>
              {theme==='dark' ? <Sun size={16}/> : <Moon size={16}/>}
            </motion.div>
          </button>

          {user ? (
            <>
              <div className={styles.menuWrap} ref={menuRef}>
                <button
                  className={`${styles.avatarBtn} ${open ? styles.avatarOpen : ''}`}
                  onClick={() => setOpen(o => !o)}>
                  <div className={styles.avatar}>{initial}</div>
                  {isVIP && <Crown size={8} className={styles.crownBadge}/>}
                  <ChevronDown size={12} className={`${styles.chevron} ${open ? styles.chevronUp : ''}`}/>
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div className={styles.dropdown}
                      initial={{ opacity:0, y:-8, scale:.96 }}
                      animate={{ opacity:1, y:0, scale:1 }}
                      exit={{ opacity:0, y:-8, scale:.96 }}
                      transition={{ duration:.15 }}>

                      <div className={styles.dropHeader}>
                        <div className={styles.dropAva}>{initial}</div>
                        <div>
                          <div className={styles.dropName}>{userData?.name || (ar ? 'مستخدم' : 'User')}</div>
                          <div className={styles.dropEmail}>{user.email}</div>
                        </div>
                        {isVIP && <span className="badge badge-vip" style={{marginRight:'auto'}}><Crown size={9}/> VIP</span>}
                      </div>

                      <div className={styles.dropDiv}/>

                      <Link href="/dashboard" className={styles.dropItem} onClick={()=>setOpen(false)}>
                        <History size={14}/> {ar ? 'كودات QR' : 'My QR Codes'}
                      </Link>
                      <Link href="/profile" className={styles.dropItem} onClick={()=>setOpen(false)}>
                        <User size={14}/> {ar ? 'حسابي' : 'My Account'}
                      </Link>

                      <div className={styles.dropDiv}/>
                      <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={handleLogout}>
                        <LogOut size={14}/> {ar ? 'تسجيل الخروج' : 'Sign Out'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.signInBtn}>
                {ar ? 'دخول' : 'Sign In'}
              </Link>
              <Link href="/login?mode=signup" className="btn-primary"
                style={{ padding:'8px 14px', fontSize:13 }}>
                {ar ? 'ابدأ مجاناً' : 'Get Started'}
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
