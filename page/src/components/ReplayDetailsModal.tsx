import React from 'react';
import type { ReplayData } from '../firebase/replayService';
import './ReplayDetailsModal.css';

interface ReplayDetailsModalProps {
    replay: ReplayData | null;
    isOpen: boolean;
    onClose: () => void;
}

export const ReplayDetailsModal: React.FC<ReplayDetailsModalProps> = ({ replay, isOpen, onClose }) => {
    if (!isOpen || !replay) {
        return null;
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '不明';
        try {
            return new Date(dateString).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return '不明';
        }
    };

    const formatTeams = (teams: Record<string, string[]>) => {
        return Object.entries(teams).map(([playerName, pokemon]) => (
            <div key={playerName} className="team-section">
                <h4>{playerName} のチーム</h4>
                <div className="pokemon-list">
                    {pokemon.length > 0 ? (
                        pokemon.map((pkmn, index) => (
                            <span key={index} className="pokemon-name">{pkmn}</span>
                        ))
                    ) : (
                        <span className="no-data">データなし</span>
                    )}
                </div>
            </div>
        ));
    };

    const formatSelectedPokemon = (selectedPokemon: Record<string, string[]>) => {
        return Object.entries(selectedPokemon).map(([playerName, pokemon]) => (
            <div key={playerName} className="selected-section">
                <h4>{playerName} の選出</h4>
                <div className="pokemon-list">
                    {pokemon.length > 0 ? (
                        pokemon.map((pkmn, index) => (
                            <span key={index} className="pokemon-name selected">{pkmn}</span>
                        ))
                    ) : (
                        <span className="no-data">データなし</span>
                    )}
                </div>
            </div>
        ));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('クリップボードにコピーしました');
        }).catch(err => {
            console.error('クリップボードへのコピーに失敗:', err);
            alert('クリップボードへのコピーに失敗しました');
        });
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content replay-details-modal">
                <div className="modal-header">
                    <h2>リプレイ詳細</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    {/* 基本情報 */}
                    <section className="details-section">
                        <h3>基本情報</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>URL:</label>
                                <div className="url-container">
                                    <a href={replay.url} target="_blank" rel="noopener noreferrer" className="replay-url">
                                        {replay.url}
                                    </a>
                                    <button 
                                        className="copy-button" 
                                        onClick={() => copyToClipboard(replay.url)}
                                        title="URLをコピー"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                            <div className="info-item">
                                <label>フォーマット:</label>
                                <span>{replay.format}</span>
                            </div>
                            <div className="info-item">
                                <label>プレイヤー:</label>
                                <span>{replay.players.join(' vs ')}</span>
                            </div>
                            <div className="info-item">
                                <label>レーティング:</label>
                                <span>{replay.rating || '不明'}</span>
                            </div>
                            <div className="info-item">
                                <label>総ターン数:</label>
                                <span>{replay.totalTurns || '不明'}</span>
                            </div>
                            <div className="info-item">
                                <label>バトル開始時刻:</label>
                                <span>{formatDate(replay.battleStartTime)}</span>
                            </div>
                            <div className="info-item">
                                <label>バトル日付:</label>
                                <span>{replay.battleDate || '不明'}</span>
                            </div>
                            <div className="info-item">
                                <label>登録日時:</label>
                                <span>{formatDate(new Date(replay.createdAt).toISOString())}</span>
                            </div>
                        </div>
                    </section>

                    {/* チーム構成 */}
                    {replay.teams && Object.keys(replay.teams).length > 0 && (
                        <section className="details-section">
                            <h3>チーム構成</h3>
                            <div className="teams-container">
                                {formatTeams(replay.teams)}
                            </div>
                        </section>
                    )}

                    {/* 選出ポケモン */}
                    {replay.selectedPokemon && Object.keys(replay.selectedPokemon).length > 0 && (
                        <section className="details-section">
                            <h3>選出ポケモン</h3>
                            <div className="selected-container">
                                {formatSelectedPokemon(replay.selectedPokemon)}
                            </div>
                        </section>
                    )}

                    {/* バトルログ */}
                    {replay.battleLog && (
                        <section className="details-section">
                            <h3>バトルログ</h3>
                            <div className="battlelog-container">
                                <div className="battlelog-actions">
                                    <button 
                                        className="copy-button"
                                        onClick={() => copyToClipboard(replay.battleLog)}
                                    >
                                        ログをコピー
                                    </button>
                                </div>
                                <pre className="battlelog-content">
                                    {replay.battleLog}
                                </pre>
                            </div>
                        </section>
                    )}
                </div>
                
                <div className="modal-footer">
                    <button className="close-modal-button" onClick={onClose}>
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};