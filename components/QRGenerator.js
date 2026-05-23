// components/QRGenerator.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  doc, collection, addDoc, serverTimestamp,
  increment, updateDoc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Link2, Type, Wifi, Phone, Mail, CreditCard,
  Download, Palette, Settings2, Lock, Crown,
  Zap, Check, RefreshCw, QrCode,
  Image as ImageIcon, X as XIcon, LogIn, ShoppingCart
} from 'lucide-react';
import styles from '../styles/QRGenerator.module.css';

const QR_TYPES = [
  { id:'url',   label:'URL',     icon:Link2,      ph:'https://example.com' },
  { id:'text',  label:'Text',    icon:Type,       ph:'Enter any text...' },
  { id:'wifi',  label:'WiFi',    icon:Wifi,       ph:'Network name (SSID)' },
  { id:'phone', label:'Phone',   icon:Phone,      ph:'+20 123 456 7890' },
  { id:'email', label:'Email',   icon:Mail,       ph:'user@example.com' },
  { id:'vcard', label:'Contact', icon:CreditCard, ph:'Full Name' },
];

const QR_TYPES_AR = [
  { id:'url',   label:'رابط',         ph:'https://example.com' },
  { id:'text',  label:'نص',           ph:'أدخل أي نص...' },
  { id:'wifi',  label:'واي فاي',      ph:'اسم الشبكة' },
  { id:'phone', label:'هاتف',         ph:'+20 123 456 7890' },
  { id:'email', label:'إيميل',        ph:'user@example.com' },
  { id:'vcard', label:'جهة اتصال',   ph:'الاسم الكامل' },
];

const PALETTES = [
  { label:'Deep Space', fg:'#38aecc', bg:'#022f40' },
  { label:'Ocean',      fg:'#38aecc', bg:'#010d12' },
  { label:'Cerulean',   fg:'#ffffff', bg:'#046e8f' },
  { label:'Sky',        fg:'#022f40', bg:'#38aecc' },
  { label:'Marine',     fg:'#0090c1', bg:'#183446' },
  { label:'Classic',    fg:'#000000', bg:'#ffffff' },
  { label:'Pure Dark',  fg:'#ffffff', bg:'#000000' },
  { label:'Gold',       fg:'#f59e0b', bg:'#0a0800' },
  { label:'Emerald',    fg:'#10b981', bg:'#001a12' },
  { label:'Midnight',   fg:'#38aecc', bg:'#183446' },
];

const FEATURE_LABELS_AR = { highQuality:'جودة عالية (1024px)', gradient:'تدرج الألوان', bgImage:'صورة خلفية' };
const FEATURE_LABELS_EN = { highQuality:'High Quality (1024px)', gradient:'Color Gradient', bgImage:'Background Image' };

