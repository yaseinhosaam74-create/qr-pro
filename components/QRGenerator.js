// components/QRGenerator.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { doc, collection, addDoc, serverTimestamp, increment, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Link2, Type, Wifi, Phone, Mail, CreditCard,
  Download, Palette, Settings2, Lock, Crown,
  Zap, Check, RefreshCw, QrCode,
  Image as ImageIcon, X as XIcon, LogIn
} from 'lucide-react';
import styles from '../styles/QRGenerator.module.css';

const QR_TYPES = [
  { id: 'url',   label: 'URL',     icon: Link2,      placeholder: 'https://example.com' },
  { id: 'text',  label: 'Text',    icon: Type,       placeholder: 'Enter any text...' },
  { id: 'wifi',  label: 'WiFi',    icon: Wifi,       placeholder: 'Network name (SSID)' },
  { id: 'phone', label: 'Phone',   icon: Phone,      placeholder: '+20 123 456 7890' },
  { id: 'email', label: 'Email',   icon: Mail,       placeholder: 'user@example.com' },
  { id: 'vcard', label: 'Contact', icon: CreditCard, placeholder: 'Full Name' },
];

const PALETTES = [
  { label: 'Deep Space', fg: '#38aecc', bg: '#022f40' },
  { label: 'Ocean',      fg: '#38aecc', bg: '#010d12' },
  { label: 'Cerulean',   fg: '#ffffff', bg: '#046e8f' },
  { label: 'Sky',        fg: '#022f40', bg: '#38aecc' },
  { label: 'Marine',     fg: '#0090c1', bg: '#183446' },
  { label: 'Classic',    fg: '#000000', bg: '#ffffff' },
  { label: 'Pure Dark',  fg: '#ffffff', bg: '#000000' },
  { label: 'Gold',       fg: '#f59e0b', bg: '#0a0800' },
  { label: 'Emerald',    fg: '#10b981', bg: '#001a12' },
  { label: 'Midnight',   fg: '#38aecc', bg: '#183446' },
];

