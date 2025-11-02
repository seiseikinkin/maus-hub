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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<string>('all');

    const loadPokePastes = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            let data: PokePasteData[] = [];
            
            if (filterUserId) {
                if (dateFilter === 'all') {
                    data = await pokePasteService.getPokePastesByUser(filterUserId, maxItems);
                } else {
                    const { start, end } = getDateRange(dateFilter);
                    data = await pokePasteService.getPokePastesByDateRange(filterUserId, start, end);
                }
            } else {
                // filterUserIdが指定されていない場合は全ユーザーのデータを取得
                data = await pokePasteService.getAllPokePastes(maxItems);
            }
            
            setPokepastes(data);
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
    }, [filterUserId, maxItems, dateFilter]);

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

    const getDateRange = (filter: string) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (filter) {
            case 'today':
                return {
                    start: today.getTime(),
                    end: today.getTime() + 24 * 60 * 60 * 1000 - 1
                };
            case 'week': {
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return {
                    start: weekStart.getTime(),
                    end: now.getTime()
                };
            }
            case 'month': {
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    start: monthStart.getTime(),
                    end: now.getTime()
                };
            }
            default:
                return {
                    start: 0,
                    end: now.getTime()
                };
        }
    };

    useEffect(() => {
        loadPokePastes();
    }, [loadPokePastes]);

    const handleRefresh = () => {
        loadPokePastes();
    };

    const handleDateFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setDateFilter(event.target.value);
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
                <h2>PokePaste 一覧</h2>
                <div className="controls">
                    <select 
                        value={dateFilter} 
                        onChange={handleDateFilterChange}
                        className="date-filter"
                    >
                        <option value="all">すべて</option>
                        <option value="today">今日</option>
                        <option value="week">今週</option>
                        <option value="month">今月</option>
                    </select>
                    <button onClick={handleRefresh} className="refresh-button">
                        🔄 更新
                    </button>
                </div>
            </div>
            
            <div className="pokepaste-count">
                {pokepastes.length} 件の PokePaste が見つかりました
            </div>
            
            {pokepastes.length === 0 ? (
                <div className="no-pokepastes">
                    <p>PokePaste が見つかりませんでした。</p>
                </div>
            ) : (
                <div className="pokepaste-items">
                    {pokepastes.map((pokepaste) => (
                        <PokePasteItem 
                            key={pokepaste.id} 
                            pokepaste={pokepaste}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};