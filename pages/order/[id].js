// pages/order/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';
import {
  Clock, CheckCircle, XCircle, Phone,
  RefreshCw, QrCode, Crown, Copy
} from 'lucide-react';
import styles from '../../styles/Order.module.css';

export default function OrderPage({ theme, toggleTheme, lang, toggleLang }) {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useAuth();
  const ar = lang === 'ar';
  const [order,      setOrder]      = useState(null);
  const [fetching,   setFetching]   = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!id || !user) return;
    setFetching(true);
    const unsub = onSnapshot(doc(db, 'orders', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setOrder(data);
      } else {
        router.replace('/');
      }
      setFetching(false);
    }, (err) => {
      console.error('Order snapshot error:', err);
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
      toast.success(ar ? '✅ تم إرسال تأكيد الدفع!' : '✅ Payment confirmed!');
    } catch (e) {
      toast.error(ar ? 'حدث خطأ' : 'Error occurred');
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
      toast.success(ar ? 'تم إلغاء الطلب' : 'Order cancelled');
      router.replace('/');
    } catch {
      toast.error(ar ? 'حدث خطأ' : 'Error occurred');
    } finally {
      setCancelling(false);
    }
  };

  const copyPhone = () => {
    navigator.clipboard?.writeText(order?.paymentPhone || '');
    toast.success(ar ? 'تم نسخ الرقم!' : 'Number copied!');
  };

  const FEATURE_LABELS = {
    highQuality: ar ? 'جودة عالية (1024px)' : 'High Quality (1024px)',
    gradient:    ar ? 'تدرج الألوان'         : 'Color Gradient',
    bgImage:     ar ? 'صورة خلفية'           : 'Background Image',
  };

  const STATUS = {
    pending:   { label: ar ? 'قيد المراجعة'   : 'Under Review',     color:'#f59e0b', icon:Clock },
    approved:  { label: ar ? 'تمت الموافقة'   : 'Approved',         color:'#10b981', icon:CheckCircle },
    rejected:  { label: ar ? 'مرفوض'          : 'Rejected',         color:'#ef4444', icon:XCircle },
    paid:      { label: ar ? 'تم إرسال الدفع' : 'Payment Sent',     color:'#0090c1', icon:CheckCircle },
    cancelled: { label: ar ? 'ملغى'           : 'Cancelled',        color:'#606080', icon:XCircle },
  };

  const fmtDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { day:'numeric', month:'long', year:'numeric' });
  };

  if (loading || fetching) return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} />
      <div className={styles.center}>
        <RefreshCw size={28} className={styles.spin} color="var(--accent)" />
        <p style={{ color:'var(--text2)', fontSize:14, marginTop:12 }}>
          {ar ? 'جارٍ تحميل الطلب...' : 'Loading order...'}
        </p>
      </div>
    </div>
  );

  if (!order) return null;

  const sc = STATUS[order.status] || STATUS.pending;
  const StatusIcon = sc.icon;
  const amount = Number(order.amount) || 0;

  return (
    <div className={styles.page}>
      <Navbar theme={theme} toggleTheme={toggleTheme} lang={lang} toggleLang={toggleLang} />
      <div className={styles.wrap}>

        {/* Status Banner */}
        <motion.div className={styles.statusBanner}
          style={{ background: sc.color + '18', borderColor: sc.color + '40' }}
          initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}>
          <StatusIcon size={22} color={sc.color} />
          <div style={{ flex:1 }}>
            <div className={styles.statusLabel} style={{ color:sc.color }}>{sc.label}</div>
            <div className={styles.statusSub}>
              {order.status === 'pending'  && (ar ? 'طلبك قيد المراجعة. سيتم إعلامك فور الموافقة تلقائياً.' : 'Your request is under review. You will be notified automatically.')}
              {order.status === 'approved' && (ar ? 'تمت الموافقة! يرجى إرسال المبلغ على الرقم أدناه.' : 'Approved! Please send payment to the number below.')}
              {order.status === 'rejected' && (ar ? 'تم رفض طلبك.' : 'Your request was rejected.')}
              {order.status === 'paid'     && (ar ? 'تم استلام تأكيد دفعك. سيتم التفعيل قريباً.' : 'Payment confirmation received. Feature will be activated soon.')}
              {order.status === 'cancelled'&& (ar ? 'تم إلغاء الطلب.' : 'Order cancelled.')}
            </div>
          </div>
          {order.status === 'pending' && (
            <motion.div animate={{ rotate:360 }} transition={{ duration:3, repeat:Infinity, ease:'linear' }}>
              <RefreshCw size={16} color={sc.color} />
            </motion.div>
          )}
        </motion.div>

        {/* Order Card */}
        <motion.div className={styles.card}
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}>

          <div className={styles.cardHeader}>
            <div className={styles.featureIcon}><Crown size={20} color="var(--accent2)" /></div>
            <div>
              <h2 className={styles.featureTitle}>{FEATURE_LABELS[order.feature] || order.feature}</h2>
              <p className={styles.orderId}>
                {ar ? 'طلب رقم:' : 'Order:'} <code>{order.id?.slice(0, 14)}...</code>
              </p>
            </div>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detail}>
              <span>{ar ? 'المبلغ' : 'Amount'}</span>
              <strong style={{ color: amount === 0 ? 'var(--success)' : 'var(--text)' }}>
                {amount === 0 ? (ar ? 'مجاني 🎉' : 'Free 🎉') : `${amount} ${order.currency}`}
              </strong>
            </div>
            <div className={styles.detail}>
              <span>{ar ? 'نوع الكود' : 'QR Type'}</span>
              <strong>{order.qrType}</strong>
            </div>
            <div className={styles.detail}>
              <span>{ar ? 'تاريخ الطلب' : 'Order Date'}</span>
              <strong>{fmtDate(order.createdAt)}</strong>
            </div>
            <div className={styles.detail}>
              <span>{ar ? 'الحالة' : 'Status'}</span>
              <strong style={{ color:sc.color }}>{sc.label}</strong>
            </div>
          </div>

          {/* Full QR Data */}
          <div className={styles.qrPreview}>
            <span>{ar ? 'محتوى كود QR كاملاً:' : 'Full QR Code Content:'}</span>
            <code>{order.qrData}</code>
          </div>
        </motion.div>

        {/* Payment Section */}
        <AnimatePresence>
          {order.status === 'approved' && (
            <motion.div className={styles.paymentCard}
              initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className={styles.paymentHeader}>
                <Phone size={18} color="var(--accent2)" />
                <h3>{ar ? 'تعليمات الدفع' : 'Payment Instructions'}</h3>
              </div>

              {amount > 0 ? (
                <>
                  <p className={styles.paymentDesc}>
                    {ar ? 'يرجى إرسال المبلغ عبر اتصالات كاش على الرقم:' : 'Send payment via Etisalat Cash to:'}
                  </p>
                  <div className={styles.phoneBox}>
                    <span className={styles.phoneNumber}>{order.paymentPhone || '+201121454510'}</span>
                    <button className={styles.copyBtn} onClick={copyPhone}>
                      <Copy size={13} /> {ar ? 'نسخ' : 'Copy'}
                    </button>
                  </div>
                  <div className={styles.amountBox}>
                    <span>{ar ? 'المبلغ المستحق:' : 'Amount Due:'}</span>
                    <strong>{amount} {order.currency}</strong>
                  </div>
                  <p className={styles.paymentNote}>
                    {ar
                      ? '📌 بعد إرسال المبلغ، اضغط "أرسلت المبلغ" لإعلام الأدمن.'
                      : '📌 After sending payment, tap "I Sent Payment" to notify admin.'}
                  </p>
                </>
              ) : (
                <div className={styles.freeBox}>
                  <CheckCircle size={24} color="var(--success)" />
                  <div>
                    <strong>{ar ? 'طلبك مجاني! 🎉' : 'Your request is free! 🎉'}</strong>
                    <p>{ar ? 'وافق الأدمن مجاناً. اضغط تأكيد.' : 'Admin approved for free. Tap confirm.'}</p>
                  </div>
                </div>
              )}

              <div className={styles.paymentBtns}>
                <button className={styles.confirmBtn} onClick={handleConfirmPayment} disabled={confirming}>
                  {confirming ? <RefreshCw size={15} className={styles.spin} /> : <CheckCircle size={15} />}
                  {amount > 0 ? (ar ? 'أرسلت المبلغ ✓' : 'I Sent Payment ✓') : (ar ? 'تأكيد الاستلام ✓' : 'Confirm ✓')}
                </button>
                <button className={styles.cancelBtn} onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <RefreshCw size={14} className={styles.spin} /> : <XCircle size={14} />}
                  {ar ? 'إلغاء الطلب' : 'Cancel Order'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {order.status === 'paid' && (
          <motion.div className={styles.paidCard} initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}>
            <CheckCircle size={40} color="var(--success)" />
            <h3>{ar ? 'شكراً! 🎉' : 'Thank you! 🎉'}</h3>
            <p>{ar ? 'تم استلام تأكيد دفعك. سيتم التفعيل خلال دقائق.' : 'Payment confirmed. Feature will be activated shortly.'}</p>
            <button className="btn-primary" onClick={() => router.push('/')}>
              <QrCode size={15} /> {ar ? 'العودة للمولّد' : 'Back to Generator'}
            </button>
          </motion.div>
        )}

        {order.status === 'rejected' && (
          <motion.div className={styles.rejectedCard} initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <XCircle size={32} color="var(--danger)" />
            <h3>{ar ? 'تم رفض الطلب' : 'Order Rejected'}</h3>
            <p>{ar ? 'يمكنك إنشاء طلب جديد.' : 'You can submit a new request.'}</p>
            <button className="btn-primary" onClick={() => router.push('/')}>
              {ar ? 'العودة وإنشاء طلب جديد' : 'Back & New Request'}
            </button>
          </motion.div>
        )}

        {order.status === 'pending' && (
          <div className={styles.pendingNote}>
            <Clock size={14} color="var(--text3)" />
            <p>{ar ? 'سيتم إعلامك تلقائياً. لا تحتاج لتحديث الصفحة.' : 'You will be notified automatically. No need to refresh.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
