import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../firebase/authService';
import type { User } from 'firebase/auth';

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
        throw new Error('useAuth must be used within an AuthProvider');
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
        // リダイレクト結果をチェック
        const handleRedirectResult = async () => {
            try {
                await authService.handleRedirectResult();
            } catch (error) {
                console.error('Redirect result error:', error);
            }
        };

        // 認証状態の変更を監視
        const unsubscribe = authService.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });

        // リダイレクト結果を処理
        handleRedirectResult();

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            await authService.signInWithGoogle();
        } catch (error) {
            console.error('Sign in error:', error);
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
            console.error('Sign out error:', error);
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

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};