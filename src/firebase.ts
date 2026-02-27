import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEiLSQacEQ9hkhVjmaAzPNfIGc26SW-Og",
  authDomain: "todo-app-24b14.firebaseapp.com",
  projectId: "todo-app-24b14",
  storageBucket: "todo-app-24b14.firebasestorage.app",
  messagingSenderId: "264066970174",
  appId: "1:264066970174:web:473fe75770937dc1e1176f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
