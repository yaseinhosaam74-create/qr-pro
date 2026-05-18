// pages/profile.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  doc, getDoc, getDocs, collection,
  query, where, updateDoc, deleteDoc, orderBy
} from 'firebase/firestore';
import {
  updateProfile, deleteUser,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  User, Mail, Crown, QrCode, Calendar,
  LogOut, Trash2, Lock, Check, X,
  Edit3, Shield, AlertTriangle, History
} from 'lucide-react';
import styles from '../styles/Profile.module.css';

export default function Profile({ theme, toggleTheme }) {
  const { user, userData, logout, isAdmin, isVIP, loading } = useAuth();
  const router = useRouter();

  const [qrCodes,      setQrCodes]      = useState([]);
  const [loadingQR,    setLoadingQR]    = useState(true);
  const [editName,     setEditName]     = useState(false);
  const [newName,      setNewName]      = useState('');
  const [showDelete,   setShowDelete]   = useState(false);
  const [deletePass,   setDeletePass]   = useState('');
  const [deleting,     setDeleting]     = useState(false);
  const [savingName,   setSavingName]   = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    setNewName(userData?.name || user.displayName || '');
    loadQR();
  }, [user, userData]);

  const loadQR = async () => {
    setLoadingQR(true);
    try {
      const q    = query(collection(db, 'qr_codes'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setQrCodes(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) { toast.error('Name cannot be empty'); return; }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { name: newName.trim() });
      toast.success('Name updated!');
      setEditName(false);
    } catch (e) {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePass) { toast.error('Enter your password'); return; }
    setDeleting(true);
    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, deletePass);
      await reauthenticateWithCredential(auth.currentUser, credential);
      // Delete Firestore data
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete Auth account
      await deleteUser(auth.currentUser);
      toast.success('Account deleted');
      router.replace('/');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        toast.error('Wrong password');
      } else {
        toast.error('Delete failed: ' + e.code);
      }
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const TYPE_COLORS = {
    url:   '#0090c1', text: '#38aecc', wifi: '#046e8f',
    phone: '#183446', email: '#10b981', vcard: '#a855f7'
  };

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.spinner} />
    </div>
  );

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <div className={styles.wrap}>

        {/* ── Profile Header ── */}
        <motion.div className={styles.profileCard}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          <div className={styles.avatarBig}>
            {(userData?.name?.[0] || user.email?.[0] || '?').toUpperCase()}
          </div>

          <div className={styles.profileInfo}>
            {editName ? (
              <div className={styles.editNameRow}>
                <input
                  className="input-field"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your name"
                  style={{ fontSize: 16 }}
                  autoFocus
                />
                <button className="btn-primary" onClick={handleSaveName}
                  disabled={savingName} style={{ padding: '10px 16px', fontSize: 14 }}>
                  {savingName ? '...' : <><Check size={14} /> Save</>}
                </button>
                <button className="btn-ghost" onClick={() => setEditName(false)}
                  style={{ padding: '10px 14px', fontSize: 14 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{userData?.name || 'No name set'}</h1>
                <button className={styles.editBtn} onClick={() => setEditName(true)}>
                  <Edit3 size={14} />
                </button>
              </div>
            )}

            <div className={styles.emailRow}>
              <Mail size={14} color="var(--text3)" />
              <span>{user.email}</span>
            </div>

            <div className={styles.badges}>
              {isAdmin && (
                <span className="badge badge-vip"><Shield size={10} /> Admin</span>
              )}
              {isVIP && !isAdmin && (
                <span className="badge badge-vip"><Crown size={10} /> VIP</span>
              )}
              {!isVIP && (
                <span className="badge badge-free"><User size={10} /> Free</span>
              )}
            </div>
          </div>

          <button className={styles.logoutBtn} onClick={logout}>
            <LogOut size={15} /> Sign Out
          </button>
        </motion.div>

        {/* ── Stats Row ── */}
        <div className={styles.statsRow}>
          {[
            { icon: QrCode,    label: 'QR Codes',    value: qrCodes.length },
            { icon: Calendar,  label: 'Member Since', value: formatDate(userData?.createdAt) },
            { icon: Crown,     label: 'Plan',         value: isAdmin ? 'Admin' : isVIP ? 'VIP' : 'Free' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} className={styles.statCard}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}>
                <div className={styles.statIcon}><Icon size={18} /></div>
                <div className={styles.statVal}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* ── QR History ── */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2><History size={18} /> QR Code History</h2>
            <span className={styles.count}>{qrCodes.length} codes</span>
          </div>

          {loadingQR ? (
            <div className={styles.loadingBox}><div className={styles.spinner} /></div>
          ) : qrCodes.length === 0 ? (
            <div className={styles.emptyBox}>
              <QrCode size={40} color="var(--border2)" />
              <p>No QR codes yet</p>
              <button className="btn-primary" onClick={() => router.push('/')}
                style={{ marginTop: 8, padding: '10px 20px', fontSize: 14 }}>
                Generate your first QR
              </button>
            </div>
          ) : (
            <div className={styles.qrGrid}>
              {qrCodes.map((qr, i) => (
                <motion.div key={qr.id} className={styles.qrCard}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className={styles.qrCardTop}>
                    <div className={styles.qrType}
                      style={{ background: `${TYPE_COLORS[qr.type] || '#0090c1'}20`,
                               color: TYPE_COLORS[qr.type] || '#0090c1',
                               border: `1px solid ${TYPE_COLORS[qr.type] || '#0090c1'}40` }}>
                      {qr.type?.toUpperCase()}
                    </div>
                    {qr.style?.quality === 'high' && (
                      <span className="badge badge-vip" style={{ fontSize: 9 }}>HD</span>
                    )}
                    {qr.paid && (
                      <span className="badge badge-pro" style={{ fontSize: 9, marginLeft: 'auto' }}>Paid</span>
                    )}
                  </div>
                  <div className={styles.qrData}>{qr.data?.slice(0, 50)}{qr.data?.length > 50 ? '…' : ''}</div>
                  <div className={styles.qrMeta}>
                    <div className={styles.qrColors}>
                      <div style={{ width: 12, height: 12, borderRadius: 3,
                        background: qr.style?.fg || '#fff',
                        border: '1px solid var(--border)' }} />
                      <div style={{ width: 12, height: 12, borderRadius: 3,
                        background: qr.style?.bg || '#000',
                        border: '1px solid var(--border)' }} />
                    </div>
                    <span>{formatDate(qr.createdAt)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── Danger Zone ── */}
        <div className={styles.dangerZone}>
          <div className={styles.dangerHeader}>
            <AlertTriangle size={16} color="var(--danger)" />
            <h3>Danger Zone</h3>
          </div>
          <p>Deleting your account is permanent and cannot be undone.</p>

          {!showDelete ? (
            <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
              <Trash2 size={15} /> Delete My Account
            </button>
          ) : (
            <motion.div className={styles.deleteConfirm}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}>
              <p className={styles.confirmTxt}>
                Enter your password to confirm account deletion:
              </p>
              <input
                className="input-field"
                type="password"
                placeholder="Your password"
                value={deletePass}
                onChange={e => setDeletePass(e.target.value)}
              />
              <div className={styles.confirmBtns}>
                <button className={styles.deleteBtn} onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting...' : <><Trash2 size={14} /> Confirm Delete</>}
                </button>
                <button className="btn-ghost" onClick={() => { setShowDelete(false); setDeletePass(''); }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
