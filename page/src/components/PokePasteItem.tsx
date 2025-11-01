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

    const shortenUserId = (userId: string) => {
        return userId.length > 10 ? `${userId.substring(0, 10)}...` : userId;
    };

    return (
        <div className="pokepaste-item">
            <div className="pokepaste-header">
                <h3 className="pokepaste-title" onClick={handleOpenUrl}>
                    {pokepaste.title || 'Untitled PokePaste'}
                </h3>
                <span className="pokepaste-date">
                    {formatDate(pokepaste.timestamp)}
                </span>
            </div>
            
            <div className="pokepaste-details">
                <div className="pokepaste-url">
                    <span className="url-label">URL:</span>
                    <a 
                        href={pokepaste.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="pokepaste-link"
                    >
                        {pokepaste.url}
                    </a>
                </div>
                
                <div className="pokepaste-user">
                    <span className="user-label">User:</span>
                    <span className="user-id">{shortenUserId(pokepaste.userId)}</span>
                </div>

                {pokepaste.pokemonNames && pokepaste.pokemonNames.length > 0 && (
                    <div className="pokemon-names">
                        <span className="pokemon-label">Pokemon:</span>
                        <div className="pokemon-list">
                            {pokepaste.pokemonNames.map((name, index) => (
                                <span key={index} className="pokemon-name">
                                    🎮 {name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};