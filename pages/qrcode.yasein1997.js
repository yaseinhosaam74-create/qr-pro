// pages/qrcode.yasein1997.js
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, getDocs, doc, updateDoc,
  getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import {
  Users, Shield, DollarSign, Edit3, Check, X,
  Search, RefreshCw, QrCode, TrendingUp,
  ToggleLeft, ToggleRight, Lock, Eye, EyeOff,
  Phone, Bell, CheckCircle, XCircle, Clock,
  LogOut, Settings, Home
} from 'lucide-react';
import Link from 'next/link';
import styles from '../styles/Admin.module.css';

const SESSION_KEY = 'qrpro_admin_v3';

export default function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email,    setEmail]    = useState('');
  const [pass,     setPass]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [logging,  setLogging]  = useState(false);

  const [tab,      setTab]      = useState('orders');
  const [users,    setUsers]    = useState([]);
  const [qrCodes,  setQrCodes]  = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [pricing,  setPricing]  = useState({ highQuality:5, gradient:2, bgImage:3, currency:'EGP' });
  const [settings, setSettings] = useState({
    paymentPhone:   '+201121454510',
    adminEmail:     'yaseinhosaam74@gmail.com',
    adminEmailLogin:'yaseinhosaam74@gmail.com',
    adminPassword:  'admin1997',
  });
  const [editPrice, setEditPrice] = useState(null);
  const [search,    setSearch]    = useState('');
  const [fetching,  setFetching]  = useState(false);

  // ── Check session on mount ──
  useEffect(() => {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (s === 'ok') {
      setUnlocked(true);
      loadAll();
    }
    setChecking(false);
  }, []);

  // ── Login ──
  const handleLogin = async () => {
    if (!email || !pass) { toast.error('أدخل الإيميل وكلمة المرور'); return; }
    setLogging(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'admin'));
      if (snap.exists()) {
        const d = snap.data();
        const correctEmail = (d.adminEmailLogin || d.adminEmail || '').trim().toLowerCase();
        const correctPass  = d.adminPassword || 'admin1997';
        if (email.trim().toLowerCase() === correctEmail && pass === correctPass) {
          sessionStorage.setItem(SESSION_KEY, 'ok');
          setSettings(d);
          setUnlocked(true);
          toast.success('أهلاً بك 👋');
          loadAll();
        } else {
          toast.error('الإيميل أو كلمة المرور خاطئة');
        }
      } else {
        // First time — init settings
        if (email.trim().toLowerCase() === 'yaseinhosaam74@gmail.com' && pass === 'admin1997') {
          const init = {
            adminEmailLogin: 'yaseinhosaam74@gmail.com',
            adminEmail:      'yaseinhosaam74@gmail.com',
            adminPassword:   'admin1997',
            paymentPhone:    '+201121454510',
          };
          await setDoc(doc(db, 'settings', 'admin'), init);
          setSettings(init);
          sessionStorage.setItem(SESSION_KEY, 'ok');
          setUnlocked(true);
          toast.success('تم إنشاء الإعدادات الأولية!');
          loadAll();
        } else {
          toast.error('البيانات غير صحيحة');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('خطأ في الاتصال: ' + e.message);
    } finally {
      setLogging(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
    setEmail(''); setPass('');
  };

  // ── Load all data ──
  const loadAll = () => {
    loadSettings();
    loadPricing();
    loadUsers();
    loadQR();
    loadOrders();
  };

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'admin'));
      if (snap.exists()) setSettings(snap.data());
    } catch (e) { console.error('settings:', e); }
  };

  const loadPricing = async () => {
    try {
      const snap = await getDoc(doc(db, 'pricing', 'config'));
      if (snap.exists()) {
        const d = snap.data();
        setPricing({
          highQuality: Number(d.highQuality) || 5,
          gradient:    Number(d.gradient)    || 2,
          bgImage:     Number(d.bgImage)     || 3,
          currency:    d.currency === 'EG' ? 'EGP' : (d.currency || 'EGP'),
        });
      }
    } catch (e) { console.error('pricing:', e); }
  };

  const loadUsers = async () => {
    setFetching(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setUsers(list);
    } catch (e) {
      console.error('users error:', e.code, e.message);
      toast.error('فشل تحميل المستخدمين: ' + e.message);
    } finally {
      setFetching(false);
    }
  };

  const loadQR = async () => {
    try {
      const snap = await getDocs(collection(db, 'qr_codes'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setQrCodes(list.slice(0, 100));
    } catch (e) { console.error('qr:', e); }
  };

  const loadOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setOrders(list);
    } catch (e) { console.error('orders:', e.code, e.message); }
  };

  const approveOrder = async (orderId, customAmount) => {
    try {
      const amount = parseFloat(customAmount) || 0;
      await updateDoc(doc(db, 'orders', orderId), {
        status:       'approved',
        amount:       amount,
        paymentPhone: settings.paymentPhone || '+201121454510',
        reviewedAt:   new Date(),
      });
      setOrders(p => p.map(o =>
        o.id === orderId
          ? { ...o, status:'approved', amount, paymentPhone: settings.paymentPhone }
          : o
      ));
      toast.success('✅ تمت الموافقة وإعلام العميل');
    } catch (e) {
      console.error(e);
      toast.error('فشل: ' + e.message);
    }
  };

  const rejectOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status:'rejected', reviewedAt: new Date() });
      setOrders(p => p.map(o => o.id === orderId ? { ...o, status:'rejected' } : o));
      toast.success('تم الرفض');
    } catch { toast.error('فشل'); }
  };

  const toggleFree = async (uid, cur) => {
    try {
      await updateDoc(doc(db, 'users', uid), { freeAccess: !cur });
      setUsers(p => p.map(u => u.id === uid ? { ...u, freeAccess: !cur } : u));
      toast.success(!cur ? '✅ وصول مجاني مُفعَّل' : '🔒 تم الإلغاء');
    } catch (e) { toast.error('فشل: ' + e.message); }
  };

  const changeRole = async (uid, role) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setUsers(p => p.map(u => u.id === uid ? { ...u, role } : u));
      toast.success(`الدور → ${role}`);
    } catch { toast.error('فشل'); }
  };

  const savePricing = async () => {
    try {
      await setDoc(doc(db, 'pricing', 'config'), {
        highQuality: Number(pricing.highQuality),
        gradient:    Number(pricing.gradient),
        bgImage:     Number(pricing.bgImage),
        currency:    pricing.currency,
      });
      toast.success('تم حفظ الأسعار ✓');
      setEditPrice(null);
    } catch (e) { toast.error('فشل: ' + e.message); }
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'admin'), settings);
      toast.success('تم حفظ الإعدادات ✓');
    } catch (e) { toast.error('فشل: ' + e.message); }
  };

  const fmt = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ar-EG', { day:'numeric', month:'short', year:'numeric' });
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const pending  = orders.filter(o => o.status === 'pending');
  const FEATURE  = { highQuality:'جودة عالية (1024px)', gradient:'تدرج الألوان', bgImage:'صورة خلفية' };

  // ── Loading ──
  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <RefreshCw size={24} className={styles.spin} color="#0090c1" />
    </div>
  );

  // ══════════════════════════════
  // LOGIN GATE
  // ══════════════════════════════
  if (!unlocked) return (
    <div className={styles.gatePage}>
      <motion.div className={styles.gateCard}
        initial={{ opacity:0, y:24, scale:.97 }}
        animate={{ opacity:1, y:0, scale:1 }}
        transition={{ duration:.4 }}>

        <div className={styles.gateLogo}>
          <div className={styles.gateLogoIcon}><Shield size={22}/></div>
          <span>QR<span className={styles.pro}>Pro</span></span>
        </div>

        <h2 className={styles.gateTitle}>لوحة التحكم</h2>
        <p className={styles.gateSub}>للأدمن فقط — أدخل بياناتك للمتابعة</p>

        <div className={styles.gateFields}>
          <input
            className="input-field"
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoComplete="email"
            style={{ textAlign:'right' }}
          />
          <div className={styles.gateField}>
            <input
              className="input-field"
              type={showPass ? 'text' : 'password'}
              placeholder="كلمة المرور"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ direction:'ltr', textAlign:'left', paddingLeft:44 }}
              autoComplete="current-password"
            />
            <button className={styles.gateEye} onClick={() => setShowPass(p => !p)} type="button">
              {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </div>

        <motion.button className={`btn-primary ${styles.gateBtn}`}
          onClick={handleLogin} disabled={logging} whileTap={{ scale:.97 }}>
          {logging ? <RefreshCw size={15} className={styles.spin}/> : <Shield size={15}/>}
          {logging ? 'جارٍ التحقق...' : 'دخول لوحة التحكم'}
        </motion.button>

        <Link href="/" className={styles.gateBack}>
          <Home size={13}/> العودة للموقع
        </Link>

        <div className={styles.gateHint}>
          <p>الدخول الأول:</p>
          <p>📧 <code>yaseinhosaam74@gmail.com</code></p>
          <p>🔑 <code>admin1997</code></p>
          <p style={{ color:'var(--accent2)', marginTop:4 }}>غيّر البيانات من تبويب الإعدادات بعد الدخول</p>
        </div>
      </motion.div>
    </div>
  );

  // ══════════════════════════════
  // ADMIN DASHBOARD
  // ══════════════════════════════
  const TABS = [
    { id:'orders',   label:`الطلبات${pending.length > 0 ? ` (${pending.length})` : ''}`, icon:Bell },
    { id:'users',    label:'المستخدمون',  icon:Users },
    { id:'pricing',  label:'الأسعار',     icon:DollarSign },
    { id:'qr',       label:'سجل QR',      icon:QrCode },
    { id:'stats',    label:'إحصائيات',    icon:TrendingUp },
    { id:'settings', label:'الإعدادات',   icon:Settings },
  ];

  return (
    <div className={styles.dashPage}>

      {/* Admin Navbar */}
      <div className={styles.adminNav}>
        <div className={styles.adminNavInner}>
          <div className={styles.adminNavLogo}>
            <Shield size={16} color="white"/>
            <span>لوحة التحكم — QR Pro</span>
          </div>
          <div className={styles.adminNavActions}>
            <span className={styles.adminEmail}>{settings.adminEmailLogin || settings.adminEmail}</span>
            <Link href="/" className={styles.adminNavBtn}>
              <Home size={14}/> الموقع
            </Link>
            <button className={styles.adminLogout} onClick={handleLogout}>
              <LogOut size={14}/> خروج
            </button>
          </div>
        </div>
      </div>

      <div className={styles.wrap}>

        {/* Stats */}
        <div className={styles.statsStrip}>
          {[
            { n:users.length,   l:'مستخدمون',       color:'#0090c1' },
            { n:qrCodes.length, l:'كودات QR',        color:'#38aecc' },
            { n:pending.length, l:'طلبات جديدة',    color:'#f59e0b', alert:pending.length > 0 },
            { n:orders.length,  l:'إجمالي الطلبات', color:'#046e8f' },
          ].map((s, i) => (
            <div key={i} className={`${styles.stripItem} ${s.alert ? styles.stripAlert : ''}`}>
              <span className={styles.stripN} style={{ color:s.color }}>{s.n}</span>
              <span className={styles.stripL}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id}
                className={`${tab === t.id ? styles.tabOn : styles.tab} ${t.id === 'orders' && pending.length > 0 ? styles.tabAlert : ''}`}
                onClick={() => setTab(t.id)}>
                <Icon size={14}/> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }} transition={{ duration:.18 }}>

            {/* ORDERS */}
            {tab === 'orders' && (
              <div>
                <div className={styles.toolbar}>
                  <h2 className={styles.sectionTitle}>
                    <Bell size={18}/> الطلبات ({orders.length})
                  </h2>
                  <button className="btn-ghost" onClick={loadOrders}
                    style={{ padding:'8px 14px', fontSize:'13px' }}>
                    <RefreshCw size={13}/> تحديث
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className={styles.empty}>
                    <Bell size={32} color="var(--border2)"/>
                    <p>لا توجد طلبات بعد</p>
                    <p style={{ fontSize:12, color:'var(--text3)' }}>ستظهر الطلبات هنا عند إرسالها من المستخدمين</p>
                  </div>
                ) : (
                  <div className={styles.ordersWrap}>
                    {orders.map(order => (
                      <OrderCard key={order.id} order={order} settings={settings}
                        onApprove={approveOrder} onReject={rejectOrder}
                        fmt={fmt} styles={styles} FEATURE={FEATURE} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div>
                <div className={styles.toolbar}>
                  <div className={styles.searchBox}>
                    <Search size={14}/>
                    <input placeholder="ابحث بالاسم أو الإيميل..."
                      value={search} onChange={e => setSearch(e.target.value)}/>
                  </div>
                  <button className="btn-ghost" onClick={loadUsers}
                    style={{ padding:'8px 14px', fontSize:'13px' }}>
                    <RefreshCw size={13}/> تحديث
                  </button>
                </div>
                <div className={styles.tableWrap}>
                  {fetching ? (
                    <div className={styles.empty}>
                      <RefreshCw size={22} className={styles.spin} color="var(--accent)"/>
                      <p>جارٍ التحميل...</p>
                    </div>
                  ) : (
                    <table className={styles.table}>
                      <thead><tr>
                        <th>المستخدم</th><th>الانضمام</th><th>الدور</th><th>وصول مجاني</th><th>الكودات</th>
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
                            <td><span className={styles.uEmail}>{fmt(u.createdAt)}</span></td>
                            <td>
                              <select className={styles.roleSelect}
                                value={u.role || 'user'}
                                onChange={e => changeRole(u.id, e.target.value)}>
                                <option value="user">مستخدم</option>
                                <option value="vip">VIP</option>
                                <option value="admin">أدمن</option>
                              </select>
                            </td>
                            <td>
                              <button className={styles.toggleBtn}
                                onClick={() => toggleFree(u.id, u.freeAccess)}>
                                {u.freeAccess
                                  ? <><ToggleRight size={22} color="var(--accent)"/><span className={styles.on}>مفعّل</span></>
                                  : <><ToggleLeft  size={22} color="var(--text3)" /><span className={styles.off}>معطّل</span></>}
                              </button>
                            </td>
                            <td><span className={styles.qrN}>{u.qrCount || 0}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {!fetching && filtered.length === 0 && (
                    <div className={styles.empty}>
                      <Users size={28} color="var(--border2)"/>
                      <p>لا يوجد مستخدمون</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PRICING */}
            {tab === 'pricing' && (
              <div className={styles.priceGrid}>
                {[
                  { key:'highQuality', label:'جودة عالية (1024px)' },
                  { key:'gradient',    label:'تدرج الألوان' },
                  { key:'bgImage',     label:'صورة خلفية' },
                ].map(item => (
                  <div key={item.key} className={styles.priceCard}>
                    <div className={styles.priceTop}>
                      <div>
                        <div className={styles.priceLabel}>{item.label}</div>
                        <div className={styles.priceSub}>لكل توليد</div>
                      </div>
                      <button className={styles.editBtn}
                        onClick={() => setEditPrice(editPrice === item.key ? null : item.key)}>
                        <Edit3 size={13}/>
                      </button>
                    </div>
                    {editPrice === item.key ? (
                      <div className={styles.priceEditBox}>
                        <div className={styles.priceInputRow}>
                          <span>{pricing.currency}</span>
                          <input type="number" min="0" step="0.5"
                            value={pricing[item.key]}
                            onChange={e => setPricing(p => ({ ...p, [item.key]: parseFloat(e.target.value) || 0 }))}/>
                        </div>
                        <div className={styles.priceEditBtns}>
                          <button className="btn-primary" onClick={savePricing}
                            style={{ padding:'8px 14px', fontSize:'13px' }}>
                            <Check size={12}/> حفظ
                          </button>
                          <button className="btn-ghost" onClick={() => setEditPrice(null)}
                            style={{ padding:'8px 14px', fontSize:'13px' }}>
                            <X size={12}/> إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.priceDisplay}>
                        <span className={styles.priceBig}>{Number(pricing[item.key])}</span>
                        <span className={styles.priceCur}>{pricing.currency}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className={styles.priceCard}>
                  <div className={styles.priceLabel}>العملة</div>
                  <select className="input-field" style={{ marginTop:10 }}
                    value={pricing.currency || 'EGP'}
                    onChange={e => setPricing(p => ({ ...p, currency: e.target.value }))}>
                    {['EGP','USD','EUR','GBP','SAR','AED'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button className="btn-primary" onClick={savePricing}
                    style={{ marginTop:10, width:'100%', padding:'10px', fontSize:'13px' }}>
                    <Check size={13}/> حفظ
                  </button>
                </div>
              </div>
            )}

            {/* QR */}
            {tab === 'qr' && (
              <div>
                <div className={styles.toolbar}>
                  <span style={{ fontSize:14, color:'var(--text2)' }}>آخر {qrCodes.length} كود</span>
                  <button className="btn-ghost" onClick={loadQR}
                    style={{ padding:'8px 14px', fontSize:'13px' }}>
                    <RefreshCw size={13}/> تحديث
                  </button>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr>
                      <th>النوع</th><th>المحتوى</th><th>المستخدم</th><th>التاريخ</th><th>مدفوع</th>
                    </tr></thead>
                    <tbody>
                      {qrCodes.map(q => (
                        <tr key={q.id}>
                          <td><span className="badge badge-pro">{q.type}</span></td>
                          <td><span className={styles.uEmail}>{q.data?.slice(0, 40)}</span></td>
                          <td><span className={styles.uEmail}>{q.uid?.slice(0, 10)}...</span></td>
                          <td><span className={styles.uEmail}>{fmt(q.createdAt)}</span></td>
                          <td>{q.paid ? <Check size={15} color="var(--success)"/> : <X size={15} color="var(--text3)"/>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {qrCodes.length === 0 && (
                    <div className={styles.empty}>
                      <QrCode size={28} color="var(--border2)"/>
                      <p>لا توجد كودات</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STATS */}
            {tab === 'stats' && (
              <div className={styles.statsGrid}>
                {[
                  { label:'إجمالي المستخدمين',  value:users.length,   color:'#0090c1' },
                  { label:'كودات QR',            value:qrCodes.length, color:'#38aecc' },
                  { label:'طلبات معلقة',         value:pending.length, color:'#f59e0b' },
                  { label:'إجمالي الطلبات',      value:orders.length,  color:'#046e8f' },
                  { label:'طلبات مقبولة',        value:orders.filter(o=>o.status==='approved').length, color:'#10b981' },
                  { label:'VIP / مجاني',         value:users.filter(u=>u.freeAccess||u.role==='vip'||u.role==='admin').length, color:'#a855f7' },
                ].map((s, i) => (
                  <motion.div key={i} className={styles.statCard}
                    initial={{ opacity:0, scale:.9 }}
                    animate={{ opacity:1, scale:1 }}
                    transition={{ delay:i * .05 }}>
                    <div className={styles.statCardNum} style={{ color:s.color }}>{s.value}</div>
                    <div className={styles.statCardLabel}>{s.label}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* SETTINGS */}
            {tab === 'settings' && (
              <div className={styles.settingsWrap}>
                <div className={styles.settingCard}>
                  <h3><Phone size={16}/> رقم اتصالات كاش</h3>
                  <input className="input-field"
                    value={settings.paymentPhone || ''}
                    onChange={e => setSettings(p => ({ ...p, paymentPhone: e.target.value }))}
                    placeholder="+201121454510"
                    style={{ direction:'ltr', textAlign:'left' }}/>
                </div>
                <div className={styles.settingCard}>
                  <h3>📧 إيميل الدخول للوحة التحكم</h3>
                  <input className="input-field" type="email"
                    value={settings.adminEmailLogin || ''}
                    onChange={e => setSettings(p => ({ ...p, adminEmailLogin: e.target.value }))}
                    placeholder="admin@example.com"
                    style={{ direction:'ltr', textAlign:'left' }}/>
                </div>
                <div className={styles.settingCard}>
                  <h3><Lock size={16}/> كلمة مرور لوحة التحكم</h3>
                  <input className="input-field" type="password"
                    value={settings.adminPassword || ''}
                    onChange={e => setSettings(p => ({ ...p, adminPassword: e.target.value }))}
                    placeholder="كلمة المرور الجديدة"/>
                  <p className={styles.settingHint}>⚠️ بعد الحفظ ستحتاج لتسجيل الدخول مجدداً</p>
                </div>
                <button className="btn-primary" onClick={saveSettings}
                  style={{ padding:'12px 24px', fontSize:'15px', alignSelf:'flex-start' }}>
                  <Check size={15}/> حفظ الإعدادات
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Order Card Component ──
function OrderCard({ order, settings, onApprove, onReject, fmt, styles, FEATURE }) {
  const [amount,    setAmount]    = useState(Number(order.amount) || 0);
  const [approving, setApproving] = useState(false);

  const SC = {
    pending:   { label:'معلق',          color:'#f59e0b', Icon:Clock },
    approved:  { label:'تمت الموافقة', color:'#10b981', Icon:CheckCircle },
    rejected:  { label:'مرفوض',        color:'#ef4444', Icon:XCircle },
    paid:      { label:'تأكيد الدفع',  color:'#0090c1', Icon:Check },
    cancelled: { label:'ملغى',         color:'#606080', Icon:X },
  };
  const sc = SC[order.status] || SC.pending;
  const StatusIcon = sc.Icon;

  return (
    <div className={`${styles.orderCard} ${order.status === 'pending' ? styles.orderPending : ''}`}>
      <div className={styles.orderTop}>
        <div className={styles.orderUser}>
          <div className={styles.ava} style={{ width:36, height:36, fontSize:13 }}>
            {(order.userName?.[0] || order.userEmail?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <div className={styles.uName}>{order.userName || '—'}</div>
            <div className={styles.uEmail}>{order.userEmail}</div>
          </div>
        </div>
        <div className={styles.orderStatus}
          style={{ color:sc.color, background:`${sc.color}18`, border:`1px solid ${sc.color}35` }}>
          <StatusIcon size={12}/> {sc.label}
        </div>
      </div>

      <div className={styles.orderMeta}>
        <div><span>الميزة:</span> <strong>{FEATURE[order.feature] || order.feature}</strong></div>
        <div><span>السعر:</span> <strong>{Number(order.amount)} {order.currency}</strong></div>
        <div><span>التاريخ:</span> <strong>{fmt(order.createdAt)}</strong></div>
        <div><span>محتوى QR:</span> <strong className={styles.uEmail}>{order.qrData?.slice(0, 50)}</strong></div>
      </div>

      {order.status === 'pending' && (
        <div className={styles.orderActions}>
          <div className={styles.amountRow}>
            <label>المبلغ المستحق ({order.currency}) — اكتب 0 للمجان:</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" min="0" step="0.5"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className={styles.amountInput}/>
              <span className={styles.uEmail}>{order.currency}</span>
            </div>
          </div>
          <div className={styles.orderBtns}>
            <button className={styles.approveBtn}
              onClick={async () => { setApproving(true); await onApprove(order.id, amount); setApproving(false); }}
              disabled={approving}>
              {approving
                ? <RefreshCw size={13} className={styles.spin}/>
                : <CheckCircle size={13}/>}
              موافقة وإرسال للعميل
            </button>
            <button className={styles.rejectBtn} onClick={() => onReject(order.id)}>
              <XCircle size={13}/> رفض
            </button>
          </div>
        </div>
      )}

      {order.status === 'approved' && (
        <div className={styles.orderApprovedInfo}>
          <p>✅ تمت الموافقة — المبلغ: <strong>{Number(order.amount) === 0 ? 'مجاني 🎉' : `${Number(order.amount)} ${order.currency}`}</strong></p>
          <p>📱 رقم الدفع أُرسل: <strong>{settings.paymentPhone}</strong></p>
        </div>
      )}

      {order.status === 'paid' && (
        <div className={styles.orderApprovedInfo}
          style={{ borderColor:'rgba(0,144,193,.3)', background:'rgba(0,144,193,.05)' }}>
          <p>💰 <strong>المستخدم أرسل الدفع</strong> — تحقق من محفظة اتصالات كاش على {settings.paymentPhone}</p>
        </div>
      )}
    </div>
  );
}