export default function QRGenerator({ lang }) {
  const ar = lang === 'ar';
  const { user, userData, isVIP } = useAuth();
  const router    = useRouter();
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);

  const [QRCodeLib,   setQRCodeLib]   = useState(null);
  const [activeType,  setActiveType]  = useState('url');
  const [inputValue,  setInputValue]  = useState('');
  const [extraFields, setExtraFields] = useState({});
  const [paletteIdx,  setPaletteIdx]  = useState(0);
  const [useCustom,   setUseCustom]   = useState(false);
  const [customFg,    setCustomFg]    = useState('#38aecc');
  const [customBg,    setCustomBg]    = useState('#022f40');
  const [quality,     setQuality]     = useState('standard');
  const [useGradient, setUseGradient] = useState(false);
  const [errorLevel,  setErrorLevel]  = useState('M');
  const [generating,  setGenerating]  = useState(false);
  const [qrDataUrl,   setQrDataUrl]   = useState(null);
  const [bgImage,     setBgImage]     = useState(null);
  const [bgOpacity,   setBgOpacity]   = useState(0.18);
  const [pricing,     setPricing]     = useState({ highQuality:5, gradient:2, bgImage:3, currency:'EGP' });
  const [modal,       setModal]       = useState(null);
  const [lockedFeat,  setLockedFeat]  = useState(null);
  const [ordering,    setOrdering]    = useState(false);

  useEffect(() => {
    import('qrcode').then(mod => setQRCodeLib(mod.default || mod));
  }, []);

  useEffect(() => {
    getDoc(doc(db, 'pricing', 'config')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.currency === 'EG') d.currency = 'EGP';
        // Ensure amounts are numbers
        setPricing({
          highQuality: Number(d.highQuality) || 5,
          gradient:    Number(d.gradient)    || 2,
          bgImage:     Number(d.bgImage)     || 3,
          currency:    d.currency || 'EGP',
        });
      }
    }).catch(() => {});
  }, []);

  const typesData = ar ? QR_TYPES_AR : QR_TYPES;

  const buildQRData = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return '';
    switch (activeType) {
      case 'url':   return val.startsWith('http') ? val : `https://${val}`;
      case 'wifi':  return `WIFI:T:WPA;S:${val};P:${extraFields.password || ''};H:false;;`;
      case 'phone': return `tel:${val}`;
      case 'email': return `mailto:${val}`;
      case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nFN:${val}\nTEL:${extraFields.phone || ''}\nEMAIL:${extraFields.email || ''}\nEND:VCARD`;
      default:      return val;
    }
  }, [activeType, inputValue, extraFields]);

  const checkPro = (feature) => {
    if (!user)  { setLockedFeat(feature); setModal('login'); return false; }
    if (!isVIP) { setLockedFeat(feature); setModal('pay');   return false; }
    return true;
  };

  // Create order in Firestore → redirect to order page
  const createOrder = async (feature) => {
    const data = buildQRData();
    if (!data) {
      toast.error(ar ? 'أدخل محتوى الكود أولاً' : 'Enter QR content first');
      setModal(null);
      return;
    }
    setOrdering(true);
    try {
      const featureLabels = ar ? FEATURE_LABELS_AR : FEATURE_LABELS_EN;
      // amount MUST be a number
      const amount = Number(pricing[feature]) || 0;

      const orderRef = await addDoc(collection(db, 'orders'), {
        uid:          user.uid,
        userEmail:    user.email,
        userName:     userData?.name || user.displayName || '',
        feature:      feature,
        featureLabel: featureLabels[feature],
        amount:       amount,          // ← number not string
        currency:     pricing.currency || 'EGP',
        status:       'pending',
        qrData:       data,            // ← full QR data
        qrType:       activeType,
        qrStyle: {
          fg:         useCustom ? customFg : PALETTES[paletteIdx].fg,
          bg:         useCustom ? customBg : PALETTES[paletteIdx].bg,
          quality:    quality,
          gradient:   useGradient,
          errorLevel: errorLevel,
        },
        createdAt: serverTimestamp(),
      });

      toast.success(ar ? '✅ تم إرسال طلبك!' : '✅ Order submitted!');
      setModal(null);
      router.push(`/order/${orderRef.id}`);
    } catch (e) {
      console.error('Order error:', e.code, e.message);
      toast.error(ar ? 'فشل إرسال الطلب: ' + e.message : 'Order failed: ' + e.message);
    } finally {
      setOrdering(false);
    }
  };

  const generateQR = useCallback(async () => {
    if (!QRCodeLib) { toast.error('Loading...'); return; }
    const data = buildQRData();
    if (!data) { toast.error(ar ? 'أدخل محتوى أولاً' : 'Enter content first'); return; }
    if (quality === 'high' && !checkPro('highQuality')) return;
    if (useGradient         && !checkPro('gradient'))   return;
    if (bgImage             && !checkPro('bgImage'))    return;

    setGenerating(true);
    try {
      const size = quality === 'high' ? 1024 : 500;
      const fg = useCustom ? customFg : PALETTES[paletteIdx].fg;
      const bg = useCustom ? customBg : PALETTES[paletteIdx].bg;

      const dataUrl = await QRCodeLib.toDataURL(data, {
        width: size, margin: 2,
        errorCorrectionLevel: errorLevel,
        color: { dark: fg, light: bg },
      });

      if (!bgImage && !useGradient) {
        setQrDataUrl(dataUrl);
        if (user) await saveQR(data, fg, bg, false, false);
        toast.success(ar ? 'تم التوليد! ✓' : 'QR Generated! ✓');
        setGenerating(false);
        return;
      }

      const canvas = canvasRef.current;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (bgImage) {
        await new Promise((res, rej) => {
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            ctx.globalAlpha = bgOpacity;
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, size, size);
            ctx.globalAlpha = 1;
            res();
          };
          img.onerror = rej;
          img.src = bgImage;
        });
      } else {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }

      await new Promise((res, rej) => {
        const qi = new window.Image();
        qi.onload = () => { ctx.drawImage(qi, 0, 0); res(); };
        qi.onerror = rej;
        qi.src = dataUrl;
      });

      if (useGradient) {
        const off = document.createElement('canvas');
        off.width = size; off.height = size;
        const oc = off.getContext('2d');
        oc.drawImage(canvas, 0, 0);
        oc.globalCompositeOperation = 'source-in';
        const gr = oc.createLinearGradient(0, 0, size, size);
        gr.addColorStop(0, '#38aecc');
        gr.addColorStop(0.5, '#0090c1');
        gr.addColorStop(1, '#046e8f');
        oc.fillStyle = gr;
        oc.fillRect(0, 0, size, size);
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(off, 0, 0);
      }

      const final = canvas.toDataURL('image/png');
      setQrDataUrl(final);
      if (user) await saveQR(data, fg, bg, useGradient, !!bgImage);
      toast.success(ar ? 'تم التوليد! ✓' : 'QR Generated! ✓');
    } catch (err) {
      console.error(err);
      toast.error(ar ? 'فشل التوليد' : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [QRCodeLib, buildQRData, quality, useGradient, bgImage, bgOpacity, isVIP, useCustom, customFg, customBg, paletteIdx, errorLevel, user, activeType, ar]);

  const saveQR = async (data, fg, bg, gradient, hasBg) => {
    try {
      await addDoc(collection(db, 'qr_codes'), {
        uid: user.uid, type: activeType, data,
        style: { fg, bg, quality, gradient, hasBgImage: hasBg },
        createdAt: serverTimestamp(),
        paid: isVIP,
      });
      await updateDoc(doc(db, 'users', user.uid), { qrCount: increment(1) });
    } catch (e) { console.error('saveQR:', e); }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrpro-${activeType}-${Date.now()}.png`;
    a.click();
    toast.success(ar ? 'تم التحميل!' : 'Downloaded!');
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkPro('bgImage')) return;
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const curFg = useCustom ? customFg : PALETTES[paletteIdx].fg;
  const curBg = useCustom ? customBg : PALETTES[paletteIdx].bg;
  const activeTypeData = typesData.find(t => t.id === activeType) || typesData[0];
  const ActiveIcon = QR_TYPES.find(t => t.id === activeType)?.icon || Link2;
  const FEATURE_LABELS = ar ? FEATURE_LABELS_AR : FEATURE_LABELS_EN;

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Type Tabs */}
      <div className={styles.typeBar}>
        {QR_TYPES.map((t, i) => {
          const Icon = t.icon;
          const label = typesData[i]?.label || t.label;
          return (
            <motion.button key={t.id}
              className={activeType === t.id ? styles.typeActive : styles.typeBtn}
              onClick={() => { setActiveType(t.id); setInputValue(''); setExtraFields({}); setQrDataUrl(null); }}
              whileTap={{ scale: .93 }}>
              <Icon size={13} /><span>{label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className={styles.grid}>
        <div className={styles.controls}>

          {/* Content */}
          <div className={styles.section}>
            <label className={styles.sLabel}>
              <ActiveIcon size={12} /> {ar ? 'المحتوى' : 'Content'}
            </label>
            <input className="input-field"
              placeholder={activeTypeData.ph}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateQR()}
            />
            {activeType === 'wifi' && (
              <input className="input-field" style={{ marginTop: 8 }}
                placeholder={ar ? 'كلمة مرور الواي فاي' : 'WiFi Password'}
                type="password"
                value={extraFields.password || ''}
                onChange={e => setExtraFields(p => ({ ...p, password: e.target.value }))} />
            )}
            {activeType === 'vcard' && (<>
              <input className="input-field" style={{ marginTop: 8 }}
                placeholder={ar ? 'رقم الهاتف' : 'Phone Number'}
                value={extraFields.phone || ''}
                onChange={e => setExtraFields(p => ({ ...p, phone: e.target.value }))} />
              <input className="input-field" style={{ marginTop: 8 }}
                placeholder={ar ? 'البريد الإلكتروني' : 'Email Address'}
                value={extraFields.email || ''}
                onChange={e => setExtraFields(p => ({ ...p, email: e.target.value }))} />
            </>)}
          </div>

          {/* Colors */}
          <div className={styles.section}>
            <label className={styles.sLabel}>
              <Palette size={12} /> {ar ? 'لوحة الألوان' : 'Color Palette'}
            </label>
            <div className={styles.paletteGrid}>
              {PALETTES.map((p, i) => (
                <button key={i}
                  className={`${styles.paletteBtn} ${!useCustom && paletteIdx === i ? styles.paletteOn : ''}`}
                  onClick={() => { setPaletteIdx(i); setUseCustom(false); setQrDataUrl(null); }}
                  title={p.label}>
                  <div className={styles.palCircle} style={{ background: p.bg, border: `2.5px solid ${p.fg}` }}>
                    <div className={styles.palDot} style={{ background: p.fg }} />
                  </div>
                  <span className={styles.palLabel}>{p.label}</span>
                </button>
              ))}
              <button className={`${styles.paletteBtn} ${useCustom ? styles.paletteOn : ''}`}
                onClick={() => setUseCustom(true)}>
                <div className={styles.palCircle} style={{ background: `conic-gradient(${customFg},${customBg},${customFg})`, border: '2px solid var(--border2)' }}>
                  <Palette size={9} color="white" />
                </div>
                <span className={styles.palLabel}>{ar ? 'مخصص' : 'Custom'}</span>
              </button>
            </div>

            <AnimatePresence>
              {useCustom && (
                <motion.div className={styles.customPickers}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div className={styles.pickerCard}>
                    <span className={styles.pickerLabel}>{ar ? 'لون الكود' : 'QR Color'}</span>
                    <label className={styles.colorSwatch} style={{ background: customFg }}>
                      <input type="color" value={customFg} onChange={e => setCustomFg(e.target.value)} />
                      <span>{customFg}</span>
                    </label>
                  </div>
                  <div className={styles.pickerCard}>
                    <span className={styles.pickerLabel}>{ar ? 'الخلفية' : 'Background'}</span>
                    <label className={styles.colorSwatch} style={{ background: customBg }}>
                      <input type="color" value={customBg} onChange={e => setCustomBg(e.target.value)} />
                      <span style={{ color: customBg < '#888888' ? '#fff' : '#000' }}>{customBg}</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.colorPreview}>
              <div className={styles.previewDots} style={{ background: curBg }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: curFg }} />)}
              </div>
              <span className={styles.previewLabel}>{ar ? 'معاينة' : 'Preview'}</span>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', marginRight: 'auto' }}>
                <span className={styles.hexTag} style={{ background: curFg + '22', color: curFg }}>{curFg}</span>
                <span className={styles.hexTag}>{curBg}</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className={styles.section}>
            <label className={styles.sLabel}>
              <Settings2 size={12} /> {ar ? 'الإعدادات' : 'Settings'}
            </label>
            <div className={styles.settingRow}>
              <span>{ar ? 'تصحيح الأخطاء' : 'Error Correction'}</span>
              <select className={styles.select} value={errorLevel} onChange={e => setErrorLevel(e.target.value)}>
                <option value="L">{ar ? 'منخفض — 7%' : 'Low — 7%'}</option>
                <option value="M">{ar ? 'متوسط — 15%' : 'Medium — 15%'}</option>
                <option value="Q">{ar ? 'ربعي — 25%' : 'Quartile — 25%'}</option>
                <option value="H">{ar ? 'عالي — 30%' : 'High — 30%'}</option>
              </select>
            </div>
          </div>

          {/* Pro Features */}
          <div className={styles.section}>
            <label className={styles.sLabel}>
              <Crown size={12} color="var(--accent2)" />
              {ar ? 'الميزات المميزة' : 'Pro Features'}
            </label>
            <div className={styles.proList}>
              {[
                { key: 'highQuality', active: quality === 'high',  toggle: () => { if (!checkPro('highQuality')) return; setQuality(q => q === 'high' ? 'standard' : 'high'); } },
                { key: 'gradient',    active: useGradient,          toggle: () => { if (!checkPro('gradient'))    return; setUseGradient(g => !g); } },
                { key: 'bgImage',     active: !!bgImage,            toggle: () => { if (!checkPro('bgImage'))     return; fileRef.current?.click(); } },
              ].map(feat => (
                <button key={feat.key}
                  className={`${styles.proRow} ${feat.active ? styles.proOn : ''}`}
                  onClick={feat.toggle}>
                  <div className={styles.proLeft}>
                    <Lock size={12} color="var(--accent2)" />
                    <span>{FEATURE_LABELS[feat.key]}</span>
                  </div>
                  {feat.key === 'bgImage' && bgImage && isVIP
                    ? <button className={styles.clearBtn}
                        onClick={e => { e.stopPropagation(); setBgImage(null); }}>
                        <XIcon size={11} /> {ar ? 'حذف' : 'Clear'}
                      </button>
                    : <span className={styles.pTag}>
                        {Number(pricing[feat.key])} {pricing.currency}
                      </span>
                  }
                </button>
              ))}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />

              <AnimatePresence>
                {bgImage && isVIP && (
                  <motion.div className={styles.sliderRow}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}>
                    <span>{ar ? `شفافية الصورة: ${Math.round(bgOpacity * 100)}%` : `Image Opacity: ${Math.round(bgOpacity * 100)}%`}</span>
                    <input type="range" min="0.05" max="0.5" step="0.05"
                      value={bgOpacity} onChange={e => setBgOpacity(parseFloat(e.target.value))}
                      className={styles.rangeInput} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!user ? (
              <div className={styles.loginHint}>
                <LogIn size={12} />
                <Link href="/login" className={styles.loginLink}>
                  {ar ? 'سجّل دخولك' : 'Sign in'}
                </Link>
                {ar ? 'أو' : 'or'}
                <Link href="/login?mode=signup" className={styles.loginLink}>
                  {ar ? 'أنشئ حساباً' : 'create account'}
                </Link>
                {ar ? 'لفتح الميزات' : 'to unlock pro features'}
              </div>
            ) : !isVIP ? (
              <p className={styles.vipNote}>
                <Crown size={11} color="var(--accent2)" />
                {ar ? 'تواصل مع الأدمن للحصول على VIP مجاناً' : 'Contact admin for free VIP access'}
              </p>
            ) : (
              <p className={styles.vipNote} style={{ color: 'var(--success)' }}>
                <Check size={11} /> {ar ? 'VIP — جميع الميزات مفتوحة' : 'VIP — All features unlocked'}
              </p>
            )}
          </div>

          <motion.button className={`btn-primary ${styles.genBtn}`}
            onClick={generateQR} disabled={generating || !QRCodeLib}
            whileTap={{ scale: .97 }}>
            {generating
              ? <><RefreshCw size={15} className={styles.spin} /> {ar ? 'جارٍ التوليد...' : 'Generating...'}</>
              : <><Zap size={15} /> {ar ? 'توليد كود QR' : 'Generate QR Code'}</>}
          </motion.button>
        </div>

        {/* Preview */}
        <div className={styles.previewCol}>
          <div className={styles.previewCard}>
            <div className={styles.previewBox}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR Code" className={styles.qrImg} />
                : (
                  <div className={styles.emptyState}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>
                      <QrCode size={52} color="var(--border2)" />
                    </motion.div>
                    <p>{ar ? 'الكود سيظهر هنا' : 'QR code appears here'}</p>
                    <span>{ar ? 'أدخل المحتوى واضغط توليد' : 'Enter content & tap Generate'}</span>
                  </div>
                )}
            </div>
            <AnimatePresence>
              {qrDataUrl && (
                <motion.div className={styles.actionRow}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <button className={`btn-primary ${styles.dlBtn}`} onClick={handleDownload}>
                    <Download size={14} /> {ar ? 'تحميل PNG' : 'Download PNG'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {qrDataUrl && (
            <div className={styles.metaRow}>
              <span>{quality === 'high' ? '1024×1024' : '500×500'} px</span>
              <span>·</span><span>PNG</span>
              <span>·</span><span>EC: {errorLevel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Login Required */}
      <AnimatePresence>
        {modal === 'login' && (
          <motion.div className={styles.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModal(null)}>
            <motion.div className={styles.modal}
              initial={{ scale: .88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .88, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}><LogIn size={24} color="var(--accent2)" /></div>
              <h3>{ar ? 'يلزم تسجيل الدخول' : 'Sign In Required'}</h3>
              <p>{ar ? `تحتاج حساباً لاستخدام ${FEATURE_LABELS[lockedFeat]}` : `You need an account to use ${FEATURE_LABELS[lockedFeat]}`}</p>
              <div className={styles.modalBtns}>
                <Link href="/login?mode=signup" className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }} onClick={() => setModal(null)}>
                  {ar ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                </Link>
                <Link href="/login" className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'center' }} onClick={() => setModal(null)}>
                  {ar ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Order */}
      <AnimatePresence>
        {modal === 'pay' && (
          <motion.div className={styles.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModal(null)}>
            <motion.div className={styles.modal}
              initial={{ scale: .88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .88, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}><ShoppingCart size={24} color="var(--accent2)" /></div>
              <h3>{ar ? 'طلب ميزة مميزة' : 'Request Pro Feature'}</h3>
              <p>
                <strong>{FEATURE_LABELS[lockedFeat]}</strong>
                {ar ? ' — سيتم إرسال طلبك للأدمن للمراجعة.' : ' — Your request will be sent to admin for review.'}
              </p>
              <div className={styles.priceBadge}>
                <span className={styles.pNum}>{Number(pricing[lockedFeat])}</span>
                <span className={styles.pCur}>{pricing.currency}</span>
                <span className={styles.pPer}>{ar ? 'لكل توليد' : '/ generation'}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
                {ar
                  ? '📋 بعد إرسال الطلب، ستُعلَم عند موافقة الأدمن وستصلك تعليمات الدفع.'
                  : '📋 After submitting, you will be notified when admin approves and payment instructions will be sent.'}
              </p>
              <div className={styles.modalBtns}>
                <button className="btn-primary"
                  onClick={() => createOrder(lockedFeat)}
                  disabled={ordering}>
                  {ordering
                    ? <RefreshCw size={14} className={styles.spin} />
                    : <ShoppingCart size={14} />}
                  {ordering
                    ? (ar ? 'جارٍ الإرسال...' : 'Submitting...')
                    : (ar ? 'إرسال الطلب' : 'Submit Order')}
                </button>
                <button className="btn-ghost" onClick={() => setModal(null)}>
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
