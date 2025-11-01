import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { settingsService } from '../firebase/settingsService';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [playerNames, setPlayerNames] = useState<string[]>(['']);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

    const loadUserSettings = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const settings = await settingsService.getUserSettings(user.uid);
            if (settings) {
                const names = settingsService.getPlayerNames(settings);
                setPlayerNames(names.length > 0 ? names : ['']);
            } else {
                setPlayerNames(['']);
            }
        } catch (error) {
            console.error('設定の読み込みに失敗しました:', error);
            showMessage('設定の読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadUserSettings();
        }
    }, [user, loadUserSettings]);

    const handleSaveSettings = async () => {
        if (!user) {
            showMessage('ログインが必要です', 'error');
            return;
        }

        const validPlayerNames = playerNames.filter(name => name.trim().length > 0);
        if (validPlayerNames.length === 0) {
            showMessage('少なくとも1つのプレイヤー名を入力してください', 'error');
            return;
        }

        console.log('Saving settings for user:', user.uid, 'playerNames:', validPlayerNames);
        setSaving(true);
        try {
            await settingsService.saveUserSettings(user.uid, validPlayerNames);
            showMessage('設定を保存しました', 'success');
        } catch (error) {
            console.error('設定の保存に失敗しました:', error);
            const errorMessage = error instanceof Error ? error.message : '設定の保存に失敗しました';
            showMessage(errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    };

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage(text);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 3000);
    };

    const handlePlayerNameChange = (index: number, value: string) => {
        const newPlayerNames = [...playerNames];
        newPlayerNames[index] = value;
        setPlayerNames(newPlayerNames);
    };

    const addPlayerName = () => {
        setPlayerNames([...playerNames, '']);
    };

    const removePlayerName = (index: number) => {
        if (playerNames.length > 1) {
            const newPlayerNames = playerNames.filter((_, i) => i !== index);
            setPlayerNames(newPlayerNames);
        }
    };

    if (!user) {
        return (
            <div className="settings-page">
                <div className="settings-container">
                    <h2>設定</h2>
                    <p>設定を変更するにはログインが必要です。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-container">
                <h2>設定</h2>
                
                {message && (
                    <div className={`message ${messageType}`}>
                        {message}
                    </div>
                )}

                <div className="settings-section">
                    <h3>プレイヤー設定</h3>
                    <div className="setting-item">
                        <label>Pokemon Showdownプレイヤー名</label>
                        <p className="setting-description">
                            あなたのPokemon Showdownで使用しているプレイヤー名を入力してください。
                            複数のアカウントがある場合は、それぞれのプレイヤー名を追加できます。
                            リプレイ一覧で勝敗を表示するために使用されます。
                        </p>
                        
                        {playerNames.map((playerName, index) => (
                            <div key={index} className="player-name-input-group">
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                                    placeholder={`プレイヤー名 ${index + 1} (例: TrainerAlice)`}
                                    disabled={loading || saving}
                                    className="setting-input"
                                />
                                {playerNames.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removePlayerName(index)}
                                        disabled={loading || saving}
                                        className="remove-button"
                                        title="このプレイヤー名を削除"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        
                        <button
                            type="button"
                            onClick={addPlayerName}
                            disabled={loading || saving}
                            className="add-button"
                        >
                            + プレイヤー名を追加
                        </button>
                    </div>
                </div>

                <div className="settings-actions">
                    <button
                        onClick={handleSaveSettings}
                        disabled={loading || saving || playerNames.every(name => !name.trim())}
                        className="save-button"
                    >
                        {saving ? '保存中...' : '設定を保存'}
                    </button>
                </div>

                <div className="settings-info">
                    <h4>設定について</h4>
                    <ul>
                        <li>プレイヤー名は Pokemon Showdown で使用している名前と完全に一致する必要があります</li>
                        <li>大文字小文字の違いも考慮されます</li>
                        <li>複数のアカウントがある場合、すべてのプレイヤー名を登録できます</li>
                        <li>設定後、リプレイ一覧で勝敗が表示されるようになります</li>
                        <li>空のプレイヤー名は自動的に除去されます</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;