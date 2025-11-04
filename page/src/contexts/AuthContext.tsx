import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { authService } from "../firebase/authService";
import type { User } from "firebase/auth";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    getUserDisplayName: () => string;
    getUserPhotoURL: () => string | null;
    getUserEmail: () => string | null;
    getUserUID: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let mounted = true;

        const initializeAuth = async () => {
            try {
                if (import.meta.env.DEV) {
                    console.log("=== Auth initialization started ===");
                }

                // 認証状態の変更を監視開始（先に設定）
                unsubscribe = authService.onAuthStateChanged((authUser) => {
                    if (import.meta.env.DEV) {
                        console.log("Auth state changed:", authUser ? "User logged in" : "No user");
                    }
                    if (mounted) {
                        setUser(authUser);
                        // onAuthStateChangedが呼ばれたらloadingをfalseに
                        setLoading(false);
                    }
                });

                // リダイレクト結果をチェック（ページロード時に1回のみ）
                if (import.meta.env.DEV) {
                    console.log("Checking redirect result...");
                }

                try {
                    const redirectUser = await authService.handleRedirectResult();
                    if (redirectUser && mounted) {
                        if (import.meta.env.DEV) {
                            console.log("Redirect authentication successful");
                        }
                        // リダイレクト認証成功時は明示的にuserを設定
                        setUser(redirectUser);
                        setLoading(false);
                    } else if (import.meta.env.DEV) {
                        console.log("No redirect user found");
                    }
                } catch (error) {
                    console.error("Redirect result error:", error);

                    // エラーの詳細をログ出力
                    if (error instanceof Error) {
                        console.error("Error type:", error.name);
                        console.error("Error message:", error.message);

                        // UNAUTHORIZED_EMAILエラーの場合は明示的にユーザーに通知
                        if (error.message.startsWith("UNAUTHORIZED_EMAIL:")) {
                            alert(
                                "アクセスが拒否されました。\n\nお使いのアカウントはこのアプリケーションの利用を許可されていません。\n\nアクセス権限が必要な場合は、管理者にお問い合わせください。"
                            );
                        }
                    }

                    // エラー時はloadingを解除してログイン画面を表示
                    if (mounted) {
                        setLoading(false);
                    }
                }

                if (import.meta.env.DEV) {
                    console.log("=== Auth initialization completed ===");
                }
            } catch (error) {
                console.error("Auth initialization error:", error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        return () => {
            mounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []); // 空の依存配列で初回のみ実行

    const signInWithGoogle = useCallback(async () => {
        try {
            setLoading(true);
            await authService.signInWithGoogle();
        } catch (error) {
            console.error("Sign in error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            setLoading(true);
            await authService.signOut();
        } catch (error) {
            console.error("Sign out error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const getUserDisplayName = useCallback((): string => {
        return user?.displayName || user?.email || "Unknown User";
    }, [user]);

    const getUserPhotoURL = useCallback((): string | null => {
        return user?.photoURL || null;
    }, [user]);

    const getUserEmail = useCallback((): string | null => {
        return user?.email || null;
    }, [user]);

    const getUserUID = useCallback((): string | null => {
        return user?.uid || null;
    }, [user]);

    const value: AuthContextType = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: !!user,
            signInWithGoogle,
            signOut,
            getUserDisplayName,
            getUserPhotoURL,
            getUserEmail,
            getUserUID,
        }),
        [user, loading, signInWithGoogle, signOut, getUserDisplayName, getUserPhotoURL, getUserEmail, getUserUID]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
