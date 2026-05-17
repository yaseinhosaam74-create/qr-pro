// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user,     setUser]     = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        try {
          const ref  = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            setUserData(snap.data());
          } else {
            // إنشاء مستخدم جديد في Firestore
            const newUser = {
              email:      firebaseUser.email       || '',
              name:       firebaseUser.displayName || '',
              photoURL:   firebaseUser.photoURL    || '',
              role:       'user',
              freeAccess: false,
              createdAt:  serverTimestamp(),
              qrCount:    0,
            };
            await setDoc(ref, newUser);
            setUserData(newUser);
          }
        } catch (err) {
          console.error('Firestore error:', err.message);
          setUserData({ role: 'user', freeAccess: false });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  const isAdmin = userData?.role === 'admin';
  const isVIP   = isAdmin || userData?.role === 'vip' || userData?.freeAccess === true;

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout, isAdmin, isVIP }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
