// Firebase設定ファイル
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase設定（実際のプロジェクトの値に置き換えてください）
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "your-measurement-id",
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreの初期化
export const auth = getAuth(app);
export const db = getFirestore(app);

// 認証の永続性を設定（Safari対応のため明示的に設定）
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Failed to set auth persistence:", error);
});

// Google認証プロバイダー（ポップアップ用）
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({
    prompt: "select_account",
});

// Google認証プロバイダー（リダイレクト用）
export const googleProviderRedirect = new GoogleAuthProvider();
googleProviderRedirect.addScope("profile");
googleProviderRedirect.addScope("email");
googleProviderRedirect.setCustomParameters({
    prompt: "select_account",
    ux_mode: "redirect",
    access_type: "online",
});

export default app;
