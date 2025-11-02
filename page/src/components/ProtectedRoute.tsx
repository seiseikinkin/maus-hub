import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginComponent } from './LoginComponent';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    // 認証状態を確認中
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-content">
                    <div className="loading-spinner"></div>
                    <h2>Maus Hub</h2>
                    <p>認証状態を確認中...</p>
                </div>
            </div>
        );
    }

    // 未認証の場合はログイン画面を表示
    if (!isAuthenticated) {
        return <LoginComponent />;
    }

    // 認証済みの場合は子コンポーネントを表示
    return <>{children}</>;
};