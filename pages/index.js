// pages/index.js
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import QRGenerator from '../components/QRGenerator';
import { Zap, Shield, Palette, Download, Crown } from 'lucide-react';
import styles from '../styles/Home.module.css';

export default function Home({ theme, toggleTheme, lang, toggleLang }) {
  const ar = lang === 'ar';

  const features = [
    { icon: Zap,      title: ar ? 'سريع جداً'        : 'Lightning Fast',    desc: ar ? 'توليد فوري مع معاينة مباشرة'         : 'Instant generation with live preview' },
    { icon: Palette,  title: ar ? 'تخصيص كامل'       : 'Full Customization', desc: ar ? '10 لوحات ألوان جميلة + ألوان مخصصة'  : '10 beautiful palettes + custom colors' },
    { icon: Shield,   title: ar ? 'موثوقية عالية'    : 'High Reliability',   desc: ar ? 'تصحيح أخطاء يصل إلى 30%'             : 'Up to 30% error correction built-in' },
    { icon: Download, title: ar ? 'تصدير HD'          : 'HD Export',          desc: ar ? 'تحميل بدقة 1024×1024 بكسل'           : 'Download up to 1024×1024px PNG' },
    { icon: Crown,    title: ar ? 'وصول VIP'          : 'VIP Access',         desc: ar ? 'الأدمن يمنح وصولاً مجانياً للمستخدمين' : 'Admin grants free access to users' },
  ];

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} />

      <section className={styles.hero}>
        <motion.div className={styles.badge}
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.5 }}>
          <Crown size={11} />
          {ar ? 'مولّد QR Code احترافي' : 'Professional QR Code Generator'}
        </motion.div>

        <motion.h1 className={styles.title}
          initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:.55, delay:.08 }}>
          {ar ? 'أنشئ كودات' : 'Create Stunning'}<br />
          <span className="gradient-text">{ar ? 'QR مميزة' : 'QR Codes'}</span>
        </motion.h1>

        <motion.p className={styles.sub}
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:.55, delay:.15 }}>
          {ar
            ? 'ولّد كودات QR عالية الجودة وقابلة للتخصيص للروابط والواي فاي وجهات الاتصال وأكثر.'
            : 'Generate high-quality, customizable QR codes for URLs, WiFi, contacts, and more.'}
        </motion.p>
      </section>

      <motion.section className={styles.genSection}
        initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6, delay:.22 }}>
        <QRGenerator lang={lang} />
      </motion.section>

      <section className={styles.features}>
        <motion.h2 className={styles.featTitle}
          initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}>
          {ar ? 'كل ما تحتاجه' : 'Everything you need'}
        </motion.h2>
        <div className={styles.featGrid}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i} className={styles.featCard}
                initial={{ opacity:0, y:24 }}
                whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }}
                transition={{ delay:i*.07 }}>
                <div className={styles.featIcon}><Icon size={19}/></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 QR Pro · {ar ? 'مدعوم بـ' : 'Powered by'} Next.js & Firebase</p>
      </footer>
    </div>
  );
}
