import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// カスタムフック
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // システムの設定を確認し、初期値を決定
    const getInitialTheme = (): Theme => {
        const savedTheme = localStorage.getItem('pokepaste-hub-theme') as Theme;
        if (savedTheme) {
            return savedTheme;
        }
        
        // システムのダークモード設定を確認
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        return 'light';
    };

    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // テーマをトグル
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('pokepaste-hub-theme', newTheme);
    };

    // テーマが変更されたときにbodyのクラスを更新
    useEffect(() => {
        document.body.className = theme;
        // ルート要素にもクラスを追加
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // システムの設定変更を監視
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e: MediaQueryListEvent) => {
            // 手動で設定が保存されていない場合のみシステムに従う
            const savedTheme = localStorage.getItem('pokepaste-hub-theme');
            if (!savedTheme) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };
        
        mediaQuery.addListener(handleChange);
        
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    const value: ThemeContextType = {
        theme,
        toggleTheme,
        isDarkMode: theme === 'dark',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};