import React, { useState, useEffect } from "react";
import { authService } from "../firebase/authService";
import type { UserProfile } from "../firebase/authService";
import type { User } from "firebase/auth";

interface DarkTheme {
    background: string;
    surface: string;
    surfaceVariant: string;
    primary: string;
    error: string;
    success: string;
    border: string;
    onSurface: string;
    onSurfaceVariant: string;
}

interface LoginComponentProps {
    onLogin: (user: UserProfile) => void;
    onLogout: () => void;
    darkTheme: DarkTheme;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onLogin, onLogout, darkTheme }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        // Chrome拡張機能のストレージから認証状態を読み込み
        const loadAuthState = async () => {
            try {
                const result = await chrome.storage.local.get(["currentUser", "isAuthenticated"]);
                if (result.currentUser && result.isAuthenticated) {
                    setIsAuthenticated(true);
                    setUser({
                        uid: result.currentUser.uid,
                        email: result.currentUser.email,
                        displayName: result.currentUser.displayName,
                        photoURL: result.currentUser.photoURL || null,
                    } as User);
                    onLogin(result.currentUser);
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                    onLogout();
                }
            } catch (error) {
                console.error("Error loading auth state:", error);
                setIsAuthenticated(false);
                setUser(null);
                onLogout();
            }
        };

        // ストレージの変更を監視
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.currentUser || changes.isAuthenticated) {
                loadAuthState();
            }
        };

        loadAuthState();
        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, [onLogin, onLogout]);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError("");

        try {
            const userProfile = await authService.signInWithGoogle();
            if (userProfile) {
                // 成功時にストレージ変更イベントが発火されるため、UIは自動的に更新される
                console.log("Login successful:", userProfile);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "Google login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await authService.signOut();
            // ストレージ変更イベントが発火されるため、UIは自動的に更新される
        } catch (error) {
            setError(error instanceof Error ? error.message : "Logout failed");
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthenticated && user) {
        return (
            <div
                style={{
                    padding: "12px",
                    marginBottom: "16px",
                    backgroundColor: `${darkTheme.success}20`,
                    borderRadius: "6px",
                    border: `1px solid ${darkTheme.success}40`,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                marginRight: "8px",
                            }}
                        />
                    )}
                    <div>
                        <div
                            style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                color: darkTheme.onSurface,
                            }}
                        >
                            {user.displayName || "Unknown User"}
                        </div>
                        <div
                            style={{
                                fontSize: "11px",
                                color: darkTheme.onSurfaceVariant,
                            }}
                        >
                            {user.email}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        fontSize: "12px",
                        color: darkTheme.success,
                        fontWeight: "600",
                        marginBottom: "8px",
                        textAlign: "center",
                    }}
                >
                    ✅ ログイン成功！すべての機能が利用可能です
                </div>
                <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    style={{
                        width: "100%",
                        padding: "6px 12px",
                        backgroundColor: darkTheme.error,
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    {isLoading ? "Logging out..." : "Logout"}
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                padding: "12px",
                marginBottom: "16px",
                backgroundColor: darkTheme.surface,
                borderRadius: "6px",
                border: `1px solid ${darkTheme.border}`,
            }}
        >
            <h3
                style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    color: darkTheme.onSurface,
                    textAlign: "center",
                }}
            >
                Login to sync your data
            </h3>

            {error && (
                <div
                    style={{
                        padding: "8px",
                        marginBottom: "12px",
                        backgroundColor: `${darkTheme.error}20`,
                        border: `1px solid ${darkTheme.error}40`,
                        borderRadius: "4px",
                        fontSize: "11px",
                        color: darkTheme.error,
                    }}
                >
                    {error}
                </div>
            )}

            <div>
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    style={{
                        width: "100%",
                        padding: "8px 12px",
                        backgroundColor: "#4285f4",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    {isLoading ? "Signing in..." : "Sign in with Google"}
                </button>
                <div
                    style={{
                        fontSize: "11px",
                        color: darkTheme.onSurfaceVariant,
                        textAlign: "center",
                        marginTop: "8px",
                    }}
                >
                    管理者によって許可されたGoogleアカウントのみログイン可能です
                </div>
            </div>
        </div>
    );
};

export default LoginComponent;
