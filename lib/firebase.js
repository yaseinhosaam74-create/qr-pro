// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
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
  measurementId: "G-49NXG7DSBJ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
