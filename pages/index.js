// pages/index.js
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import QRGenerator from '../components/QRGenerator';
import { Zap, Shield, Palette, Download, Crown } from 'lucide-react';
import styles from '../styles/Home.module.css';

const features = [
  { icon: Zap,      title: 'Lightning Fast',    desc: 'Instant generation with real-time preview' },
  { icon: Palette,  title: 'Full Customization', desc: '10 beautiful palettes + custom colors' },
  { icon: Shield,   title: 'High Reliability',   desc: 'Up to 30% error correction built-in' },
  { icon: Download, title: 'HD Export',           desc: 'Download up to 1024×1024px sharp PNG' },
  { icon: Crown,    title: 'VIP Access',          desc: 'Admins grant unlimited free access to users' },
];

export default function Home({ theme, toggleTheme }) {
  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <section className={styles.hero}>
        <motion.div className={styles.badge}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Crown size={11} />
          Professional QR Code Generator
        </motion.div>

        <motion.h1 className={styles.title}
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}>
          Create Stunning<br />
          <span className="gradient-text">QR Codes</span>
        </motion.h1>

        <motion.p className={styles.sub}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
          Generate high-quality, customizable QR codes for URLs, WiFi,<br className={styles.br} />
          contacts, and more. Premium features available on demand.
        </motion.p>
      </section>

      <motion.section className={styles.genSection}
        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.22 }}>
        <QRGenerator />
      </motion.section>

      {/* Features */}
      <section className={styles.features}>
        <motion.h2 className={styles.featTitle}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          Everything you need
        </motion.h2>
        <div className={styles.featGrid}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i} className={styles.featCard}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}>
                <div className={styles.featIcon}><Icon size={19} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2025 QR Pro · Powered by Next.js & Firebase</p>
      </footer>
    </div>
  );
}
