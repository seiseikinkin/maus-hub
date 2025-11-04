import React, { createContext, useContext, useEffect, useState } from "react";
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
                // まずリダイレクト結果をチェック（ページロード時に1回のみ）
                if (import.meta.env.DEV) {
                    console.log("Checking redirect result...");
                }

                try {
                    const redirectUser = await authService.handleRedirectResult();
                    if (redirectUser && mounted) {
                        if (import.meta.env.DEV) {
                            console.log("Redirect authentication successful:", redirectUser.email);
                        }
                    }
                } catch (error) {
                    console.error("Redirect result error:", error);
                    // エラーがあってもアプリは継続
                }

                // 認証状態の変更を監視
                if (mounted) {
                    unsubscribe = authService.onAuthStateChanged((user) => {
                        if (import.meta.env.DEV) {
                            console.log("Auth state changed:", user?.email || "No user");
                        }
                        if (mounted) {
                            setUser(user);
                            setLoading(false);
                        }
                    });
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

    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            await authService.signInWithGoogle();
        } catch (error) {
            console.error("Sign in error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            await authService.signOut();
        } catch (error) {
            console.error("Sign out error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const getUserDisplayName = (): string => {
        return user?.displayName || user?.email || "Unknown User";
    };

    const getUserPhotoURL = (): string | null => {
        return user?.photoURL || null;
    };

    const getUserEmail = (): string | null => {
        return user?.email || null;
    };

    const getUserUID = (): string | null => {
        return user?.uid || null;
    };

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signOut,
        getUserDisplayName,
        getUserPhotoURL,
        getUserEmail,
        getUserUID,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
