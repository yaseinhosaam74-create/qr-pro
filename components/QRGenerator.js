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
import {
  Link2, Type, Wifi, Phone, Mail, CreditCard,
  Download, Palette, Settings2, Lock, Crown,
  Zap, Check, RefreshCw, QrCode,
  Image as ImageIcon, X as XIcon
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

// Ocean palette + extras
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

const PRO_FEATURES = {
  highQuality: { label: 'High Quality (1024px)' },
  gradient:    { label: 'Gradient Colors' },
  bgImage:     { label: 'Background Image' },
};

export default function QRGenerator() {
  const { user, isVIP } = useAuth();
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const [QRCodeLib, setQRCodeLib] = useState(null);

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
  const [showPaywall,   setShowPaywall]   = useState(false);
  const [lockedFeature, setLockedFeature] = useState(null);

  // Load QRCode library client-side only (fixes mobile SSR issue)
  useEffect(() => {
    import('qrcode').then(mod => setQRCodeLib(mod.default || mod));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'pricing', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          // fix "EG" -> "EGP"
          if (data.currency === 'EG') data.currency = 'EGP';
          setPricing(data);
        }
      } catch {}
    };
    load();
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

  const requireVIP = (feature) => {
    if (!isVIP) { setLockedFeature(feature); setShowPaywall(true); return true; }
    return false;
  };

  const generateQR = useCallback(async () => {
    if (!QRCodeLib) { toast.error('Loading library...'); return; }

    const data = buildQRData();
    if (!data) { toast.error('Please enter some content first'); return; }
    if (quality === 'high' && requireVIP('highQuality')) return;
    if (useGradient         && requireVIP('gradient'))   return;
    if (bgImage             && requireVIP('bgImage'))    return;

    setGenerating(true);
    try {
      const size = quality === 'high' ? 1024 : 500;
      const fg = useCustom ? customFg : PALETTES[paletteIdx].fg;
      const bg = useCustom ? customBg : PALETTES[paletteIdx].bg;

      // Generate QR as data URL (works on mobile without canvas issues)
      const dataUrl = await QRCodeLib.toDataURL(data, {
        width: size,
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: { dark: fg, light: bg },
      });

      // If no extra effects needed, use directly
      if (!bgImage && !useGradient) {
        setQrDataUrl(dataUrl);
        await saveToFirestore(data, fg, bg, false, false);
        toast.success('QR Code generated! ✓');
        setGenerating(false);
        return;
      }

      // Use canvas for advanced effects
      const canvas = canvasRef.current;
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw background image
      if (bgImage && isVIP) {
        await new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload  = () => {
            ctx.drawImage(img, 0, 0, size, size);
            ctx.globalAlpha = bgOpacity;
            ctx.fillStyle   = bg;
            ctx.fillRect(0, 0, size, size);
            ctx.globalAlpha = 1;
            resolve();
          };
          img.onerror = reject;
          img.src     = bgImage;
        });
      } else {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }

      // Draw QR on top
      const qrImg = new window.Image();
      await new Promise((resolve, reject) => {
        qrImg.onload  = () => { ctx.drawImage(qrImg, 0, 0); resolve(); };
        qrImg.onerror = reject;
        qrImg.src     = dataUrl;
      });

      // Gradient overlay (pro)
      if (useGradient && isVIP) {
        const offscreen = document.createElement('canvas');
        offscreen.width  = size;
        offscreen.height = size;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(canvas, 0, 0);
        offCtx.globalCompositeOperation = 'source-in';
        const grad = offCtx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#38aecc');
        grad.addColorStop(0.5, '#0090c1');
        grad.addColorStop(1, '#046e8f');
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, size, size);
        ctx.clearRect(0, 0, size, size);
        if (bgImage && isVIP) {
          const bgImg = new window.Image();
          await new Promise(r => { bgImg.onload = r; bgImg.src = bgImage; });
          ctx.drawImage(bgImg, 0, 0, size, size);
          ctx.globalAlpha = bgOpacity;
          ctx.fillStyle   = bg;
          ctx.fillRect(0, 0, size, size);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, size, size);
        }
        ctx.drawImage(offscreen, 0, 0);
      }

      const finalDataUrl = canvas.toDataURL('image/png');
      setQrDataUrl(finalDataUrl);
      await saveToFirestore(data, fg, bg, useGradient, !!bgImage);
      toast.success('QR Code generated! ✓');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  }, [QRCodeLib, buildQRData, quality, useGradient, bgImage, bgOpacity, isVIP, useCustom, customFg, customBg, paletteIdx, errorLevel, user, activeType]);

  const saveToFirestore = async (data, fg, bg, gradient, hasBg) => {
    if (!user) return;
    try {
      const fg2 = useCustom ? customFg : PALETTES[paletteIdx].fg;
      const bg2 = useCustom ? customBg : PALETTES[paletteIdx].bg;
      await addDoc(collection(db, 'qr_codes'), {
        uid: user.uid, type: activeType, data,
        style: { fg: fg2, bg: bg2, quality, gradient, hasBgImage: hasBg },
        createdAt: serverTimestamp(), paid: isVIP,
      });
      await updateDoc(doc(db, 'users', user.uid), { qrCount: increment(1) });
    } catch {}
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href     = qrDataUrl;
    a.download = `qrpro-${activeType}-${Date.now()}.png`;
    a.click();
    toast.success('Downloaded!');
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isVIP) { requireVIP('bgImage'); return; }
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const ActiveIcon = QR_TYPES.find(t => t.id === activeType)?.icon || Link2;
  const curFg = useCustom ? customFg : PALETTES[paletteIdx].fg;
  const curBg = useCustom ? customBg : PALETTES[paletteIdx].bg;

  return (
    <div className={styles.wrapper}>
      {/* Hidden canvas for advanced effects */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Type Tabs ── */}
      <div className={styles.typeBar}>
        {QR_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <motion.button
              key={t.id}
              className={activeType === t.id ? styles.typeActive : styles.typeBtn}
              onClick={() => { setActiveType(t.id); setInputValue(''); setExtraFields({}); setQrDataUrl(null); }}
              whileTap={{ scale: 0.93 }}
            >
              <Icon size={13} />
              <span>{t.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className={styles.grid}>

        {/* ════ LEFT CONTROLS ════ */}
        <div className={styles.controls}>

          {/* Content */}
          <div className={styles.section}>
            <label className={styles.sLabel}><ActiveIcon size={12} /> Content</label>
            <input
              className="input-field"
              placeholder={QR_TYPES.find(t => t.id === activeType)?.placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateQR()}
            />
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
                <button
                  key={i}
                  className={`${styles.paletteBtn} ${!useCustom && paletteIdx === i ? styles.paletteOn : ''}`}
                  onClick={() => { setPaletteIdx(i); setUseCustom(false); setQrDataUrl(null); }}
                  title={p.label}
                >
                  <div className={styles.palCircle} style={{ background: p.bg, border: `2.5px solid ${p.fg}` }}>
                    <div className={styles.palDot} style={{ background: p.fg }} />
                  </div>
                  <span className={styles.palLabel}>{p.label}</span>
                </button>
              ))}
              <button
                className={`${styles.paletteBtn} ${useCustom ? styles.paletteOn : ''}`}
                onClick={() => setUseCustom(true)}
                title="Custom"
              >
                <div className={styles.palCircle} style={{
                  background: `conic-gradient(${customFg}, ${customBg}, ${customFg})`,
                  border: '2px solid var(--border2)'
                }}>
                  <Palette size={9} color="white" />
                </div>
                <span className={styles.palLabel}>Custom</span>
              </button>
            </div>

            <AnimatePresence>
              {useCustom && (
                <motion.div
                  className={styles.customPickers}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
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
                      <span style={{ color: customBg === '#000000' || customBg < '#555555' ? '#fff' : '#000' }}>{customBg}</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Color preview */}
            <div className={styles.colorPreview}>
              <div className={styles.previewDots} style={{ background: curBg }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: curFg }} />
                ))}
              </div>
              <span className={styles.previewLabel}>Color Preview</span>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                <span className={styles.hexTag} style={{ background: curFg + '22', color: curFg }}>{curFg}</span>
                <span className={styles.hexTag} style={{ borderColor: 'var(--border)' }}>{curBg}</span>
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
                onClick={() => { if (!isVIP) { requireVIP('highQuality'); return; } setQuality(q => q === 'high' ? 'standard' : 'high'); }}>
                <div className={styles.proLeft}>
                  {!isVIP ? <Lock size={12} color="var(--accent2)" /> : <Check size={12} color="var(--accent)" style={{ opacity: quality === 'high' ? 1 : 0 }} />}
                  <span>High Quality (1024px)</span>
                </div>
                {isVIP
                  ? <div className={`${styles.toggle} ${quality === 'high' ? styles.toggleOn : ''}`} />
                  : <span className={styles.pTag}>{pricing.highQuality} {pricing.currency}</span>}
              </button>

              <button className={`${styles.proRow} ${useGradient ? styles.proOn : ''}`}
                onClick={() => { if (!isVIP) { requireVIP('gradient'); return; } setUseGradient(g => !g); }}>
                <div className={styles.proLeft}>
                  {!isVIP ? <Lock size={12} color="var(--accent2)" /> : <Check size={12} color="var(--accent)" style={{ opacity: useGradient ? 1 : 0 }} />}
                  <span>Ocean Gradient</span>
                </div>
                {isVIP
                  ? <div className={`${styles.toggle} ${useGradient ? styles.toggleOn : ''}`} />
                  : <span className={styles.pTag}>{pricing.gradient} {pricing.currency}</span>}
              </button>

              <button className={`${styles.proRow} ${bgImage ? styles.proOn : ''}`}
                onClick={() => { if (!isVIP) { requireVIP('bgImage'); return; } fileRef.current?.click(); }}>
                <div className={styles.proLeft}>
                  {!isVIP ? <Lock size={12} color="var(--accent2)" /> : <ImageIcon size={12} color="var(--accent)" />}
                  <span>Background Image</span>
                </div>
                {bgImage && isVIP
                  ? <button className={styles.clearBtn} onClick={e => { e.stopPropagation(); setBgImage(null); }}>
                      <XIcon size={11} /> Clear
                    </button>
                  : isVIP
                    ? <span className={styles.uploadTag}>Upload</span>
                    : <span className={styles.pTag}>{pricing.bgImage} {pricing.currency}</span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />

              <AnimatePresence>
                {bgImage && isVIP && (
                  <motion.div className={styles.sliderRow}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <span>Image Opacity: {Math.round(bgOpacity * 100)}%</span>
                    <input type="range" min="0.05" max="0.5" step="0.05"
                      value={bgOpacity} onChange={e => setBgOpacity(parseFloat(e.target.value))}
                      className={styles.rangeInput} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isVIP && (
              <p className={styles.vipNote}>
                <Crown size={11} color="var(--accent2)" />
                Sign in & contact admin for VIP — all features free
              </p>
            )}
          </div>

          {/* Generate */}
          <motion.button
            className={`btn-primary ${styles.genBtn}`}
            onClick={generateQR}
            disabled={generating || !QRCodeLib}
            whileTap={{ scale: 0.97 }}
          >
            {generating
              ? <><RefreshCw size={15} className={styles.spin} /> Generating...</>
              : <><Zap size={15} /> Generate QR Code</>}
          </motion.button>
        </div>

        {/* ════ RIGHT PREVIEW ════ */}
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
                    <p>QR code appears here</p>
                    <span>Enter content & tap Generate</span>
                  </div>
                )
              }
            </div>
            <AnimatePresence>
              {qrDataUrl && (
                <motion.div className={styles.actionRow}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
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
            </div>
          )}
        </div>
      </div>

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div className={styles.overlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPaywall(false)}>
            <motion.div className={styles.modal}
              initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}><Crown size={24} color="var(--accent2)" /></div>
              <h3>Pro Feature</h3>
              <p><strong>{PRO_FEATURES[lockedFeature]?.label}</strong> requires payment.</p>
              <div className={styles.priceBadge}>
                <span className={styles.pNum}>{pricing[lockedFeature]}</span>
                <span className={styles.pCur}>{pricing.currency}</span>
                <span className={styles.pPer}>per generation</span>
              </div>
              <div className={styles.modalBtns}>
                <button className="btn-primary btn-gold"><Crown size={13} /> Pay & Generate</button>
                <button className="btn-ghost" onClick={() => setShowPaywall(false)}>Cancel</button>
              </div>
              <p className={styles.vipHint2}>VIP? <a href="/login">Sign in</a> for free access.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
