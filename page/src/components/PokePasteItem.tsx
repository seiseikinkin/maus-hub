import React from 'react';
import type { PokePasteData } from '../firebase/pokePasteService';
import { StarRating } from './StarRating';

interface PokePasteItemProps {
    pokepaste: PokePasteData;
    onDelete?: (id: string) => void;
    onRatingChange?: (id: string, rating: number) => void;
}

export const PokePasteItem: React.FC<PokePasteItemProps> = ({ pokepaste, onDelete, onRatingChange }) => {
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleOpenUrl = () => {
        window.open(pokepaste.url, '_blank');
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete && window.confirm('削除しますか？')) {
            onDelete(pokepaste.id);
        }
    };

    const handleRatingChange = (rating: number) => {
        if (onRatingChange) {
            onRatingChange(pokepaste.id, rating);
        }
    };

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(pokepaste.url);
            // 一時的にボタンテキストを変更してコピー完了を示す
            const button = e.target as HTMLButtonElement;
            const originalText = button.textContent;
            button.textContent = '✅';
            setTimeout(() => {
                button.textContent = originalText;
            }, 1000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            // フォールバック: 古いブラウザ用
            const textArea = document.createElement('textarea');
            textArea.value = pokepaste.url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const button = e.target as HTMLButtonElement;
                const originalText = button.textContent;
                button.textContent = '✅';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 1000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                alert('リンクのコピーに失敗しました');
            }
            document.body.removeChild(textArea);
        }
    };

    // ポケモン名から画像URLを生成
    const getPokemonImageUrl = (pokemonName: string): string => {
        // 全て小文字に変換し、スペースをハイフンに置換
        const imageName = pokemonName.toLowerCase().replace(/\s+/g, '-');
        return `https://seiseikinkin.github.io/tools/image/minisprites/${imageName}.png`;
    };

    // 画像エラー時のフォールバック処理
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.target as HTMLImageElement;
        const parent = target.parentElement;
        if (parent) {
            // 画像を非表示にしてフォールバックテキストを表示
            target.style.display = 'none';
            const textElement = parent.querySelector('.pokemon-name-text') as HTMLElement;
            if (textElement) {
                textElement.style.display = 'inline-block';
            }
        }
    };

    return (
        <div className="pokepaste-item-single-line" onClick={handleOpenUrl}>
            <div className="pokepaste-title-section">
                <span className="pokepaste-title">
                    {pokepaste.title || 'Untitled PokePaste'}
                </span>
            </div>
            
            <div className="pokepaste-author-section">
                <span className="pokepaste-author">
                    {pokepaste.author ? `by ${pokepaste.author}` : '作者不明'}
                </span>
            </div>
            
            <div className="pokepaste-pokemon-section">
                {pokepaste.pokemonNames && pokepaste.pokemonNames.length > 0 ? (
                    <div className="pokepaste-pokemon-row">
                        {pokepaste.pokemonNames.map((name, index) => (
                            <div key={index} className="pokemon-item-inline">
                                <img
                                    src={getPokemonImageUrl(name)}
                                    alt={name}
                                    className="pokemon-sprite-inline"
                                    onError={handleImageError}
                                    title={name}
                                />
                                <span className="pokemon-name-text" style={{ display: 'none' }}>
                                    🎮 {name}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="no-pokemon">ポケモンなし</span>
                )}
            </div>
            
            <div className="pokepaste-rating-section" onClick={(e) => e.stopPropagation()}>
                <StarRating 
                    rating={pokepaste.rating || 0}
                    onRatingChange={handleRatingChange}
                    size="small"
                />
            </div>
            
            <div className="pokepaste-date-section">
                <span className="pokepaste-date">
                    {formatDate(pokepaste.timestamp)}
                </span>
            </div>
            
            <div className="pokepaste-actions-section">
                <button 
                    className="copy-link-button"
                    onClick={handleCopyLink}
                    title="リンクをコピー"
                >
                    🔗
                </button>
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
    );
};