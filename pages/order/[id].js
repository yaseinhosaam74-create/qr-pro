// pages/order/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';
import {
  Clock, CheckCircle, XCircle, Phone,
  RefreshCw, ArrowRight, Crown, QrCode
} from 'lucide-react';
import styles from '../../styles/Order.module.css';

export default function OrderPage({ theme, toggleTheme, lang }) {
  const router        = useRouter();
  const { id }        = router.query;
  const { user, loading } = useAuth();
  const [order,        setOrder]        = useState(null);
  const [fetching,     setFetching]     = useState(true);
  const [confirming,   setConfirming]   = useState(false);
  const [cancelling,   setCancelling]   = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!id) return;
    setFetching(true);

    // Real-time listener — updates automatically when admin approves
    const unsub = onSnapshot(doc(db, 'orders', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        // Make sure this order belongs to the current user
        if (user && data.uid !== user.uid) {
          router.replace('/');
          return;
        }
        setOrder(data);
      } else {
        router.replace('/');
      }
      setFetching(false);
    });

    return () => unsub();
  }, [id, user]);

  const handleConfirmPayment = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'paid',
        paidAt: new Date(),
      });
      toast.success('✅ تم إرسال تأكيد الدفع! سيتم تفعيل طلبك قريباً.');
    } catch {
      toast.error('حدث خطأ، حاول مجدداً');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelled',
        cancelledAt: new Date(),
      });
      toast.success('تم إلغاء الطلب');
      router.replace('/');
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setCancelling(false);
    }
  };

  const FEATURE_LABELS = {
    highQuality: 'جودة عالية (1024px)',
    gradient:    'تدرج الألوان',
    bgImage:     'صورة خلفية',
  };

  const STATUS = {
    pending:   { label: 'قيد المراجعة',    color: '#f59e0b', icon: Clock,        bg: 'rgba(245,158,11,0.1)' },
    approved:  { label: 'تمت الموافقة',    color: '#10b981', icon: CheckCircle,  bg: 'rgba(16,185,129,0.1)' },
    rejected:  { label: 'مرفوض',           color: '#ef4444', icon: XCircle,      bg: 'rgba(239,68,68,0.1)'  },
    paid:      { label: 'تم إرسال الدفع',  color: '#0090c1', icon: CheckCircle,  bg: 'rgba(0,144,193,0.1)'  },
    cancelled: { label: 'ملغى',            color: '#606080', icon: XCircle,      bg: 'rgba(96,96,128,0.1)'  },
  };

  if (loading || fetching) return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} />
      <div className={styles.center}>
        <RefreshCw size={28} className={styles.spin} color="var(--accent)" />
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:12 }}>جارٍ تحميل الطلب...</p>
      </div>
    </div>
  );

  if (!order) return null;

  const sc = STATUS[order.status] || STATUS.pending;
  const StatusIcon = sc.icon;

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} />
      <div className={styles.wrap}>

        {/* Status Banner */}
        <motion.div
          className={styles.statusBanner}
          style={{ background: sc.bg, borderColor: sc.color + '40' }}
          initial={{ opacity:0, y:-16 }}
          animate={{ opacity:1, y:0 }}
        >
          <StatusIcon size={22} color={sc.color} />
          <div>
            <div className={styles.statusLabel} style={{ color: sc.color }}>{sc.label}</div>
            <div className={styles.statusSub}>
              {order.status === 'pending'  && 'طلبك قيد المراجعة من الأدمن. سيتم إعلامك فور الموافقة.'}
              {order.status === 'approved' && 'تمت الموافقة على طلبك! يرجى إرسال المبلغ على الرقم أدناه.'}
              {order.status === 'rejected' && 'تم رفض طلبك. يمكنك إنشاء طلب جديد.'}
              {order.status === 'paid'     && 'تم استلام تأكيد دفعك. سيتم تفعيل الميزة قريباً.'}
              {order.status === 'cancelled'&& 'تم إلغاء الطلب.'}
            </div>
          </div>
          {order.status === 'pending' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{ marginLeft: 'auto' }}
            >
              <RefreshCw size={16} color={sc.color} />
            </motion.div>
          )}
        </motion.div>

        {/* Order Card */}
        <motion.div className={styles.card}
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}>

          <div className={styles.cardHeader}>
            <div className={styles.featureIcon}>
              <Crown size={20} color="var(--accent2)" />
            </div>
            <div>
              <h2 className={styles.featureTitle}>{FEATURE_LABELS[order.feature] || order.feature}</h2>
              <p className={styles.orderId}>طلب رقم: <code>{order.id?.slice(0,12)}...</code></p>
            </div>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detail}>
              <span>المبلغ</span>
              <strong>
                {order.amount > 0
                  ? `${order.amount} ${order.currency}`
                  : <span style={{color:'var(--success)'}}>مجاني 🎉</span>}
              </strong>
            </div>
            <div className={styles.detail}>
              <span>نوع الكود</span>
              <strong>{order.qrType}</strong>
            </div>
            <div className={styles.detail}>
              <span>تاريخ الطلب</span>
              <strong>
                {order.createdAt?.toDate?.()?.toLocaleDateString('ar-EG', {
                  day:'numeric', month:'long', year:'numeric'
                }) || '—'}
              </strong>
            </div>
            <div className={styles.detail}>
              <span>الحالة</span>
              <strong style={{color:sc.color}}>{sc.label}</strong>
            </div>
          </div>

          {/* QR Data preview */}
          <div className={styles.qrPreview}>
            <span>بيانات الكود:</span>
            <code>{order.qrData?.slice(0,60)}{order.qrData?.length > 60 ? '...' : ''}</code>
          </div>
        </motion.div>

        {/* Payment Section - only when approved */}
        <AnimatePresence>
          {order.status === 'approved' && (
            <motion.div className={styles.paymentCard}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>

              <div className={styles.paymentHeader}>
                <Phone size={18} color="var(--accent2)" />
                <h3>تعليمات الدفع</h3>
              </div>

              {order.amount > 0 ? (
                <>
                  <p className={styles.paymentDesc}>
                    يرجى إرسال المبلغ عبر <strong>اتصالات كاش</strong> على الرقم التالي:
                  </p>
                  <div className={styles.phoneBox}>
                    <span className={styles.phoneNumber}>{order.paymentPhone}</span>
                    <button className={styles.copyBtn}
                      onClick={() => {
                        navigator.clipboard?.writeText(order.paymentPhone);
                        toast.success('تم نسخ الرقم!');
                      }}>
                      نسخ
                    </button>
                  </div>
                  <div className={styles.amountBox}>
                    <span>المبلغ المستحق:</span>
                    <strong>{order.amount} {order.currency}</strong>
                  </div>
                  <p className={styles.paymentNote}>
                    📌 بعد إرسال المبلغ، اضغط على <strong>"أرسلت المبلغ"</strong> لإعلام الأدمن.
                  </p>
                </>
              ) : (
                <div className={styles.freeBox}>
                  <CheckCircle size={24} color="var(--success)" />
                  <div>
                    <strong>طلبك مجاني! 🎉</strong>
                    <p>وافق الأدمن على طلبك مجاناً. اضغط تأكيد لتفعيل الميزة.</p>
                  </div>
                </div>
              )}

              <div className={styles.paymentBtns}>
                <button className={styles.confirmBtn}
                  onClick={handleConfirmPayment} disabled={confirming}>
                  {confirming
                    ? <RefreshCw size={15} className={styles.spin} />
                    : <CheckCircle size={15} />}
                  {order.amount > 0 ? 'أرسلت المبلغ ✓' : 'تأكيد الاستلام ✓'}
                </button>
                <button className={styles.cancelBtn}
                  onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <RefreshCw size={14} className={styles.spin} /> : <XCircle size={14} />}
                  إلغاء الطلب
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paid confirmation */}
        {order.status === 'paid' && (
          <motion.div className={styles.paidCard}
            initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}>
            <CheckCircle size={40} color="var(--success)" />
            <h3>شكراً لك! 🎉</h3>
            <p>تم استلام تأكيد دفعك بنجاح. سيتم تفعيل الميزة المطلوبة خلال دقائق.</p>
            <button className="btn-primary" onClick={() => router.push('/')}>
              <QrCode size={15} /> العودة للمولّد
            </button>
          </motion.div>
        )}

        {/* Rejected */}
        {order.status === 'rejected' && (
          <motion.div className={styles.rejectedCard}
            initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <XCircle size={32} color="var(--danger)" />
            <h3>تم رفض الطلب</h3>
            <p>للأسف تم رفض طلبك. يمكنك التواصل مع الأدمن أو إنشاء طلب جديد.</p>
            <button className="btn-primary" onClick={() => router.push('/')}>
              العودة وإنشاء طلب جديد
            </button>
          </motion.div>
        )}

        {/* Pending note */}
        {order.status === 'pending' && (
          <div className={styles.pendingNote}>
            <Clock size={14} color="var(--text3)" />
            <p>سيتم إعلامك تلقائياً عند مراجعة طلبك. لا تحتاج لتحديث الصفحة.</p>
          </div>
        )}

      </div>
    </div>
  );
}
