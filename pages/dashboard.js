// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import {
  QrCode, Crown, Link2, Wifi, Phone,
  Mail, Type, CreditCard, User, Plus
} from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

const TYPE_ICONS = {
  url: Link2, wifi: Wifi, phone: Phone,
  email: Mail, text: Type, vcard: CreditCard
};
const TYPE_COLORS = {
  url:'#0090c1', text:'#38aecc', wifi:'#046e8f',
  phone:'#183446', email:'#10b981', vcard:'#a855f7'
};

export default function Dashboard({ theme, toggleTheme }) {
  const { user, userData, isVIP, loading } = useAuth();
  const router  = useRouter();
  const [codes,    setCodes]    = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setFetching(true);
      try {
        const q    = query(collection(db, 'qr_codes'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setCodes(list);
      } catch (e) { console.error(e); }
      finally { setFetching(false); }
    };
    load();
  }, [user]);

  const formatDate = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className={styles.spinner} />
    </div>
  );

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div className={styles.wrap}>

        {/* Header */}
        <motion.div className={styles.header}
          initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}>
          <div>
            <h1 className={styles.title}>My QR Codes</h1>
            <p className={styles.sub}>
              {codes.length} code{codes.length !== 1 ? 's' : ''} generated
              {isVIP && <span className="badge badge-vip" style={{ marginLeft:10 }}><Crown size={10} /> VIP</span>}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/profile" className="btn-ghost" style={{ padding:'9px 16px', fontSize:14 }}>
              <User size={15} /> My Account
            </Link>
            <Link href="/" className="btn-primary" style={{ padding:'9px 16px', fontSize:14 }}>
              <Plus size={15} /> New QR
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className={styles.statsRow}>
          {[
            { label: 'Total Generated', value: codes.length, color: '#0090c1' },
            { label: 'This Month',      value: codes.filter(c => {
                const d = c.createdAt?.toDate?.();
                if (!d) return false;
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length, color: '#38aecc' },
            { label: 'Paid Generations', value: codes.filter(c => c.paid).length, color: '#046e8f' },
          ].map((s, i) => (
            <div key={i} className={styles.statCard} style={{ borderTopColor: s.color }}>
              <div className={styles.statNum} style={{ color: s.color }}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* QR Grid */}
        {fetching ? (
          <div className={styles.loadingBox}><div className={styles.spinner} /></div>
        ) : codes.length === 0 ? (
          <motion.div className={styles.emptyBox}
            initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <QrCode size={52} color="var(--border2)" />
            <h3>No QR codes yet</h3>
            <p>Generate your first QR code to see it here</p>
            <Link href="/" className="btn-primary" style={{ marginTop:8 }}>
              <Plus size={15} /> Generate Now
            </Link>
          </motion.div>
        ) : (
          <div className={styles.grid}>
            {codes.map((code, i) => {
              const Icon  = TYPE_ICONS[code.type]  || QrCode;
              const color = TYPE_COLORS[code.type] || '#0090c1';
              return (
                <motion.div key={code.id} className={styles.card}
                  initial={{ opacity:0, y:16 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className={styles.cardTop}>
                    <div className={styles.typeChip}
                      style={{ background:`${color}18`, color, border:`1px solid ${color}35` }}>
                      <Icon size={12} />
                      {code.type?.toUpperCase()}
                    </div>
                    <div className={styles.cardBadges}>
                      {code.style?.quality === 'high' && (
                        <span className="badge badge-vip" style={{ fontSize:9 }}>HD</span>
                      )}
                      {code.paid && (
                        <span className="badge badge-pro" style={{ fontSize:9 }}>Paid</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardData}>
                    {code.data?.slice(0, 55)}{code.data?.length > 55 ? '…' : ''}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.colorDots}>
                      <div style={{ width:10, height:10, borderRadius:3,
                        background: code.style?.fg || '#fff',
                        border:'1px solid var(--border)' }} />
                      <div style={{ width:10, height:10, borderRadius:3,
                        background: code.style?.bg || '#000',
                        border:'1px solid var(--border)' }} />
                    </div>
                    <span className={styles.cardDate}>{formatDate(code.createdAt)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
