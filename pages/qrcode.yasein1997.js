// pages/qrcode.yasein1997.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, getDocs, doc, updateDoc, getDoc,
  setDoc, query, orderBy, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  Users, Settings, Crown, Shield, DollarSign,
  Edit3, Check, X, Search, RefreshCw,
  QrCode, TrendingUp, ToggleLeft, ToggleRight
} from 'lucide-react';
import styles from '../styles/Admin.module.css';

export default function AdminPanel({ theme, toggleTheme }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [tab,         setTab]         = useState('users');
  const [users,       setUsers]       = useState([]);
  const [qrCodes,     setQrCodes]     = useState([]);
  const [pricing,     setPricing]     = useState({ highQuality: 5, gradient: 2, bgImage: 3, currency: 'EGP' });
  const [editPrice,   setEditPrice]   = useState(null);
  const [search,      setSearch]      = useState('');
  const [fetching,    setFetching]    = useState(false);
  const [stats,       setStats]       = useState({ users: 0, qr: 0, vip: 0, paid: 0 });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/');
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (isAdmin) { loadAll(); }
  }, [isAdmin]);

  const loadAll = () => { loadPricing(); loadUsers(); loadQR(); };

  const loadPricing = async () => {
    try {
      const snap = await getDoc(doc(db, 'pricing', 'config'));
      if (snap.exists()) {
        const d = snap.data();
        if (d.currency === 'EG') d.currency = 'EGP';
        setPricing(d);
      }
    } catch {}
  };

  const loadUsers = async () => {
    setFetching(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(list);
      setStats(s => ({
        ...s, users: list.length,
        vip: list.filter(u => u.freeAccess || u.role === 'vip' || u.role === 'admin').length,
      }));
    } catch (e) { toast.error('Failed to load users'); }
    finally { setFetching(false); }
  };

  const loadQR = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'qr_codes'), orderBy('createdAt', 'desc'), limit(100)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setQrCodes(list);
      setStats(s => ({ ...s, qr: snap.size, paid: list.filter(q => q.paid).length }));
    } catch {}
  };

  const toggleFree = async (uid, cur) => {
    try {
      await updateDoc(doc(db, 'users', uid), { freeAccess: !cur });
      setUsers(p => p.map(u => u.id === uid ? { ...u, freeAccess: !cur } : u));
      toast.success(!cur ? '✅ Free access granted' : '🔒 Access revoked');
    } catch { toast.error('Update failed'); }
  };

  const changeRole = async (uid, role) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setUsers(p => p.map(u => u.id === uid ? { ...u, role } : u));
      toast.success(`Role → ${role}`);
    } catch { toast.error('Update failed'); }
  };

  const savePricing = async () => {
    try {
      await setDoc(doc(db, 'pricing', 'config'), pricing);
      toast.success('Pricing saved ✓');
      setEditPrice(null);
    } catch { toast.error('Save failed'); }
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RefreshCw size={24} className={styles.spin} color="var(--accent)" />
    </div>
  );
  if (!isAdmin) return null;

  const TABS = [
    { id: 'users',   label: 'Users',      icon: Users },
    { id: 'pricing', label: 'Pricing',    icon: DollarSign },
    { id: 'qr',      label: 'QR History', icon: QrCode },
    { id: 'stats',   label: 'Stats',      icon: TrendingUp },
  ];

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div className={styles.wrap}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.adminTag}><Shield size={11} /> Admin Panel</div>
            <h1 className={styles.title}>Control Panel</h1>
            <p className={styles.sub}>Manage users, pricing, and QR history</p>
          </div>
          <div className={styles.statsRow}>
            {[
              { n: stats.users, l: 'Users' },
              { n: stats.qr,    l: 'QR Codes' },
              { n: stats.vip,   l: 'VIP' },
              { n: stats.paid,  l: 'Paid' },
            ].map((s, i) => (
              <div key={i} className={styles.statBox}>
                <span className={styles.statN}>{s.n}</span>
                <span className={styles.statL}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id}
                className={tab === t.id ? styles.tabOn : styles.tab}
                onClick={() => setTab(t.id)}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

            {/* ── USERS ── */}
            {tab === 'users' && (
              <div>
                <div className={styles.toolbar}>
                  <div className={styles.searchBox}>
                    <Search size={14} />
                    <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <button className="btn-ghost" onClick={loadUsers} style={{ padding: '9px 16px', fontSize: '13px' }}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr>
                      <th>User</th><th>Role</th><th>Free Access</th><th>QR Count</th>
                    </tr></thead>
                    <tbody>
                      {filtered.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className={styles.userCell}>
                              <div className={styles.ava}>{(u.name?.[0] || u.email?.[0] || '?').toUpperCase()}</div>
                              <div>
                                <div className={styles.uName}>{u.name || '—'}</div>
                                <div className={styles.uEmail}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <select className={styles.roleSelect} value={u.role || 'user'}
                              onChange={e => changeRole(u.id, e.target.value)}
                              disabled={u.id === user.uid}>
                              <option value="user">User</option>
                              <option value="vip">VIP</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            <button className={styles.toggleBtn}
                              onClick={() => toggleFree(u.id, u.freeAccess)}
                              disabled={u.id === user.uid}>
                              {u.freeAccess
                                ? <><ToggleRight size={22} color="var(--accent)" /> <span className={styles.on}>ON</span></>
                                : <><ToggleLeft  size={22} color="var(--text3)"  /> <span className={styles.off}>OFF</span></>}
                            </button>
                          </td>
                          <td><span className={styles.qrN}>{u.qrCount || 0}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className={styles.empty}><Users size={30} color="var(--border2)" /><p>No users found</p></div>
                  )}
                </div>
              </div>
            )}

            {/* ── PRICING ── */}
            {tab === 'pricing' && (
              <div className={styles.priceGrid}>
                {[
                  { key: 'highQuality', label: 'High Quality (1024px)' },
                  { key: 'gradient',    label: 'Ocean Gradient' },
                  { key: 'bgImage',     label: 'Background Image' },
                ].map(item => (
                  <div key={item.key} className={styles.priceCard}>
                    <div className={styles.priceTop}>
                      <div>
                        <div className={styles.priceLabel}>{item.label}</div>
                        <div className={styles.priceSub}>Per generation</div>
                      </div>
                      <button className={styles.editBtn}
                        onClick={() => setEditPrice(editPrice === item.key ? null : item.key)}>
                        <Edit3 size={13} />
                      </button>
                    </div>
                    {editPrice === item.key ? (
                      <div className={styles.priceEditBox}>
                        <div className={styles.priceInputRow}>
                          <span>{pricing.currency}</span>
                          <input type="number" min="0" step="0.5"
                            value={pricing[item.key]}
                            onChange={e => setPricing(p => ({ ...p, [item.key]: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <div className={styles.priceEditBtns}>
                          <button className="btn-primary" onClick={savePricing} style={{ padding: '8px 14px', fontSize: '13px' }}>
                            <Check size={12} /> Save
                          </button>
                          <button className="btn-ghost" onClick={() => setEditPrice(null)} style={{ padding: '8px 14px', fontSize: '13px' }}>
                            <X size={12} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.priceDisplay}>
                        <span className={styles.priceBig}>{pricing[item.key]}</span>
                        <span className={styles.priceCur}>{pricing.currency}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Currency card */}
                <div className={styles.priceCard}>
                  <div className={styles.priceLabel}>Currency</div>
                  <select className="input-field" style={{ marginTop: 10 }}
                    value={pricing.currency || 'EGP'}
                    onChange={e => setPricing(p => ({ ...p, currency: e.target.value }))}>
                    {['EGP','USD','EUR','GBP','SAR','AED'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn-primary" onClick={savePricing}
                    style={{ marginTop: 10, width: '100%', padding: '10px', fontSize: '13px' }}>
                    <Check size={13} /> Save
                  </button>
                </div>
              </div>
            )}

            {/* ── QR HISTORY ── */}
            {tab === 'qr' && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Type</th><th>Data</th><th>User</th><th>Quality</th><th>Paid</th></tr></thead>
                  <tbody>
                    {qrCodes.map(q => (
                      <tr key={q.id}>
                        <td><span className="badge badge-pro">{q.type}</span></td>
                        <td><span className={styles.uEmail}>{q.data?.slice(0, 35)}...</span></td>
                        <td><span className={styles.uEmail}>{q.uid?.slice(0, 10)}...</span></td>
                        <td><span className={styles.qrN}>{q.style?.quality || 'std'}</span></td>
                        <td>{q.paid ? <Check size={15} color="var(--success)" /> : <X size={15} color="var(--text3)" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {qrCodes.length === 0 && (
                  <div className={styles.empty}><QrCode size={30} color="var(--border2)" /><p>No QR codes yet</p></div>
                )}
              </div>
            )}

            {/* ── STATS ── */}
            {tab === 'stats' && (
              <div className={styles.statsGrid}>
                {[
                  { label: 'Total Users',        value: stats.users, color: '#0090c1' },
                  { label: 'QR Codes Generated', value: stats.qr,    color: '#38aecc' },
                  { label: 'VIP / Free Access',  value: stats.vip,   color: '#046e8f' },
                  { label: 'Paid Generations',   value: stats.paid,  color: '#183446' },
                ].map((s, i) => (
                  <motion.div key={i} className={styles.statCard}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}>
                    <div className={styles.statCardNum} style={{ color: s.color }}>{s.value}</div>
                    <div className={styles.statCardLabel}>{s.label}</div>
                  </motion.div>
                ))}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
