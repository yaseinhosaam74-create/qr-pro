// lib/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBzsAFit0BUeEBmj4ZFg-1hXye4QCbYUTk",
  authDomain: "qrcode-e642b.firebaseapp.com",
  projectId: "qrcode-e642b",
  storageBucket: "qrcode-e642b.firebasestorage.app",
  messagingSenderId: "722191915998",
  appId: "1:722191915998:web:ec97398ecae08476e61b4f",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
