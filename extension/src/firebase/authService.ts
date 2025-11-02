// Firebase認証サービス（シンプル版）
import { signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./config";
import { isEmailAllowed } from "../config/allowedUsers";

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: number;
    lastLoginAt: number;
}

interface AuthMessage {
    type: "AUTH_SUCCESS" | "AUTH_ERROR";
    user?: {
        uid: string;
        email: string;
        displayName: string;
        photoURL?: string;
    };
    error?: string;
}

class AuthService {
    // 外部認証ページでのログイン
    async signInWithGoogle(): Promise<UserProfile | null> {
        try {
            // GitHub Pages の認証URL（拡張機能IDを含める）
            const extensionId = chrome.runtime.id;
            const authUrl = `https://seiseikinkin.github.io/maus-hub/extension/auth.html?extension=true&extensionId=${extensionId}`;

            // 新しいタブで認証ページを開く
            const authTab = await chrome.tabs.create({
                url: authUrl,
                active: true,
            });

            // 認証完了を待つ（メッセージ監視）
            return new Promise((resolve, reject) => {
                const messageListener = (message: AuthMessage, sender: chrome.runtime.MessageSender) => {
                    // コンテンツスクリプトからのメッセージを確認
                    if (message.type === "AUTH_SUCCESS" && message.user && sender.tab?.id === authTab.id) {
                        chrome.runtime.onMessage.removeListener(messageListener);
                        chrome.tabs.remove(authTab.id!);

                        // 認証成功時の処理
                        this.handleAuthSuccess(message.user).then(resolve).catch(reject);
                    }
                };

                chrome.runtime.onMessage.addListener(messageListener);

                // タブが閉じられた時の監視（フォールバック）
                const onTabRemoved = (tabId: number) => {
                    if (tabId === authTab.id) {
                        chrome.tabs.onRemoved.removeListener(onTabRemoved);
                        chrome.runtime.onMessage.removeListener(messageListener);
                        reject(new Error("認証がキャンセルされました"));
                    }
                };

                chrome.tabs.onRemoved.addListener(onTabRemoved);

                // タイムアウト処理（5分）
                setTimeout(() => {
                    chrome.runtime.onMessage.removeListener(messageListener);
                    chrome.tabs.onRemoved.removeListener(onTabRemoved);
                    if (authTab.id) {
                        chrome.tabs.remove(authTab.id);
                    }
                    reject(new Error("認証がタイムアウトしました"));
                }, 300000);
            });
        } catch (error) {
            console.error("Google login error:", error);
            throw error;
        }
    }

    // 認証成功時の処理
    private async handleAuthSuccess(user: AuthMessage["user"]): Promise<UserProfile | null> {
        try {
            if (!user) {
                throw new Error("ユーザー情報が取得できませんでした");
            }

            // メールアドレスが許可されているかチェック
            if (!user.email || !(await isEmailAllowed(user.email))) {
                throw new Error("このメールアドレスはログインが許可されていません。管理者にお問い合わせください。");
            }

            // ユーザープロファイルを作成
            const userProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split("@")[0],
                photoURL: user.photoURL || undefined,
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
            };

            // Firestoreに保存
            await this.saveUserProfileToFirestore(userProfile);

            // Chrome拡張機能のストレージに保存
            await chrome.storage.local.set({
                currentUser: userProfile,
                isAuthenticated: true,
            });

            return userProfile;
        } catch (error) {
            console.error("Auth success handling error:", error);
            throw error;
        }
    }

    // Firestoreにユーザープロファイルを保存
    private async saveUserProfileToFirestore(userProfile: UserProfile): Promise<void> {
        try {
            const userDocRef = doc(db, "users", userProfile.uid);
            await setDoc(userDocRef, userProfile, { merge: true });
        } catch (error) {
            console.error("Error saving user profile:", error);
            throw error;
        }
    }

    // ログアウト
    async signOut(): Promise<void> {
        try {
            await signOut(auth);
            // Chrome拡張機能のストレージからも削除
            await chrome.storage.local.remove(["currentUser", "isAuthenticated"]);
        } catch (error) {
            console.error("Logout error:", error);
            throw error;
        }
    }

    // Chrome拡張機能用：現在のユーザー情報を取得
    async getCurrentUserFromStorage(): Promise<UserProfile | null> {
        try {
            const result = await chrome.storage.local.get(["currentUser"]);
            return result.currentUser || null;
        } catch (error) {
            console.error("Error getting user from storage:", error);
            return null;
        }
    }

    // Chrome拡張機能用：認証状態を取得
    async getAuthStateFromStorage(): Promise<boolean> {
        try {
            const result = await chrome.storage.local.get(["isAuthenticated"]);
            return result.isAuthenticated || false;
        } catch (error) {
            console.error("Error getting auth state from storage:", error);
            return false;
        }
    }

    // 認証状態の監視
    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }

    // 現在のユーザーを取得
    getCurrentUser(): User | null {
        return auth.currentUser;
    }

    // PokePasteデータをユーザーに関連付けて保存
    async savePokePasteForUser(url: string, title: string): Promise<void> {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error("User not authenticated");
        }

        const pokePasteData = {
            url,
            title,
            timestamp: Date.now(),
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: user.uid,
        };

        const pokePasteRef = doc(db, "pokepastes", pokePasteData.id);
        await setDoc(pokePasteRef, pokePasteData);
    }
}

export const authService = new AuthService();
