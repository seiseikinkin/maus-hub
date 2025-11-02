import React, { useState, useEffect } from 'react';
import { PokePasteItem } from './PokePasteItem';
import { pokePasteService } from '../firebase/pokePasteService';
import type { PokePasteData } from '../firebase/pokePasteService';

interface PokePasteListProps {
    filterUserId?: string;
    maxItems?: number;
}

export const PokePasteList: React.FC<PokePasteListProps> = ({ 
    filterUserId, 
    maxItems = 50 
}) => {
    const [pokepastes, setPokepastes] = useState<PokePasteData[]>([]);
    const [filteredPokepastes, setFilteredPokepastes] = useState<PokePasteData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pokemonFilter, setPokemonFilter] = useState<string>('');
    const [ratingFilter, setRatingFilter] = useState<string>('all');

    const loadPokePastes = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            let data: PokePasteData[] = [];
            
            if (filterUserId) {
                data = await pokePasteService.getPokePastesByUser(filterUserId, maxItems);
            } else {
                // filterUserIdが指定されていない場合は全ユーザーのデータを取得
                data = await pokePasteService.getAllPokePastes(maxItems);
            }
            
            setPokepastes(data);
            setFilteredPokepastes(data);
        } catch (err) {
            console.error('Error loading pokepastes:', err);
            let errorMessage = 'Unknown error occurred';
            
            if (err instanceof Error) {
                errorMessage = err.message;
                
                // Firebase特有のエラーメッセージを分かりやすく表示
                if (err.message.includes('requires an index')) {
                    errorMessage = 'データベースのインデックス設定が必要です。Firebaseコンソールでインデックスを作成してください。';
                } else if (err.message.includes('permission-denied')) {
                    errorMessage = 'データへのアクセス権限がありません。ログインしているか確認してください。';
                } else if (err.message.includes('not-found')) {
                    errorMessage = 'データが見つかりませんでした。';
                }
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [filterUserId, maxItems]);

    // フィルター処理
    const applyFilters = React.useCallback(() => {
        let filtered = pokepastes;

        // ポケモン名フィルター（カンマ区切りでAND条件、部分一致）
        if (pokemonFilter.trim()) {
            const pokemonNames = pokemonFilter
                .split(',')
                .map(name => name.trim().toLowerCase())
                .filter(name => name.length > 0);
            
            if (pokemonNames.length > 0) {
                filtered = filtered.filter(pokepaste => {
                    if (!pokepaste.pokemonNames || pokepaste.pokemonNames.length === 0) {
                        return false;
                    }
                    
                    // すべてのポケモン名が含まれているかチェック（AND条件）
                    return pokemonNames.every(filterName =>
                        pokepaste.pokemonNames!.some(pokemonName =>
                            pokemonName.toLowerCase().includes(filterName)
                        )
                    );
                });
            }
        }

        // 評価フィルター（0-5の具体的な値）
        if (ratingFilter !== 'all') {
            const targetRating = parseInt(ratingFilter);
            filtered = filtered.filter(pokepaste => 
                (pokepaste.rating || 0) === targetRating
            );
        }

        setFilteredPokepastes(filtered);
    }, [pokepastes, pokemonFilter, ratingFilter]);

    // フィルターが変更されたときに実行
    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const handleDelete = async (id: string) => {
        try {
            await pokePasteService.deletePokePaste(id);
            // 削除後にリストを再読み込み
            await loadPokePastes();
        } catch (err) {
            console.error('Error deleting pokepaste:', err);
            alert('PokePasteの削除に失敗しました');
        }
    };

    const handleRatingChange = async (id: string, rating: number) => {
        try {
            await pokePasteService.updatePokePasteRating(id, rating);
            // ローカル状態を更新（リロードせずに即座に反映）
            setPokepastes(prevPokepastes => 
                prevPokepastes.map(pokepaste => 
                    pokepaste.id === id 
                        ? { ...pokepaste, rating } 
                        : pokepaste
                )
            );
        } catch (err) {
            console.error('Error updating rating:', err);
            alert('評価の更新に失敗しました');
        }
    };

    useEffect(() => {
        loadPokePastes();
    }, [loadPokePastes]);

    const handleRefresh = () => {
        loadPokePastes();
    };

    if (loading) {
        return (
            <div className="pokepaste-list-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pokepaste-list-error">
                <h3>エラーが発生しました</h3>
                <p>{error}</p>
                <button onClick={handleRefresh} className="retry-button">
                    再試行
                </button>
            </div>
        );
    }

    return (
        <div className="pokepaste-list">
            <div className="pokepaste-list-header">
                <div className="filter-section">
                    <div className="filter-row">
                        <input
                            type="text"
                            placeholder="ポケモン名で検索（カンマ区切りでAND条件）..."
                            value={pokemonFilter}
                            onChange={(e) => setPokemonFilter(e.target.value)}
                            className="pokemon-filter"
                        />
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="rating-filter"
                        >
                            <option value="all">すべての評価</option>
                            <option value="0">☆☆☆☆☆ (0星)</option>
                            <option value="1">★☆☆☆☆ (1星)</option>
                            <option value="2">★★☆☆☆ (2星)</option>
                            <option value="3">★★★☆☆ (3星)</option>
                            <option value="4">★★★★☆ (4星)</option>
                            <option value="5">★★★★★ (5星)</option>
                        </select>
                        <button 
                            onClick={() => {
                                setPokemonFilter('');
                                setRatingFilter('all');
                            }}
                            className="clear-filters-button"
                            title="フィルターをクリア"
                        >
                            クリア
                        </button>
                        <button onClick={handleRefresh} className="refresh-button">
                            🔄
                        </button>
                    </div>
                </div>
            </div>
            
            {filteredPokepastes.length === 0 ? (
                <div className="no-pokepastes">
                    {pokepastes.length === 0 ? (
                        <p>PokePaste が見つかりませんでした。</p>
                    ) : (
                        <p>フィルター条件に合う PokePaste が見つかりませんでした。</p>
                    )}
                </div>
            ) : (
                <div className="pokepaste-items">
                    {filteredPokepastes.map((pokepaste) => (
                        <PokePasteItem 
                            key={pokepaste.id} 
                            pokepaste={pokepaste}
                            onDelete={handleDelete}
                            onRatingChange={handleRatingChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};