import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser');
    }
});

const googleProvider = new GoogleAuthProvider();

const signInWithGoogle = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (e) {
        const ignored = ['auth/cancelled-popup-request', 'auth/popup-closed-by-user'];
        if (!ignored.includes(e.code)) {
            console.error(e);
        }
    }
};

const logOut = () => signOut(auth);

export { auth, db, signInWithGoogle, logOut };
