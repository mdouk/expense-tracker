import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyAhnhaae7BUPcho7VWOOFtZgXI41Js293I",
    authDomain: "expense-tracker-54bda.firebaseapp.com",
    projectId: "expense-tracker-54bda",
    storageBucket: "expense-tracker-54bda.firebasestorage.app",
    messagingSenderId: "911750100410",
    appId: "1:911750100410:web:14ecae5a3120293c621983",
    measurementId: "G-K5JNZH1G3L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

const signInWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (e) {
        console.error(e);
    }
};

const logOut = () => signOut(auth);

export { auth, db, signInWithGoogle, logOut };
