// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { QrCode, Crown, Download, Trash2, Link2, Wifi, Phone, Mail, Type, CreditCard } from 'lucide-react';
import styles from '../styles/Dashboard.module.css';

const TYPE_ICONS = { url: Link2, wifi: Wifi, phone: Phone, email: Mail, text: Type, vcard: CreditCard };

export default function Dashboard() {
  const { user, userData, isVIP, loading } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setFetching(true);
      try {
        const q = query(
          collection(db, 'qr_codes'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      setFetching(false);
    };
    load();
  }, [user]);

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <motion.div className={styles.header} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className={styles.title}>My QR Codes</h1>
            <p className={styles.sub}>
              {codes.length} code{codes.length !== 1 ? 's' : ''} generated
              {isVIP && <span className="badge badge-vip" style={{ marginLeft: 10 }}><Crown size={10} /> VIP</span>}
            </p>
          </div>
          <motion.button
            className="btn-primary"
            onClick={() => router.push('/')}
            whileTap={{ scale: 0.97 }}
          >
            <QrCode size={15} /> New QR Code
          </motion.button>
        </motion.div>

        {fetching ? (
          <div className={styles.loading}>Loading your QR codes...</div>
        ) : codes.length === 0 ? (
          <motion.div className={styles.empty} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <QrCode size={48} color="#3a3a5c" />
            <h3>No QR codes yet</h3>
            <p>Generate your first QR code to see it here</p>
            <button className="btn-primary" onClick={() => router.push('/')}>
              Get Started
            </button>
          </motion.div>
        ) : (
          <div className={styles.grid}>
            {codes.map((code, i) => {
              const Icon = TYPE_ICONS[code.type] || QrCode;
              return (
                <motion.div
                  key={code.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.typeIcon}>
                      <Icon size={16} />
                    </div>
                    <span className="badge badge-pro">{code.type}</span>
                    {code.style?.quality === 'high' && (
                      <span className="badge badge-vip" style={{ marginLeft: 'auto' }}>HD</span>
                    )}
                  </div>
                  <div className={styles.cardData}>{code.data?.slice(0, 60)}{code.data?.length > 60 ? '...' : ''}</div>
                  <div className={styles.cardMeta}>
                    <span style={{ color: code.style?.fg || '#fff', fontSize: 12 }}>
                      ● {code.style?.fg || '#fff'}
                    </span>
                    <span>{code.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
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
