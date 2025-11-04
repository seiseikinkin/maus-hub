import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import mausIcon from "../assets/icon.png";

export const LoginComponent: React.FC = () => {
    const { signInWithGoogle, loading } = useAuth();
    const [error, setError] = useState<string | null>(null);

    // モバイルデバイスかどうかを判定
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const handleGoogleSignIn = async () => {
        try {
            setError(null);

            if (import.meta.env.DEV) {
                console.log("Login button clicked");
                console.log("Is mobile:", isMobile);
                console.log("Current URL:", window.location.href);
            }

            await signInWithGoogle();
        } catch (error) {
            console.error("Login error:", error);

            let errorMessage = "ログインに失敗しました。もう一度お試しください。";

            if (error instanceof Error) {
                if (error.message.startsWith("UNAUTHORIZED_EMAIL:")) {
                    const email = error.message.split(":")[1];
                    errorMessage = `申し訳ございませんが、メールアドレス「${email}」はこのアプリケーションの利用を許可されていません。アクセス権限が必要な場合は、管理者にお問い合わせください。`;
                } else if (error.message === "NO_EMAIL_FOUND") {
                    errorMessage = "Googleアカウントからメールアドレスを取得できませんでした。アカウントの設定をご確認ください。";
                } else if (error.message.includes("popup-closed-by-user")) {
                    errorMessage = "ログインがキャンセルされました。";
                } else if (error.message.includes("popup-blocked")) {
                    errorMessage = "ポップアップがブロックされました。リダイレクト方式で再試行されます。";
                } else if (error.message.includes("Cross-Origin-Opener-Policy")) {
                    errorMessage = "ブラウザのセキュリティ設定により、リダイレクト方式で認証を行います。";
                }
            }

            setError(errorMessage);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={mausIcon} alt="Maus Hub" className="header-icon" />
                    <h2>Maus Hub</h2>
                    <div className="access-notice">
                        <p>⚠️ このアプリケーションは許可されたユーザーのみご利用いただけます</p>
                    </div>
                </div>

                <div className="login-content">
                    <div className="login-actions">
                        <button onClick={handleGoogleSignIn} disabled={loading} className="google-signin-button">
                            {loading ? (
                                <>
                                    <div className="loading-spinner-small"></div>
                                    <span>ログイン中...</span>
                                </>
                            ) : (
                                <>
                                    <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
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
            </div>
        </div>
    );
};
