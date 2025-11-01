import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginComponent: React.FC = () => {
    const { signInWithGoogle, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            await signInWithGoogle();
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'ログインに失敗しました。もう一度お試しください。';
            
            if (error instanceof Error) {
                if (error.message.startsWith('UNAUTHORIZED_EMAIL:')) {
                    const email = error.message.split(':')[1];
                    errorMessage = `申し訳ございませんが、メールアドレス「${email}」はこのアプリケーションの利用を許可されていません。アクセス権限が必要な場合は、管理者にお問い合わせください。`;
                } else if (error.message === 'NO_EMAIL_FOUND') {
                    errorMessage = 'Googleアカウントからメールアドレスを取得できませんでした。アカウントの設定をご確認ください。';
                } else if (error.message.includes('popup-closed-by-user')) {
                    errorMessage = 'ログインがキャンセルされました。';
                } else if (error.message.includes('popup-blocked')) {
                    errorMessage = 'ポップアップがブロックされました。リダイレクト方式で再試行されます。';
                } else if (error.message.includes('Cross-Origin-Opener-Policy')) {
                    errorMessage = 'ブラウザのセキュリティ設定により、リダイレクト方式で認証を行います。';
                }
            }
            
            setError(errorMessage);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>🎮 PokePaste Hub</h2>
                    <p>PokePasteデータを管理するにはログインが必要です</p>
                    <div className="access-notice">
                        <p>⚠️ このアプリケーションは許可されたユーザーのみご利用いただけます</p>
                    </div>
                </div>

                <div className="login-content">
                    <div className="login-features">
                        <h3>利用できる機能：</h3>
                        <ul>
                            <li>📋 保存されたPokePasteの一覧表示</li>
                            <li>🔍 日付やユーザーIDでのフィルタリング</li>
                            <li>🌙 ダークモード対応</li>
                            <li>📱 レスポンシブデザイン</li>
                        </ul>
                    </div>

                    <div className="login-actions">
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="google-signin-button"
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner-small"></div>
                                    <span>ログイン中...</span>
                                </>
                            ) : (
                                <>
                                    <img 
                                        src="https://developers.google.com/identity/images/g-logo.png" 
                                        alt="Google" 
                                        className="google-icon"
                                    />
                                    <span>Googleでログイン</span>
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="login-error">
                                <p>{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="login-footer">
                    <p>
                        ログインすることで、
                        <a href="#" target="_blank" rel="noopener noreferrer">
                            利用規約
                        </a>
                        および
                        <a href="#" target="_blank" rel="noopener noreferrer">
                            プライバシーポリシー
                        </a>
                        に同意したものとみなされます。
                    </p>
                </div>
            </div>
        </div>
    );
};