import React from 'react';
import type { ReplayData } from '../firebase/replayService';

interface ReplayItemProps {
    replay: ReplayData;
    onDelete?: (id: string) => void;
    userPlayerName?: string;
    userPlayerNames?: string[];
}

export const ReplayItem: React.FC<ReplayItemProps> = ({ replay, onDelete, userPlayerName, userPlayerNames }) => {
    const handleOpenUrl = () => {
        window.open(replay.url, '_blank');
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete && window.confirm('このリプレイを削除しますか？')) {
            onDelete(replay.id);
        }
    };

    // 勝敗判定を行う関数（複数プレーヤー名対応）
    const getWinLossStatus = () => {
        if (!replay.battleLog) {
            return null;
        }

        // 利用可能なプレーヤー名を取得（新しい配列形式を優先、フォールバックで単一名）
        const availablePlayerNames = userPlayerNames && userPlayerNames.length > 0 
            ? userPlayerNames 
            : (userPlayerName ? [userPlayerName] : []);

        if (availablePlayerNames.length === 0) {
            return null;
        }

        // 登録されたプレーヤー名のいずれかがリプレイに含まれているかチェック
        const matchingPlayer = availablePlayerNames.find(playerName => 
            replay.players.includes(playerName)
        );
        
        if (!matchingPlayer) {
            return null; // 登録されたプレーヤーが見つからない
        }

        // バトルログから勝敗を判定
        const logLines = replay.battleLog.split('\n');
        for (const line of logLines) {
            if (line.startsWith('|win|')) {
                const winner = line.split('|')[2];
                if (availablePlayerNames.includes(winner)) {
                    return 'win';
                } else if (replay.players.includes(winner)) {
                    return 'loss';
                }
            }
        }

        return null; // 勝敗が判定できない
    };

    const winLossStatus = getWinLossStatus();

    const getWinLossDisplay = () => {
        switch (winLossStatus) {
            case 'win':
                return <span className="win-status-legacy">Win</span>;
            case 'loss':
                return <span className="loss-status">Loss</span>;
            default:
                return null;
        }
    };

    // ポケモン名から画像URLを生成
    const getPokemonImageUrl = (pokemonName: string): string => {
        let imageName = pokemonName.toLowerCase().replace(/\s+/g, '-');
        
        // 末尾の「-*」を除去（例：urshifu-* → urshifu）
        imageName = imageName.replace(/-\*$/, '');
        
        return `https://seiseikinkin.github.io/tools/image/minisprites/${imageName}.png`;
    };

    // 画像エラー時のフォールバック処理
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        const parent = target.parentElement;
        if (parent) {
            target.style.display = 'none';
            const textElement = parent.querySelector('.pokemon-name-text') as HTMLElement;
            if (textElement) {
                textElement.style.display = 'inline-block';
            }
        }
    };

    // プレイヤーの順序を調整する関数（設定されたプレイヤー名を左側に）
    const getOrderedPlayers = () => {
        // 利用可能なプレーヤー名を取得
        const availablePlayerNames = userPlayerNames && userPlayerNames.length > 0 
            ? userPlayerNames 
            : (userPlayerName ? [userPlayerName] : []);

        if (availablePlayerNames.length === 0) {
            return replay.players;
        }

        // 登録されたプレーヤー名でリプレイに含まれているものを見つける
        const matchingPlayer = availablePlayerNames.find(playerName => 
            replay.players.includes(playerName)
        );
        
        if (!matchingPlayer) {
            // 設定されたプレイヤー名がリプレイに含まれていない場合はそのまま
            return replay.players;
        }
        
        // 設定されたプレイヤーを最初に、その他のプレイヤーを後に配置
        const otherPlayers = replay.players.filter(player => player !== matchingPlayer);
        return [matchingPlayer, ...otherPlayers];
    };

    return (
        <div className="replay-item-single-line" onClick={handleOpenUrl}>
            <div className="main-info">
                <div className="left-info">
                    {getWinLossDisplay()}
                    <span className="replay-players">
                        {getOrderedPlayers().join(' vs. ')}
                    </span>
                    <span className="replay-format">{replay.format}</span>
                    {replay.totalTurns && (
                        <span className="replay-turns">Turns: {replay.totalTurns}</span>
                    )}
                    {replay.battleStartTime && (
                        <span className="replay-battle-date">
                            {new Date(replay.battleStartTime).toLocaleString('ja-JP')}
                        </span>
                    )}
                </div>
                <div className="right-info">
                    {replay.rating && (
                        <span className="replay-rating">Rating: {replay.rating}</span>
                    )}
                    {onDelete && (
                        <button 
                            className="delete-button"
                            onClick={handleDelete}
                            title="削除"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>
            
            <div className="pokemon-info">
                <div className="all-pokemon-row">
                    {/* チーム情報を順序調整して表示 */}
                    {getOrderedPlayers().map((playerName, playerIndex) => {
                        const pokemonList = replay.teams[playerName] || [];
                        return (
                            <React.Fragment key={`team-${playerName}`}>
                                <div className="pokemon-section">
                                    {pokemonList.map((pokemonName, index) => (
                                        <div key={index} className="pokemon-item-inline">
                                            <img
                                                src={getPokemonImageUrl(pokemonName)}
                                                alt={pokemonName}
                                                className="pokemon-sprite-inline"
                                                onError={handleImageError}
                                                title={`${playerName}: ${pokemonName}`}
                                            />
                                            <span className="pokemon-name-text" style={{ display: 'none' }}>
                                                🎮 {pokemonName}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {playerIndex === 0 && getOrderedPlayers().length > 1 && (
                                    <div className="vs-divider-inline">VS</div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    
                    {/* チームと選出の区切り */}
                    <div className="team-selected-divider"></div>
                    
                    {/* 選出情報を順序調整して表示 */}
                    {getOrderedPlayers().map((playerName, playerIndex) => {
                        const pokemonList = replay.selectedPokemon?.[playerName] || [];
                        return (
                            <React.Fragment key={`selected-${playerName}`}>
                                <div className="pokemon-section-selected">
                                    {pokemonList.slice(0, 4).map((pokemonName, index) => (
                                        <div key={index} className="pokemon-item-inline">
                                            <img
                                                src={getPokemonImageUrl(pokemonName)}
                                                alt={pokemonName}
                                                className="pokemon-sprite-inline selected-pokemon"
                                                onError={handleImageError}
                                                title={`${playerName} (選出): ${pokemonName}`}
                                            />
                                            <span className="pokemon-name-text" style={{ display: 'none' }}>
                                                ⭐ {pokemonName}
                                            </span>
                                        </div>
                                    ))}
                                    {/* 空のスロットを埋める（選出は最大4匹） */}
                                    {Array.from({ length: Math.max(0, 4 - pokemonList.length) }, (_, i) => (
                                        <div key={`empty-${playerName}-${i}`} className="pokemon-placeholder"></div>
                                    ))}
                                </div>
                                {playerIndex === 0 && getOrderedPlayers().length > 1 && (
                                    <div className="vs-divider-inline">VS</div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};