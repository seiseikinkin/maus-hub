import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider, googleProviderRedirect } from "./config";
import { allowedUsersService } from "./allowedUsersService";

export class AuthService {
    // Googleでサインイン（ポップアップ方式を優先）
    async signInWithGoogle(): Promise<User | null> {
        try {
            // モバイルデバイスの場合のみリダイレクト方式を使用
            if (this.shouldUseRedirect()) {
                if (import.meta.env.DEV) {
                    console.log("Using redirect authentication method for mobile");
                }
                await signInWithRedirect(auth, googleProviderRedirect);
                return null; // リダイレクト後に結果を取得
            }

            // デスクトップでは常にポップアップ方式を使用
            if (import.meta.env.DEV) {
                console.log("Using popup authentication method");
            }

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            return await this.validateAndProcessUser(user);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error("Google sign-in error:", error);
            }
            throw error;
        }
    }

    // リダイレクト方式を使用すべきかどうかを判定（ポップアップを優先）
    private shouldUseRedirect(): boolean {
        // モバイルデバイスの検出
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // モバイルデバイスの場合のみリダイレクトを使用
        // デスクトップでは常にポップアップを試行
        return isMobile;
    }

    // リダイレクト後の結果を処理
    async handleRedirectResult(): Promise<User | null> {
        try {
            const result = await getRedirectResult(auth);
            if (result?.user) {
                return await this.validateAndProcessUser(result.user);
            }
            return null;
        } catch (error) {
            console.error("Redirect result error:", error);
            throw error;
        }
    }

    // ユーザーの許可チェックと処理
    private async validateAndProcessUser(user: User): Promise<User | null> {
        // メールアドレスが許可リストに含まれているかチェック
        if (user?.email) {
            const isAllowed = await allowedUsersService.isEmailAllowed(user.email);

            if (!isAllowed) {
                console.warn(`Unauthorized email attempt: ${user.email}`);
                // 許可されていないユーザーは即座にサインアウト
                await this.signOut();
                throw new Error(`UNAUTHORIZED_EMAIL:${user.email}`);
            }

            if (import.meta.env.DEV) {
                console.log("Google sign-in successful for authorized user:", user.email);
            }
        } else {
            console.error("No email address found in user profile");
            await this.signOut();
            throw new Error("NO_EMAIL_FOUND");
        }

        return user;
    }

    // サインアウト
    async signOut(): Promise<void> {
        try {
            await signOut(auth);
            if (import.meta.env.DEV) {
                console.log("Sign-out successful");
            }
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error("Sign-out error:", error);
            }
            throw error;
        }
    }

    // 現在のユーザーを取得
    getCurrentUser(): User | null {
        return auth.currentUser;
    }

    // 認証状態の変更を監視
    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }

    // ユーザーがログインしているかチェック
    isAuthenticated(): boolean {
        return auth.currentUser !== null;
    }

    // ユーザーの表示名を取得
    getUserDisplayName(): string {
        const user = this.getCurrentUser();
        return user?.displayName || user?.email || "Unknown User";
    }

    // ユーザーのプロフィール画像URLを取得
    getUserPhotoURL(): string | null {
        const user = this.getCurrentUser();
        return user?.photoURL || null;
    }

    // ユーザーのメールアドレスを取得
    getUserEmail(): string | null {
        const user = this.getCurrentUser();
        return user?.email || null;
    }

    // ユーザーのUIDを取得
    getUserUID(): string | null {
        const user = this.getCurrentUser();
        return user?.uid || null;
    }
}

export const authService = new AuthService();