export default function QRGenerator() {
  const { user, isVIP } = useAuth();
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const [QRCodeLib,     setQRCodeLib]     = useState(null);
  const [activeType,    setActiveType]    = useState('url');
  const [inputValue,    setInputValue]    = useState('');
  const [extraFields,   setExtraFields]   = useState({});
  const [paletteIdx,    setPaletteIdx]    = useState(0);
  const [useCustom,     setUseCustom]     = useState(false);
  const [customFg,      setCustomFg]      = useState('#38aecc');
  const [customBg,      setCustomBg]      = useState('#022f40');
  const [quality,       setQuality]       = useState('standard');
  const [useGradient,   setUseGradient]   = useState(false);
  const [errorLevel,    setErrorLevel]    = useState('M');
  const [generating,    setGenerating]    = useState(false);
  const [qrDataUrl,     setQrDataUrl]     = useState(null);
  const [bgImage,       setBgImage]       = useState(null);
  const [bgOpacity,     setBgOpacity]     = useState(0.18);
  const [pricing,       setPricing]       = useState({ highQuality: 5, gradient: 2, bgImage: 3, currency: 'EGP' });
  const [modal,         setModal]         = useState(null); // null | 'login' | 'pay'
  const [lockedFeature, setLockedFeature] = useState(null);

  useEffect(() => {
    import('qrcode').then(mod => setQRCodeLib(mod.default || mod));
  }, []);

  useEffect(() => {
    getDoc(doc(db, 'pricing', 'config')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.currency === 'EG') d.currency = 'EGP';
        setPricing(d);
      }
    }).catch(() => {});
  }, []);

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

  // Check if pro feature is accessible
  const checkProFeature = (feature) => {
    if (!user) { setLockedFeature(feature); setModal('login'); return false; }
    if (!isVIP) { setLockedFeature(feature); setModal('pay'); return false; }
    return true;
  };

  const generateQR = useCallback(async () => {
    if (!QRCodeLib) { toast.error('Loading...'); return; }
    const data = buildQRData();
    if (!data) { toast.error('Please enter some content first'); return; }
    if (quality === 'high' && !checkProFeature('highQuality')) return;
    if (useGradient         && !checkProFeature('gradient'))   return;
    if (bgImage             && !checkProFeature('bgImage'))    return;

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
        toast.success('QR Code generated! ✓');
        setGenerating(false);
        return;
      }

      const canvas = canvasRef.current;
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (bgImage && isVIP) {
        await new Promise((res, rej) => {
          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            ctx.globalAlpha = bgOpacity;
            ctx.fillStyle   = bg;
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
        const qrImg = new window.Image();
        qrImg.onload  = () => { ctx.drawImage(qrImg, 0, 0); res(); };
        qrImg.onerror = rej;
        qrImg.src = dataUrl;
      });

      if (useGradient && isVIP) {
        const off = document.createElement('canvas');
        off.width = size; off.height = size;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(canvas, 0, 0);
        offCtx.globalCompositeOperation = 'source-in';
        const grad = offCtx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#38aecc');
        grad.addColorStop(0.5, '#0090c1');
        grad.addColorStop(1, '#046e8f');
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(off, 0, 0);
      }

      const final = canvas.toDataURL('image/png');
      setQrDataUrl(final);
      if (user) await saveQR(data, fg, bg, useGradient, !!bgImage);
      toast.success('QR Code generated! ✓');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  }, [QRCodeLib, buildQRData, quality, useGradient, bgImage, bgOpacity, isVIP, useCustom, customFg, customBg, paletteIdx, errorLevel, user, activeType]);

  const saveQR = async (data, fg, bg, gradient, hasBg) => {
    try {
      await addDoc(collection(db, 'qr_codes'), {
        uid: user.uid, type: activeType, data,
        style: { fg, bg, quality, gradient, hasBgImage: hasBg },
        createdAt: serverTimestamp(), paid: isVIP,
      });
      await updateDoc(doc(db, 'users', user.uid), { qrCount: increment(1) });
    } catch {}
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrpro-${activeType}-${Date.now()}.png`;
    a.click();
    toast.success('Downloaded!');
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!checkProFeature('bgImage')) return;
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const curFg = useCustom ? customFg : PALETTES[paletteIdx].fg;
  const curBg = useCustom ? customBg : PALETTES[paletteIdx].bg;
  const ActiveIcon = QR_TYPES.find(t => t.id === activeType)?.icon || Link2;

  const PRO_LABELS = {
    highQuality: 'High Quality (1024px)',
    gradient:    'Ocean Gradient',
    bgImage:     'Background Image',
  };

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Type Tabs */}
      <div className={styles.typeBar}>
        {QR_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <motion.button key={t.id}
              className={activeType === t.id ? styles.typeActive : styles.typeBtn}
              onClick={() => { setActiveType(t.id); setInputValue(''); setExtraFields({}); setQrDataUrl(null); }}
              whileTap={{ scale: 0.93 }}>
              <Icon size={13} /><span>{t.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className={styles.grid}>
        {/* ── Controls ── */}
        <div className={styles.controls}>

          {/* Content */}
          <div className={styles.section}>
            <label className={styles.sLabel}><ActiveIcon size={12} /> Content</label>
            <input className="input-field"
              placeholder={QR_TYPES.find(t => t.id === activeType)?.placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateQR()} />
            {activeType === 'wifi' && (
              <input className="input-field" style={{ marginTop: 8 }}
                placeholder="WiFi Password" type="password"
                value={extraFields.password || ''}
                onChange={e => setExtraFields(p => ({ ...p, password: e.target.value }))} />
            )}
            {activeType === 'vcard' && (<>
              <input className="input-field" style={{ marginTop: 8 }} placeholder="Phone"
                value={extraFields.phone || ''} onChange={e => setExtraFields(p => ({ ...p, phone: e.target.value }))} />
              <input className="input-field" style={{ marginTop: 8 }} placeholder="Email"
                value={extraFields.email || ''} onChange={e => setExtraFields(p => ({ ...p, email: e.target.value }))} />
            </>)}
          </div>

          {/* Colors */}
          <div className={styles.section}>
            <label className={styles.sLabel}><Palette size={12} /> Color Palette</label>
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
              <button
                className={`${styles.paletteBtn} ${useCustom ? styles.paletteOn : ''}`}
                onClick={() => setUseCustom(true)} title="Custom">
                <div className={styles.palCircle} style={{
                  background: `conic-gradient(${customFg}, ${customBg}, ${customFg})`,
                  border: '2px solid var(--border2)' }}>
                  <Palette size={9} color="white" />
                </div>
                <span className={styles.palLabel}>Custom</span>
              </button>
            </div>

            <AnimatePresence>
              {useCustom && (
                <motion.div className={styles.customPickers}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div className={styles.pickerCard}>
                    <span className={styles.pickerLabel}>QR Color</span>
                    <label className={styles.colorSwatch} style={{ background: customFg }}>
                      <input type="color" value={customFg} onChange={e => setCustomFg(e.target.value)} />
                      <span>{customFg}</span>
                    </label>
                  </div>
                  <div className={styles.pickerCard}>
                    <span className={styles.pickerLabel}>Background</span>
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
                {[0,1,2].map(i => <div key={i} style={{ width:12, height:12, borderRadius:3, background:curFg }} />)}
              </div>
              <span className={styles.previewLabel}>Color Preview</span>
              <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
                <span className={styles.hexTag} style={{ background: curFg+'22', color: curFg }}>{curFg}</span>
                <span className={styles.hexTag}>{curBg}</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className={styles.section}>
            <label className={styles.sLabel}><Settings2 size={12} /> Settings</label>
            <div className={styles.settingRow}>
              <span>Error Correction</span>
              <select className={styles.select} value={errorLevel} onChange={e => setErrorLevel(e.target.value)}>
                <option value="L">Low — 7%</option>
                <option value="M">Medium — 15%</option>
                <option value="Q">Quartile — 25%</option>
                <option value="H">High — 30%</option>
              </select>
            </div>
          </div>

          {/* Pro Features */}
          <div className={styles.section}>
            <label className={styles.sLabel}><Crown size={12} color="var(--accent2)" /> Pro Features</label>
            <div className={styles.proList}>

              <button className={`${styles.proRow} ${quality === 'high' ? styles.proOn : ''}`}
                onClick={() => {
                  if (!checkProFeature('highQuality')) return;
                  setQuality(q => q === 'high' ? 'standard' : 'high');
                }}>
                <div className={styles.proLeft}>
                  <Lock size={12} color="var(--accent2)" />
                  <span>High Quality (1024px)</span>
                </div>
                <span className={styles.pTag}>{pricing.highQuality} {pricing.currency}</span>
              </button>

              <button className={`${styles.proRow} ${useGradient ? styles.proOn : ''}`}
                onClick={() => {
                  if (!checkProFeature('gradient')) return;
                  setUseGradient(g => !g);
                }}>
                <div className={styles.proLeft}>
                  <Lock size={12} color="var(--accent2)" />
                  <span>Ocean Gradient</span>
                </div>
                <span className={styles.pTag}>{pricing.gradient} {pricing.currency}</span>
              </button>

              <button className={`${styles.proRow} ${bgImage ? styles.proOn : ''}`}
                onClick={() => {
                  if (!checkProFeature('bgImage')) return;
                  fileRef.current?.click();
                }}>
                <div className={styles.proLeft}>
                  <Lock size={12} color="var(--accent2)" />
                  <span>Background Image</span>
                </div>
                {bgImage && isVIP
                  ? <button className={styles.clearBtn} onClick={e => { e.stopPropagation(); setBgImage(null); }}>
                      <XIcon size={11} /> Clear
                    </button>
                  : <span className={styles.pTag}>{pricing.bgImage} {pricing.currency}</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleBgUpload} />

              <AnimatePresence>
                {bgImage && isVIP && (
                  <motion.div className={styles.sliderRow}
                    initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
                    <span>Image Opacity: {Math.round(bgOpacity*100)}%</span>
                    <input type="range" min="0.05" max="0.5" step="0.05"
                      value={bgOpacity} onChange={e => setBgOpacity(parseFloat(e.target.value))}
                      className={styles.rangeInput} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Show hint based on login state */}
            {!user ? (
              <div className={styles.loginHint}>
                <LogIn size={12} />
                <Link href="/login" className={styles.loginLink}>Sign in</Link>
                or
                <Link href="/login?mode=signup" className={styles.loginLink}>create account</Link>
                to unlock pro features
              </div>
            ) : !isVIP ? (
              <p className={styles.vipNote}>
                <Crown size={11} color="var(--accent2)" />
                Contact admin for VIP access — all features free
              </p>
            ) : (
              <p className={styles.vipNote} style={{ color:'var(--success)' }}>
                <Check size={11} /> VIP — All features unlocked
              </p>
            )}
          </div>

          <motion.button className={`btn-primary ${styles.genBtn}`}
            onClick={generateQR} disabled={generating || !QRCodeLib}
            whileTap={{ scale: 0.97 }}>
            {generating
              ? <><RefreshCw size={15} className={styles.spin} /> Generating...</>
              : <><Zap size={15} /> Generate QR Code</>}
          </motion.button>
        </div>

        {/* ── Preview ── */}
        <div className={styles.previewCol}>
          <div className={styles.previewCard}>
            <div className={styles.previewBox}>
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR Code" className={styles.qrImg} />
                : (
                  <div className={styles.emptyState}>
                    <motion.div animate={{ rotate:360 }} transition={{ duration:12, repeat:Infinity, ease:'linear' }}>
                      <QrCode size={52} color="var(--border2)" />
                    </motion.div>
                    <p>QR code appears here</p>
                    <span>Enter content & tap Generate</span>
                  </div>
                )}
            </div>
            <AnimatePresence>
              {qrDataUrl && (
                <motion.div className={styles.actionRow}
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}>
                  <button className={`btn-primary ${styles.dlBtn}`} onClick={handleDownload}>
                    <Download size={14} /> Download PNG
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
              {!user && <span>·</span>}
              {!user && <span style={{ color:'var(--text3)' }}>Sign in to save</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Login Required ── */}
      <AnimatePresence>
        {modal === 'login' && (
          <motion.div className={styles.overlay}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setModal(null)}>
            <motion.div className={styles.modal}
              initial={{ scale:0.88, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.88, y:20 }}
              onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}><LogIn size={24} color="var(--accent2)" /></div>
              <h3>Sign In Required</h3>
              <p>You need an account to use <strong>{PRO_LABELS[lockedFeature]}</strong>.</p>
              <div className={styles.modalBtns}>
                <Link href="/login?mode=signup" className="btn-primary" style={{ width:'100%', justifyContent:'center' }}
                  onClick={() => setModal(null)}>
                  Create Free Account
                </Link>
                <Link href="/login" className="btn-ghost" style={{ width:'100%', justifyContent:'center' }}
                  onClick={() => setModal(null)}>
                  Sign In
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Pay ── */}
      <AnimatePresence>
        {modal === 'pay' && (
          <motion.div className={styles.overlay}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setModal(null)}>
            <motion.div className={styles.modal}
              initial={{ scale:0.88, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.88, y:20 }}
              onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}><Crown size={24} color="var(--accent2)" /></div>
              <h3>Pro Feature</h3>
              <p><strong>{PRO_LABELS[lockedFeature]}</strong> requires payment.</p>
              <div className={styles.priceBadge}>
                <span className={styles.pNum}>{pricing[lockedFeature]}</span>
                <span className={styles.pCur}>{pricing.currency}</span>
                <span className={styles.pPer}>/ generation</span>
              </div>
              <div className={styles.modalBtns}>
                <button className="btn-primary btn-gold"><Crown size={13} /> Pay & Generate</button>
                <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
              <p className={styles.vipHint2}>Admin can grant you free VIP access.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
