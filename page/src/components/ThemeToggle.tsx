import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
    const { toggleTheme, isDarkMode } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-button"
            title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
            <span className="theme-icon">
                {isDarkMode ? '☀️' : '🌙'}
            </span>
            <span className="theme-text">
                {isDarkMode ? 'ライト' : 'ダーク'}
            </span>
        </button>
    );
};