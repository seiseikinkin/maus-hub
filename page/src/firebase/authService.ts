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
                    console.log("Current URL:", window.location.href);
                }
                await signInWithRedirect(auth, googleProviderRedirect);
                // リダイレクト開始（結果は次回ページロード時に取得）
                return null;
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
            if (import.meta.env.DEV) {
                console.log("Getting redirect result...");
                console.log("Current auth state:", auth.currentUser ? "User logged in" : "No user");
            }

            const result = await getRedirectResult(auth);

            if (result?.user) {
                if (import.meta.env.DEV) {
                    console.log("Redirect result found");
                }
                return await this.validateAndProcessUser(result.user);
            }

            // リダイレクト結果がなくても、currentUserが存在する場合
            // 許可チェックを行ってから返す（Safari対策）
            if (auth.currentUser) {
                if (import.meta.env.DEV) {
                    console.log("No redirect result, but currentUser exists");
                    console.log("Validating currentUser...");
                }
                // currentUserも許可チェックを通す
                return await this.validateAndProcessUser(auth.currentUser);
            }

            if (import.meta.env.DEV) {
                console.log("No redirect result and no currentUser found");
            }
            return null;
        } catch (error) {
            console.error("Redirect result error:", error);
            // エラーの詳細をログに出力
            if (error instanceof Error) {
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
            }
            throw error;
        }
    }

    // ユーザーの許可チェックと処理
    private async validateAndProcessUser(user: User): Promise<User | null> {
        // メールアドレスが許可リストに含まれているかチェック
        if (user?.email) {
            const isAllowed = await allowedUsersService.isEmailAllowed(user.email);

            if (!isAllowed) {
                console.warn("Unauthorized user login attempt");
                // 許可されていないユーザーは即座にサインアウト
                await this.signOut();
                throw new Error(`UNAUTHORIZED_EMAIL:${user.email}`);
            }

            if (import.meta.env.DEV) {
                console.log("User sign-in successful for authorized user");
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
