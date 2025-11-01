import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserProfile: React.FC = () => {
    const { 
        user, 
        signOut, 
        getUserDisplayName, 
        getUserPhotoURL, 
        getUserEmail 
    } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleSignOut = async () => {
        try {
            setLoading(true);
            await signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        } finally {
            setLoading(false);
            setShowDropdown(false);
        }
    };

    if (!user) return null;

    return (
        <div className="user-profile">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="profile-button"
                disabled={loading}
            >
                <div className="profile-info">
                    {getUserPhotoURL() ? (
                        <img
                            src={getUserPhotoURL()!}
                            alt="Profile"
                            className="profile-avatar"
                        />
                    ) : (
                        <div className="profile-avatar-placeholder">
                            {getUserDisplayName().charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="profile-name">
                        {getUserDisplayName()}
                    </span>
                </div>
                <span className="dropdown-arrow">
                    {showDropdown ? '▲' : '▼'}
                </span>
            </button>

            {showDropdown && (
                <div className="profile-dropdown">
                    <div className="dropdown-content">
                        <div className="user-info">
                            <p className="user-name">{getUserDisplayName()}</p>
                            <p className="user-email">{getUserEmail()}</p>
                        </div>
                        
                        <div className="dropdown-divider"></div>
                        
                        <button
                            onClick={handleSignOut}
                            disabled={loading}
                            className="signout-button"
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner-small"></div>
                                    <span>サインアウト中...</span>
                                </>
                            ) : (
                                <>
                                    <span>🚪</span>
                                    <span>サインアウト</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};