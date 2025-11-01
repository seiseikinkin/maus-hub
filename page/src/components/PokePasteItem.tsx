import React from 'react';
import type { PokePasteData } from '../firebase/pokePasteService';

interface PokePasteItemProps {
    pokepaste: PokePasteData;
}

export const PokePasteItem: React.FC<PokePasteItemProps> = ({ pokepaste }) => {
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
        <div className="pokepaste-item">
            <div className="pokepaste-header">
                <div className="pokepaste-title-section">
                    <h3 className="pokepaste-title" onClick={handleOpenUrl}>
                        {pokepaste.title || 'Untitled PokePaste'}
                    </h3>
                    {pokepaste.author && (
                        <span className="pokepaste-author">
                            by {pokepaste.author}
                        </span>
                    )}
                </div>
                <span className="pokepaste-date">
                    {formatDate(pokepaste.timestamp)}
                </span>
            </div>
            
            <div className="pokepaste-details">
                {pokepaste.pokemonNames && pokepaste.pokemonNames.length > 0 && (
                    <div className="pokemon-names">
                        <div className="pokemon-list">
                            {pokepaste.pokemonNames.map((name, index) => (
                                <div key={index} className="pokemon-item">
                                    <img
                                        src={getPokemonImageUrl(name)}
                                        alt={name}
                                        className="pokemon-sprite"
                                        onError={handleImageError}
                                        title={name}
                                    />
                                    <span className="pokemon-name-text" style={{ display: 'none' }}>
                                        🎮 {name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};