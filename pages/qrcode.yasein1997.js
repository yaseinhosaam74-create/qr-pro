// pages/qrcode.yasein1997.js
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, getDocs, doc, updateDoc,
  getDoc, setDoc, query, orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  Users, Shield, DollarSign, Edit3, Check, X,
  Search, RefreshCw, QrCode, TrendingUp,
  ToggleLeft, ToggleRight, Lock, Eye, EyeOff,
  Phone, Bell, CheckCircle, XCircle, Clock
} from 'lucide-react';
import styles from '../styles/Admin.module.css';

const ADMIN_PASS_KEY = 'qrpro_admin_session';

export default function AdminPanel({ theme, toggleTheme, lang }) {
  // ── Auth gate ──
  const [unlocked,  setUnlocked]  = useState(false);
  const [passInput, setPassInput] = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [checking,  setChecking]  = useState(false);

  // ── Data ──
  const [tab,       setTab]       = useState('orders');
  const [users,     setUsers]     = useState([]);
  const [qrCodes,   setQrCodes]   = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [pricing,   setPricing]   = useState({ highQuality:5, gradient:2, bgImage:3, currency:'EGP' });
  const [settings,  setSettings]  = useState({ paymentPhone:'+201121454510', adminEmail:'yaseinhosaam74@gmail.com', adminPassword:'' });
  const [editPrice, setEditPrice] = useState(null);
  const [search,    setSearch]    = useState('');
  const [fetching,  setFetching]  = useState(false);
  const [stats,     setStats]     = useState({ users:0, qr:0, vip:0, orders:0 });

  // Check session
  useEffect(() => {
    const session = sessionStorage.getItem(ADMIN_PASS_KEY);
    if (session === 'true') setUnlocked(true);
  }, []);

  const handleLogin = async () => {
    if (!passInput) { toast.error('Enter password'); return; }
    setChecking(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'admin'));
      if (snap.exists()) {
        const storedPass = snap.data().adminPassword;
        if (passInput === storedPass) {
          sessionStorage.setItem(ADMIN_PASS_KEY, 'true');
          setUnlocked(true);
          setSettings(snap.data());
          toast.success('Welcome, Admin! 👋');
          loadAll();
        } else {
          toast.error('Wrong password');
        }
      } else {
        // First time — create settings doc
        if (passInput === 'admin1997') {
          const initSettings = {
            adminPassword: 'admin1997',
            paymentPhone: '+201121454510',
            adminEmail: 'yaseinhosaam74@gmail.com',
          };
          await setDoc(doc(db, 'settings', 'admin'), initSettings);
          setSettings(initSettings);
          sessionStorage.setItem(ADMIN_PASS_KEY, 'true');
          setUnlocked(true);
          toast.success('First login! Change your password in Settings.');
          loadAll();
        } else {
          toast.error('Wrong password');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Connection error');
    } finally {
      setChecking(false);
    }
  };

  const loadAll = () => { loadPricing(); loadUsers(); loadQR(); loadOrders(); loadSettings(); };

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'admin'));
      if (snap.exists()) setSettings(snap.data());
    } catch {}
  };

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
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setUsers(list);
      setStats(s => ({ ...s, users:list.length, vip:list.filter(u=>u.freeAccess||u.role==='vip'||u.role==='admin').length }));
    } catch (e) { console.error(e); toast.error('Failed to load users'); }
    finally { setFetching(false); }
  };

  const loadQR = async () => {
    try {
      const snap = await getDocs(collection(db, 'qr_codes'));
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setQrCodes(list.slice(0,100));
      setStats(s => ({ ...s, qr:list.length }));
    } catch {}
  };

  const loadOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setOrders(list);
      setStats(s => ({ ...s, orders:list.filter(o=>o.status==='pending').length }));
    } catch {}
  };

  const approveOrder = async (orderId, userId, customAmount) => {
    try {
      const amount = customAmount !== undefined ? customAmount : orders.find(o=>o.id===orderId)?.amount;
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'approved',
        amount,
        paymentPhone: settings.paymentPhone,
        reviewedAt: new Date(),
      });
      setOrders(p => p.map(o => o.id===orderId ? { ...o, status:'approved', amount, paymentPhone:settings.paymentPhone } : o));
      toast.success('✅ Order approved — user notified');
    } catch { toast.error('Failed'); }
  };

  const rejectOrder = async (orderId) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status:'rejected', reviewedAt:new Date() });
      setOrders(p => p.map(o => o.id===orderId ? { ...o, status:'rejected' } : o));
      toast.success('Order rejected');
    } catch { toast.error('Failed'); }
  };

  const toggleFree = async (uid, cur) => {
    try {
      await updateDoc(doc(db,'users',uid), { freeAccess:!cur });
      setUsers(p => p.map(u => u.id===uid ? { ...u, freeAccess:!cur } : u));
      toast.success(!cur ? '✅ Free access granted' : '🔒 Revoked');
    } catch { toast.error('Failed'); }
  };

  const changeRole = async (uid, role) => {
    try {
      await updateDoc(doc(db,'users',uid), { role });
      setUsers(p => p.map(u => u.id===uid ? { ...u, role } : u));
      toast.success(`Role → ${role}`);
    } catch { toast.error('Failed'); }
  };

  const savePricing = async () => {
    try {
      await setDoc(doc(db,'pricing','config'), pricing);
      toast.success('Pricing saved ✓');
      setEditPrice(null);
    } catch { toast.error('Failed'); }
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db,'settings','admin'), settings);
      toast.success('Settings saved ✓');
    } catch { toast.error('Failed'); }
  };

  const formatDate = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ar-EG', { month:'short', day:'numeric', year:'numeric' });
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingOrders  = orders.filter(o => o.status === 'pending');
  const approvedOrders = orders.filter(o => o.status === 'approved');

  // ══════════════════════════════════════
  // LOGIN GATE
  // ══════════════════════════════════════
  if (!unlocked) return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} />
      <div className={styles.gateWrap}>
        <motion.div className={styles.gateCard}
          initial={{ opacity:0, y:24, scale:.96 }}
          animate={{ opacity:1, y:0, scale:1 }}
          transition={{ duration:.4 }}>

          <div className={styles.gateIcon}><Lock size={28} color="var(--accent2)" /></div>
          <h2 className={styles.gateTitle}>Admin Access</h2>
          <p className={styles.gateSub}>لوحة التحكم — أدخل كلمة المرور للمتابعة</p>

          <div className={styles.gateField}>
            <input
              className="input-field"
              type={showPass ? 'text' : 'password'}
              placeholder="Admin Password"
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
              style={{ paddingRight: 42 }}
            />
            <button className={styles.gateEye} onClick={() => setShowPass(p=>!p)}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <motion.button className={`btn-primary ${styles.gateBtn}`}
            onClick={handleLogin} disabled={checking}
            whileTap={{ scale:.97 }}>
            {checking ? <RefreshCw size={15} className={styles.spin} /> : <Shield size={15} />}
            {checking ? 'Checking...' : 'Enter Admin Panel'}
          </motion.button>

          <p className={styles.gateHint}>
            First time? Use password: <code>admin1997</code>
          </p>
        </motion.div>
      </div>
    </div>
  );

  // ══════════════════════════════════════
  // ADMIN PANEL
  // ══════════════════════════════════════
  const TABS = [
    { id:'orders',  label:`الطلبات ${pendingOrders.length > 0 ? `(${pendingOrders.length})` : ''}`, icon:Bell },
    { id:'users',   label:'المستخدمون', icon:Users },
    { id:'pricing', label:'الأسعار',    icon:DollarSign },
    { id:'qr',      label:'سجل QR',     icon:QrCode },
    { id:'stats',   label:'إحصائيات',   icon:TrendingUp },
    { id:'settings',label:'الإعدادات',  icon:Shield },
  ];

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} />
      <div className={styles.wrap}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.adminTag}><Shield size={11} /> Admin Panel</div>
            <h1 className={styles.title}>لوحة التحكم</h1>
            <p className={styles.sub}>{settings.adminEmail}</p>
          </div>
          <div className={styles.statsRow}>
            {[
              { n:stats.users,  l:'مستخدمون' },
              { n:stats.qr,     l:'كودات QR' },
              { n:stats.vip,    l:'VIP' },
              { n:pendingOrders.length, l:'طلبات جديدة', highlight: pendingOrders.length > 0 },
            ].map((s,i) => (
              <div key={i} className={`${styles.statBox} ${s.highlight ? styles.statHighlight : ''}`}>
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
                className={`${tab===t.id ? styles.tabOn : styles.tab} ${t.id==='orders' && pendingOrders.length>0 ? styles.tabAlert : ''}`}
                onClick={() => setTab(t.id)}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-8 }} transition={{ duration:.18 }}>

            {/* ── ORDERS ── */}
            {tab === 'orders' && (
              <div className={styles.ordersWrap}>
                {orders.length === 0 ? (
                  <div className={styles.empty}>
                    <Bell size={32} color="var(--border2)" />
                    <p>لا توجد طلبات بعد</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      settings={settings}
                      onApprove={approveOrder}
                      onReject={rejectOrder}
                      formatDate={formatDate}
                      styles={styles}
                    />
                  ))
                )}
              </div>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <div>
                <div className={styles.toolbar}>
                  <div className={styles.searchBox}>
                    <Search size={14} />
                    <input placeholder="ابحث بالاسم أو الإيميل..."
                      value={search} onChange={e=>setSearch(e.target.value)} />
                  </div>
                  <button className="btn-ghost" onClick={loadUsers} style={{ padding:'9px 14px', fontSize:'13px' }}>
                    <RefreshCw size={13} /> تحديث
                  </button>
                </div>
                <div className={styles.tableWrap}>
                  {fetching ? (
                    <div className={styles.empty}><RefreshCw size={22} className={styles.spin} color="var(--accent)" /><p>تحميل...</p></div>
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
                                <div className={styles.ava}>{(u.name?.[0]||u.email?.[0]||'?').toUpperCase()}</div>
                                <div>
                                  <div className={styles.uName}>{u.name||'—'}</div>
                                  <div className={styles.uEmail}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td><span className={styles.uEmail}>{formatDate(u.createdAt)}</span></td>
                            <td>
                              <select className={styles.roleSelect} value={u.role||'user'}
                                onChange={e=>changeRole(u.id,e.target.value)}>
                                <option value="user">مستخدم</option>
                                <option value="vip">VIP</option>
                                <option value="admin">أدمن</option>
                              </select>
                            </td>
                            <td>
                              <button className={styles.toggleBtn} onClick={()=>toggleFree(u.id,u.freeAccess)}>
                                {u.freeAccess
                                  ? <><ToggleRight size={22} color="var(--accent)" /><span className={styles.on}>مفعّل</span></>
                                  : <><ToggleLeft  size={22} color="var(--text3)"  /><span className={styles.off}>معطّل</span></>}
                              </button>
                            </td>
                            <td><span className={styles.qrN}>{u.qrCount||0}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {!fetching && filtered.length===0 && (
                    <div className={styles.empty}><Users size={28} color="var(--border2)" /><p>لا يوجد مستخدمون</p></div>
                  )}
                </div>
              </div>
            )}

            {/* ── PRICING ── */}
            {tab === 'pricing' && (
              <div className={styles.priceGrid}>
                {[
                  { key:'highQuality', label:'جودة عالية (1024px)' },
                  { key:'gradient',    label:'تدرج المحيط' },
                  { key:'bgImage',     label:'صورة خلفية' },
                ].map(item => (
                  <div key={item.key} className={styles.priceCard}>
                    <div className={styles.priceTop}>
                      <div>
                        <div className={styles.priceLabel}>{item.label}</div>
                        <div className={styles.priceSub}>لكل توليد</div>
                      </div>
                      <button className={styles.editBtn}
                        onClick={()=>setEditPrice(editPrice===item.key?null:item.key)}>
                        <Edit3 size={13} />
                      </button>
                    </div>
                    {editPrice===item.key ? (
                      <div className={styles.priceEditBox}>
                        <div className={styles.priceInputRow}>
                          <span>{pricing.currency}</span>
                          <input type="number" min="0" step="0.5" value={pricing[item.key]}
                            onChange={e=>setPricing(p=>({...p,[item.key]:parseFloat(e.target.value)||0}))} />
                        </div>
                        <div className={styles.priceEditBtns}>
                          <button className="btn-primary" onClick={savePricing} style={{padding:'8px 14px',fontSize:'13px'}}>
                            <Check size={12} /> حفظ
                          </button>
                          <button className="btn-ghost" onClick={()=>setEditPrice(null)} style={{padding:'8px 14px',fontSize:'13px'}}>
                            <X size={12} /> إلغاء
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
                <div className={styles.priceCard}>
                  <div className={styles.priceLabel}>العملة</div>
                  <select className="input-field" style={{marginTop:10}} value={pricing.currency||'EGP'}
                    onChange={e=>setPricing(p=>({...p,currency:e.target.value}))}>
                    {['EGP','USD','EUR','GBP','SAR','AED'].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn-primary" onClick={savePricing} style={{marginTop:10,width:'100%',padding:'10px',fontSize:'13px'}}>
                    <Check size={13} /> حفظ
                  </button>
                </div>
              </div>
            )}

            {/* ── QR HISTORY ── */}
            {tab === 'qr' && (
              <div>
                <div className={styles.toolbar}>
                  <span style={{fontSize:14,color:'var(--text2)'}}>آخر {qrCodes.length} كود</span>
                  <button className="btn-ghost" onClick={loadQR} style={{padding:'9px 14px',fontSize:'13px'}}>
                    <RefreshCw size={13} /> تحديث
                  </button>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>النوع</th><th>البيانات</th><th>المستخدم</th><th>التاريخ</th><th>الجودة</th><th>مدفوع</th></tr></thead>
                    <tbody>
                      {qrCodes.map(q=>(
                        <tr key={q.id}>
                          <td><span className="badge badge-pro">{q.type}</span></td>
                          <td><span className={styles.uEmail}>{q.data?.slice(0,30)}...</span></td>
                          <td><span className={styles.uEmail}>{q.uid?.slice(0,10)}...</span></td>
                          <td><span className={styles.uEmail}>{formatDate(q.createdAt)}</span></td>
                          <td><span className={styles.qrN}>{q.style?.quality||'عادي'}</span></td>
                          <td>{q.paid?<Check size={15} color="var(--success)"/>:<X size={15} color="var(--text3)"/>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {qrCodes.length===0&&<div className={styles.empty}><QrCode size={28} color="var(--border2)"/><p>لا توجد كودات</p></div>}
                </div>
              </div>
            )}

            {/* ── STATS ── */}
            {tab === 'stats' && (
              <div className={styles.statsGrid}>
                {[
                  { label:'إجمالي المستخدمين',  value:stats.users,            color:'#0090c1' },
                  { label:'كودات QR مُولَّدة',  value:stats.qr,               color:'#38aecc' },
                  { label:'مستخدمو VIP',         value:stats.vip,              color:'#046e8f' },
                  { label:'طلبات معلقة',         value:pendingOrders.length,   color:'#f59e0b' },
                  { label:'طلبات مقبولة',        value:approvedOrders.length,  color:'#10b981' },
                  { label:'إجمالي الطلبات',      value:orders.length,          color:'#183446' },
                ].map((s,i)=>(
                  <motion.div key={i} className={styles.statCard}
                    initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:i*.05}}>
                    <div className={styles.statCardNum} style={{color:s.color}}>{s.value}</div>
                    <div className={styles.statCardLabel}>{s.label}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {tab === 'settings' && (
              <div className={styles.settingsWrap}>
                <div className={styles.settingCard}>
                  <h3><Phone size={16} /> رقم الدفع (اتصالات كاش)</h3>
                  <input className="input-field" value={settings.paymentPhone||''}
                    onChange={e=>setSettings(p=>({...p,paymentPhone:e.target.value}))}
                    placeholder="+201121454510" />
                </div>
                <div className={styles.settingCard}>
                  <h3><Shield size={16} /> كلمة مرور الأدمن</h3>
                  <input className="input-field" type="password"
                    value={settings.adminPassword||''}
                    onChange={e=>setSettings(p=>({...p,adminPassword:e.target.value}))}
                    placeholder="كلمة المرور الجديدة" />
                  <p className={styles.settingHint}>⚠️ تغيير كلمة المرور سيتطلب منك الدخول مرة أخرى</p>
                </div>
                <div className={styles.settingCard}>
                  <h3>📧 إيميل الإشعارات</h3>
                  <input className="input-field" type="email"
                    value={settings.adminEmail||''}
                    onChange={e=>setSettings(p=>({...p,adminEmail:e.target.value}))}
                    placeholder="admin@example.com" />
                </div>
                <button className="btn-primary" onClick={saveSettings} style={{padding:'12px 24px',fontSize:'15px'}}>
                  <Check size={15} /> حفظ الإعدادات
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
function OrderCard({ order, settings, onApprove, onReject, formatDate, styles }) {
  const [customAmount, setCustomAmount] = useState(order.amount || '');
  const [approving, setApproving] = useState(false);

  const statusConfig = {
    pending:  { label:'قيد الانتظار', color:'#f59e0b', icon:Clock },
    approved: { label:'تمت الموافقة', color:'#10b981', icon:CheckCircle },
    rejected: { label:'مرفوض',        color:'#ef4444', icon:XCircle },
    paid:     { label:'مدفوع',        color:'#0090c1', icon:Check },
  };
  const sc = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  const FEATURE_LABELS = {
    highQuality: 'جودة عالية (1024px)',
    gradient:    'تدرج المحيط',
    bgImage:     'صورة خلفية',
  };

  return (
    <div className={`${styles.orderCard} ${order.status === 'pending' ? styles.orderPending : ''}`}>
      <div className={styles.orderTop}>
        <div className={styles.orderUser}>
          <div className={styles.ava} style={{width:36,height:36,fontSize:14}}>
            {(order.userName?.[0] || order.userEmail?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <div className={styles.uName}>{order.userName || '—'}</div>
            <div className={styles.uEmail}>{order.userEmail}</div>
          </div>
        </div>
        <div className={styles.orderStatus} style={{color:sc.color,background:`${sc.color}15`,border:`1px solid ${sc.color}30`}}>
          <StatusIcon size={12} /> {sc.label}
        </div>
      </div>

      <div className={styles.orderDetails}>
        <div className={styles.orderDetail}>
          <span>الميزة المطلوبة:</span>
          <strong>{FEATURE_LABELS[order.feature] || order.feature}</strong>
        </div>
        <div className={styles.orderDetail}>
          <span>المبلغ الافتراضي:</span>
          <strong>{order.amount} {order.currency}</strong>
        </div>
        <div className={styles.orderDetail}>
          <span>تاريخ الطلب:</span>
          <strong>{formatDate(order.createdAt)}</strong>
        </div>
        <div className={styles.orderDetail}>
          <span>بيانات QR:</span>
          <strong className={styles.uEmail}>{order.qrData?.slice(0,40)}...</strong>
        </div>
      </div>

      {order.status === 'pending' && (
        <div className={styles.orderActions}>
          <div className={styles.amountRow}>
            <label>المبلغ المستحق ({order.currency}):</label>
            <input type="number" min="0" step="0.5"
              value={customAmount}
              onChange={e=>setCustomAmount(parseFloat(e.target.value)||0)}
              className={styles.amountInput}
              placeholder={order.amount} />
            <span className={styles.amountHint}>يمكنك تعديل المبلغ أو تركه 0 للمجان</span>
          </div>
          <div className={styles.orderBtns}>
            <button className={styles.approveBtn}
              onClick={async()=>{ setApproving(true); await onApprove(order.id, order.uid, customAmount); setApproving(false); }}
              disabled={approving}>
              {approving ? <RefreshCw size={14} className={styles.spin} /> : <CheckCircle size={14} />}
              موافقة وإرسال للعميل
            </button>
            <button className={styles.rejectBtn} onClick={()=>onReject(order.id)}>
              <XCircle size={14} /> رفض
            </button>
          </div>
        </div>
      )}

      {order.status === 'approved' && (
        <div className={styles.orderApprovedInfo}>
          <p>✅ تمت الموافقة — المبلغ المستحق: <strong>{order.amount} {order.currency}</strong></p>
          <p>📱 رقم الدفع: <strong>{settings.paymentPhone}</strong></p>
          <p style={{color:'var(--text3)',fontSize:12}}>في انتظار تأكيد الدفع من العميل</p>
        </div>
      )}

      {order.status === 'paid' && (
        <div className={styles.orderApprovedInfo} style={{borderColor:'rgba(0,144,193,0.3)',background:'rgba(0,144,193,0.05)'}}>
          <p>💰 تم إرسال المبلغ من العميل — تحقق من محفظتك</p>
        </div>
      )}
    </div>
  );
}
