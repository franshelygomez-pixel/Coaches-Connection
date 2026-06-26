import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDHTeA_Z16BoJFs4chwo8i2lIVovfdrwRI",
  authDomain: "coaches-conection.firebaseapp.com",
  projectId: "coaches-conection",
  storageBucket: "coaches-conection.firebasestorage.app",
  messagingSenderId: "638581554188",
  appId: "1:638581554188:web:bff9021082a837eda48229",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);