import React, { useState, useEffect, useCallback } from 'react';
import { ReplayItem } from './ReplayItem';
import { ReplayDetailsModal } from './ReplayDetailsModal';
import { replayService, type ReplayData } from '../firebase/replayService';
import { settingsService } from '../firebase/settingsService';
import { useAuth } from '../contexts/AuthContext';

export const ReplayList: React.FC = () => {
    const [replays, setReplays] = useState<ReplayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [addingReplay, setAddingReplay] = useState(false);
    const [userPlayerName, setUserPlayerName] = useState<string>('');
    const [userPlayerNames, setUserPlayerNames] = useState<string[]>([]);
    const [selectedReplay, setSelectedReplay] = useState<ReplayData | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedReplays, setSelectedReplays] = useState<Set<string>>(new Set());
    const [deletingReplays, setDeletingReplays] = useState(false);
    
    // フィルター関連の状態
    const [myPokemonFilter, setMyPokemonFilter] = useState<string>('');
    const [opponentPokemonFilter, setOpponentPokemonFilter] = useState<string>('');
    const [onlySelectedPokemon, setOnlySelectedPokemon] = useState(false);
    
    // ページング関連の状態
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 150;
    
    const { user } = useAuth();

    const loadUserSettings = useCallback(async () => {
        if (!user) return;

        try {
            const settings = await settingsService.getUserSettings(user.uid);
            if (settings) {
                const playerNames = settingsService.getPlayerNames(settings);
                setUserPlayerNames(playerNames);
                // 後方互換性のため最初の名前も設定
                setUserPlayerName(playerNames[0] || '');
            }
        } catch (error) {
            console.error('Failed to load user settings:', error);
        }
    }, [user]);

    const loadReplays = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            // 十分に大きな制限値を設定（クライアント側でページングするため）
            const fetchedReplays = await replayService.getReplaysByUser(user.uid, 10000);
            setReplays(fetchedReplays);
        } catch (err) {
            console.error('Error loading replays:', err);
            setError(err instanceof Error ? err.message : 'Failed to load replays');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadReplays();
        loadUserSettings();
    }, [loadReplays, loadUserSettings]);

    // フィルターが変更された時はページを1に戻す
    useEffect(() => {
        setCurrentPage(1);
    }, [myPokemonFilter, opponentPokemonFilter, onlySelectedPokemon]);

    const handleRefresh = () => {
        loadReplays();
    };

    const handleDelete = async (id: string) => {
        try {
            await replayService.deleteReplay(id);
            // 削除後にリストを再読み込み
            await loadReplays();
        } catch (err) {
            console.error('Error deleting replay:', err);
            alert('リプレイの削除に失敗しました');
        }
    };

    const handleShowDetails = (replay: ReplayData) => {
        setSelectedReplay(replay);
        setShowDetailsModal(true);
    };

    const handleCloseDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedReplay(null);
    };

    // 選択削除機能のハンドラー
    const handleToggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedReplays(new Set()); // 選択をクリア
    };

    const handleSelectReplay = (replayId: string, isSelected: boolean) => {
        const newSelected = new Set(selectedReplays);
        if (isSelected) {
            newSelected.add(replayId);
        } else {
            newSelected.delete(replayId);
        }
        setSelectedReplays(newSelected);
    };

    const handleSelectAll = () => {
        const currentPageIds = new Set(currentPageReplays.map(replay => replay.id));
        
        // 現在のページのリプレイが全て選択されているかチェック
        const allCurrentPageSelected = currentPageReplays.every(replay => selectedReplays.has(replay.id));
        
        if (allCurrentPageSelected) {
            // 現在のページのリプレイが全て選択されている場合は、それらを解除
            const newSelected = new Set(selectedReplays);
            currentPageIds.forEach(id => newSelected.delete(id));
            setSelectedReplays(newSelected);
        } else {
            // 現在のページのリプレイを全て選択
            const newSelected = new Set(selectedReplays);
            currentPageIds.forEach(id => newSelected.add(id));
            setSelectedReplays(newSelected);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedReplays.size === 0) {
            alert('削除するリプレイを選択してください。');
            return;
        }

        const confirmMessage = `選択した${selectedReplays.size}件のリプレイを削除しますか？`;
        if (!confirm(confirmMessage)) {
            return;
        }

        setDeletingReplays(true);
        try {
            // 選択されたリプレイを順次削除
            const deletePromises = Array.from(selectedReplays).map(id => 
                replayService.deleteReplay(id)
            );
            
            await Promise.all(deletePromises);
            
            // 選択をクリアして選択モードを終了
            setSelectedReplays(new Set());
            setIsSelectionMode(false);
            
            // リストを再読み込み
            await loadReplays();
            
            alert(`${selectedReplays.size}件のリプレイを削除しました。`);
        } catch (err) {
            console.error('Error deleting selected replays:', err);
            alert('リプレイの削除中にエラーが発生しました。');
        } finally {
            setDeletingReplays(false);
        }
    };

    const validatePokemonShowdownUrl = (url: string): boolean => {
        // https://replay.pokemonshowdown.com/[半角英数1文字以上]-[半角数字1文字以上]-[半角英数1文字以上] (クエリパラメータも許可)
        const pokemonShowdownPattern = /^https:\/\/replay\.pokemonshowdown\.com\/[a-zA-Z0-9]+-[0-9]+-[a-zA-Z0-9]+(\?.*)?$/;
        return pokemonShowdownPattern.test(url);
    };

    // バトルログから詳細情報を抽出する関数
    const extractBattleDataFromLog = (battleLog: string | string[], players: string[]): {
        teams: Record<string, string[]>;
        totalTurns: number;
        battleStartTime: string | null;
        selectedPokemon: Record<string, string[]>;
    } => {
        if (!battleLog || !Array.isArray(players) || players.length === 0) {
            return { teams: {}, totalTurns: 0, battleStartTime: null, selectedPokemon: {} };
        }

        const teams: Record<string, string[]> = {};
        const selectedPokemon: Record<string, string[]> = {};
        let totalTurns = 0;
        let battleStartTime: string | null = null;
        
        // プレイヤーごとにチームと選出ポケモンを初期化
        players.forEach(player => {
            teams[player] = [];
            selectedPokemon[player] = [];
        });

        try {
            // バトルログが文字列の場合は配列に変換
            let logLines: string[] = [];
            if (typeof battleLog === 'string') {
                logLines = battleLog.split('\n');
            } else if (Array.isArray(battleLog)) {
                logLines = battleLog;
            }

            console.log("Processing battle log lines:", logLines.length);

            // バトルログを解析
            logLines.forEach(line => {
                if (typeof line === 'string') {
                    // ポケモン情報の抽出: |poke|p1|Pokemon|... または |poke|p2|Pokemon|...
                    if (line.startsWith('|poke|')) {
                        const parts = line.split('|');
                        console.log(`DEBUG: Processing poke line: "${line}"`);
                        console.log(`DEBUG: Split parts:`, parts);
                        
                        if (parts.length >= 4) {
                            const playerSide = parts[2]; // p1 または p2
                            const pokemonInfo = parts[3]; // Pokemon名（例: "Gastrodon-East, L50, M"）
                            
                            console.log(`DEBUG: Player side: "${playerSide}", Pokemon info: "${pokemonInfo}"`);
                            
                            // ポケモン名を正規化
                            let pokemonName = pokemonInfo;
                            
                            // カンマで分割されている場合は最初の部分（実際のポケモン名）を取得
                            if (pokemonName.includes(',')) {
                                pokemonName = pokemonName.split(',')[0].trim();
                            } else {
                                pokemonName = pokemonName.trim();
                            }
                            
                            console.log(`DEBUG: Normalized Pokemon name: "${pokemonName}"`);
                            
                            // 空文字やレベル情報などの無効な名前をスキップ
                            // L + 数字（例：L50）やその他の無効なパターンをスキップ
                            if (!pokemonName || /^L\d+/.test(pokemonName) || /^[0-9]/.test(pokemonName)) {
                                console.log(`DEBUG: Skipping invalid Pokemon name: "${pokemonName}"`);
                                return;
                            }
                            
                            // プレイヤーとの対応付け
                            let playerName: string | null = null;
                            if (playerSide === 'p1' && players[0]) {
                                playerName = players[0];
                            } else if (playerSide === 'p2' && players[1]) {
                                playerName = players[1];
                            }
                            
                            console.log(`DEBUG: Mapped to player: "${playerName}"`);
                            
                            if (playerName && pokemonName && !teams[playerName].includes(pokemonName)) {
                                teams[playerName].push(pokemonName);
                                console.log(`DEBUG: Added Pokemon: ${pokemonName} for player ${playerName} (${playerSide})`);
                            } else {
                                console.log(`DEBUG: Skipped adding - playerName: ${playerName}, pokemonName: ${pokemonName}, already exists: ${playerName && teams[playerName] && teams[playerName].includes(pokemonName)}`);
                            }
                        }
                    }
                    // 総ターン数の抽出: |turn|数字|
                    else if (line.startsWith('|turn|')) {
                        const parts = line.split('|');
                        if (parts.length >= 3) {
                            const turnNumber = parseInt(parts[2]);
                            if (!isNaN(turnNumber) && turnNumber > totalTurns) {
                                totalTurns = turnNumber;
                            }
                        }
                    }
                    // バトル開始時刻の抽出: |t:|タイムスタンプ|（最初のもの）
                    else if (line.startsWith('|t:|') && battleStartTime === null) {
                        const parts = line.split('|');
                        if (parts.length >= 3) {
                            const timestamp = parseInt(parts[2]);
                            if (!isNaN(timestamp)) {
                                battleStartTime = new Date(timestamp * 1000).toISOString();
                                console.log(`Found battle start time: ${battleStartTime} (timestamp: ${timestamp})`);
                            }
                        }
                    }
                    // 選出ポケモンの抽出: |switch|p1a: Pokemon|...
                    else if (line.startsWith('|switch|')) {
                        const parts = line.split('|');
                        if (parts.length >= 3) {
                            const switchInfo = parts[2]; // 例: "p1a: Gastrodon"
                            const colonIndex = switchInfo.indexOf(':');
                            if (colonIndex !== -1) {
                                const playerSide = switchInfo.substring(0, colonIndex).charAt(1); // "1" または "2"
                                const pokemonName = switchInfo.substring(colonIndex + 1).trim();
                                
                                // プレイヤーとの対応付け
                                let playerName: string | null = null;
                                if (playerSide === '1' && players[0]) {
                                    playerName = players[0];
                                } else if (playerSide === '2' && players[1]) {
                                    playerName = players[1];
                                }
                                
                                if (playerName && pokemonName && !selectedPokemon[playerName].includes(pokemonName)) {
                                    selectedPokemon[playerName].push(pokemonName);
                                    console.log(`Found selected Pokemon: ${pokemonName} for player ${playerName}`);
                                }
                            }
                        }
                    }
                }
            });

            console.log("Extracted battle data:", { teams, totalTurns, battleStartTime, selectedPokemon });
            return { teams, totalTurns, battleStartTime, selectedPokemon };
            
        } catch (error) {
            console.error("Error extracting battle data from log:", error);
            return { teams: {}, totalTurns: 0, battleStartTime: null, selectedPokemon: {} };
        }
    };

    const fetchReplayData = async (url: string) => {
        try {
            // URLからクエリパラメータを除去
            const cleanUrl = url.split('?')[0];
            console.log('Original URL:', url);
            console.log('Cleaned URL:', cleanUrl);
            console.log('Fetching replay data from official API:', cleanUrl);
            
            // Pokemon ShowdownのJSON APIのみを使用
            const jsonUrl = cleanUrl + '.json';
            const response = await fetch(jsonUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Successfully fetched data from official API:', data);
                
                // バトルログから詳細情報を抽出
                const players = data.players || [];
                const battleLog = data.log || '';
                const battleData = extractBattleDataFromLog(battleLog, players);
                
                return {
                    players: players,
                    format: data.format || 'Unknown Format',
                    battleLog: battleLog,
                    rating: data.rating,
                    battleDate: data.uploadtime ? new Date(data.uploadtime * 1000).toDateString() : undefined,
                    teams: battleData.teams,
                    totalTurns: battleData.totalTurns,
                    battleStartTime: battleData.battleStartTime,
                    selectedPokemon: battleData.selectedPokemon
                } as {
                    players: string[];
                    format: string;
                    battleLog: string;
                    rating?: number;
                    battleDate?: string;
                    teams: Record<string, string[]>;
                    totalTurns: number;
                    battleStartTime: string | null;
                    selectedPokemon: Record<string, string[]>;
                };
            } else {
                console.error('Official API request failed with status:', response.status);
                throw new Error(`API request failed with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to fetch replay data from official API:', error);
            throw new Error('公式APIからデータを取得できませんでした。リプレイが公開されていない可能性があります。');
        }
    };

    const handleAddReplay = async () => {
        console.log('handleAddReplay called with:', { user: !!user, urlInput: urlInput.trim() });
        
        if (!user || !urlInput.trim()) {
            console.log('Early return: missing user or URL');
            return;
        }

        // 複数URLを改行で分割
        const urls = urlInput.trim().split('\n').map(url => url.trim()).filter(url => url.length > 0);
        console.log('Processing URLs:', urls);

        // 各URLをバリデーション
        const invalidUrls = urls.filter(url => !validatePokemonShowdownUrl(url));
        if (invalidUrls.length > 0) {
            console.log('URL validation failed for:', invalidUrls);
            alert(`正しくないURLが含まれています:\n${invalidUrls.join('\n')}\n\n例: https://replay.pokemonshowdown.com/gen9vgc2025reghbo3-2427506615-n4kqs9syj5g5f6q9ode6oy0xmxj19c2pw`);
            return;
        }

        console.log(`Starting replay addition process for ${urls.length} URLs...`);
        setAddingReplay(true);
        
        let successCount = 0;
        const failedUrls: { url: string; error: string }[] = [];
        
        try {
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                console.log(`Processing URL ${i + 1}/${urls.length}: ${url}`);
                
                try {
                    // URLからクエリパラメータを除去してstoreに保存
                    const cleanUrl = url.split('?')[0];
                    
                    // URLからリプレイのデータを取得（公式APIのみ使用）
                    console.log('Calling fetchReplayData with URL:', url);
                    const fetchedData = await fetchReplayData(url);
                    console.log('fetchReplayData returned:', fetchedData);
                    
                    const replayData: Omit<ReplayData, 'id' | 'userId'> = {
                        url: cleanUrl,
                        players: fetchedData.players,
                        format: fetchedData.format,
                        teams: fetchedData.teams || {},
                        battleLog: fetchedData.battleLog,
                        timestamp: Date.now(),
                        createdAt: Date.now(),
                        rating: fetchedData.rating,
                        battleDate: fetchedData.battleDate,
                        totalTurns: fetchedData.totalTurns || 0,
                        battleStartTime: fetchedData.battleStartTime || undefined,
                        selectedPokemon: fetchedData.selectedPokemon || {}
                    };

                    console.log('About to call replayService.addReplay with:', replayData);
                    await replayService.addReplay(replayData, user.uid);
                    console.log(`Successfully added replay ${i + 1}/${urls.length}`);
                    successCount++;
                    
                    // 少し待機して API レート制限を回避
                    if (i < urls.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (error) {
                    console.error(`Failed to add replay ${i + 1}: ${url}`, error);
                    failedUrls.push({ url, error: error instanceof Error ? error.message : 'Unknown error' });
                }
            }

            // 結果を表示
            setUrlInput('');
            setShowAddForm(false);
            await loadReplays();
            console.log('Replays reloaded');
            
            let message = `${successCount}件のリプレイが正常に追加されました！`;
            if (failedUrls.length > 0) {
                message += `\n\n失敗したURL (${failedUrls.length}件):\n${failedUrls.map(f => `- ${f.url}: ${f.error}`).join('\n')}`;
            }
            alert(message);
        } catch (err) {
            console.error('リプレイの追加に失敗しました:', err);
            console.error('Error details:', {
                message: err instanceof Error ? err.message : 'Unknown error',
                stack: err instanceof Error ? err.stack : 'No stack trace',
                error: err
            });
            const errorMessage = err instanceof Error ? err.message : 'リプレイの追加に失敗しました。';
            alert(`エラー詳細: ${errorMessage}`);
        } finally {
            setAddingReplay(false);
        }
    };

    if (loading) {
        return (
            <div className="replay-list-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="replay-list-error">
                <div className="error-content">
                    <h3>エラーが発生しました</h3>
                    <p>{error}</p>
                    <button onClick={handleRefresh} className="refresh-button">
                        再試行
                    </button>
                </div>
            </div>
        );
    }

    // ポケモンフィルタリング関数
    const filterReplaysByPokemon = (replays: ReplayData[]) => {
        return replays.filter(replay => {
            // 自分のプレイヤー名を特定
            const myPlayer = userPlayerNames.find(playerName => 
                replay.players.includes(playerName)
            );
            
            if (!myPlayer) return true; // プレイヤー名が見つからない場合はフィルターしない

            // 相手のプレイヤー名を特定
            const opponentPlayer = replay.players.find(player => player !== myPlayer);
            
            // 自分のポケモンフィルター
            if (myPokemonFilter.trim()) {
                const myPokemonList = myPokemonFilter.split(',').map(name => name.trim().toLowerCase()).filter(name => name);
                const myTeam = replay.teams[myPlayer] || [];
                const mySelected = replay.selectedPokemon?.[myPlayer] || [];
                
                // 検索対象を決定（選出のみチェックがONの場合は選出のみ、OFFの場合はチーム全体）
                const searchTarget = onlySelectedPokemon ? mySelected : myTeam;
                
                // AND条件：すべてのポケモンが含まれているかチェック
                const hasAllPokemon = myPokemonList.every(filterPokemon => 
                    searchTarget.some(pokemon => pokemon.toLowerCase().includes(filterPokemon))
                );
                
                if (!hasAllPokemon) return false;
            }
            
            // 相手のポケモンフィルター
            if (opponentPokemonFilter.trim() && opponentPlayer) {
                const opponentPokemonList = opponentPokemonFilter.split(',').map(name => name.trim().toLowerCase()).filter(name => name);
                const opponentTeam = replay.teams[opponentPlayer] || [];
                const opponentSelected = replay.selectedPokemon?.[opponentPlayer] || [];
                
                // 検索対象を決定（選出のみチェックがONの場合は選出のみ、OFFの場合はチーム全体）
                const searchTarget = onlySelectedPokemon ? opponentSelected : opponentTeam;
                
                // AND条件：すべてのポケモンが含まれているかチェック
                const hasAllPokemon = opponentPokemonList.every(filterPokemon => 
                    searchTarget.some(pokemon => pokemon.toLowerCase().includes(filterPokemon))
                );
                
                if (!hasAllPokemon) return false;
            }
            
            return true;
        });
    };

    // フィルター適用後のリプレイリスト
    const filteredReplays = filterReplaysByPokemon(replays);
    
    // ページング計算
    const totalPages = Math.ceil(filteredReplays.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPageReplays = filteredReplays.slice(startIndex, endIndex);
    
    // ページ変更ハンドラー
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // ページ変更時に画面上部にスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="replay-list">
            {/* 1行ヘッダー */}
            <div className="replay-list-header-single-row">
                <div className="filter-input-group">
                    <input
                        type="text"
                        value={myPokemonFilter}
                        onChange={(e) => setMyPokemonFilter(e.target.value)}
                        placeholder="自分のポケモン (すべて含む例: Pika, Char)"
                        className="pokemon-filter-input-compact"
                    />
                </div>
                <div className="filter-input-group">
                    <input
                        type="text"
                        value={opponentPokemonFilter}
                        onChange={(e) => setOpponentPokemonFilter(e.target.value)}
                        placeholder="相手のポケモン (すべて含む例: Garc, Meta)"
                        className="pokemon-filter-input-compact"
                    />
                </div>
                <div className="filter-checkbox-group">
                    <label className="checkbox-label-compact">
                        <input
                            type="checkbox"
                            checked={onlySelectedPokemon}
                            onChange={(e) => setOnlySelectedPokemon(e.target.checked)}
                        />
                        選出のみ
                    </label>
                </div>
                <div className="header-controls">
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)} 
                        className="add-replay-button-compact"
                    >
                        URLから追加
                    </button>
                    <button 
                        onClick={handleToggleSelectionMode} 
                        className={`selection-button-compact ${isSelectionMode ? 'active' : ''}`}
                    >
                        {isSelectionMode ? '選択終了' : '選択削除'}
                    </button>
                    <button onClick={handleRefresh} className="refresh-button-compact">
                        🔄
                    </button>
                </div>
            </div>

            {/* フィルター情報行 */}
            {(myPokemonFilter || opponentPokemonFilter) && (
                <div className="filter-info-row">
                    <span className="filter-count">
                        {filteredReplays.length}/{replays.length} 件のリプレイを表示中
                    </span>
                    <button 
                        onClick={() => {
                            setMyPokemonFilter('');
                            setOpponentPokemonFilter('');
                            setOnlySelectedPokemon(false);
                        }}
                        className="clear-filter-button"
                    >
                        フィルタークリア
                    </button>
                </div>
            )}

            {/* URL入力フォーム */}
            {showAddForm && (
                <div className="add-replay-form">
                    <div className="form-group">
                        <label htmlFor="replayUrl">Pokemon Showdown リプレイURL（複数の場合は改行で区切る）:</label>
                        <textarea
                            id="replayUrl"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://replay.pokemonshowdown.com/gen9ou-123456789&#10;https://replay.pokemonshowdown.com/gen9ou-987654321&#10;..."
                            className="textbox"
                            disabled={addingReplay}
                            rows={5}
                            style={{ resize: 'vertical', minHeight: '120px' }}
                        />
                        {urlInput.trim() && (
                            <div className="url-count">
                                {urlInput.trim().split('\n').filter(url => url.trim().length > 0).length}件のURLが入力されています
                            </div>
                        )}
                    </div>
                    <div className="form-actions">
                        <button 
                            onClick={handleAddReplay} 
                            disabled={!urlInput.trim() || addingReplay}
                            className="submit-button"
                        >
                            {addingReplay ? 'データ取得中...' : (() => {
                                const urlCount = urlInput.trim() ? urlInput.trim().split('\n').filter(url => url.trim().length > 0).length : 0;
                                return urlCount > 1 ? `${urlCount}件のリプレイを追加` : 'リプレイを追加';
                            })()}
                        </button>
                        <button 
                            onClick={() => {
                                setShowAddForm(false);
                                setUrlInput('');
                            }}
                            disabled={addingReplay}
                            className="cancel-button"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}

            {/* 選択モード時のコントロール */}
            {isSelectionMode && (
                <div className="batch-delete-controls">
                    <div className="batch-delete-info">
                        <strong>{selectedReplays.size}件</strong> 選択中
                    </div>
                    <button 
                        onClick={handleSelectAll}
                        className="btn btn-secondary"
                    >
                        {(() => {
                            const allCurrentPageSelected = currentPageReplays.every(replay => selectedReplays.has(replay.id));
                            return allCurrentPageSelected ? 'ページ内全て解除' : 'ページ内全て選択';
                        })()}
                    </button>
                    <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedReplays.size === 0 || deletingReplays}
                        className="btn btn-danger"
                    >
                        {deletingReplays ? '削除中...' : `選択した${selectedReplays.size}件を削除`}
                    </button>
                    <button 
                        onClick={() => setIsSelectionMode(false)}
                        className="btn btn-secondary"
                    >
                        キャンセル
                    </button>
                </div>
            )}

            {/* ページング情報 */}
            {filteredReplays.length > 0 && (
                <div className="pagination-info">
                    <span>
                        {startIndex + 1}-{Math.min(endIndex, filteredReplays.length)} 件 / {filteredReplays.length} 件中
                        {totalPages > 1 && ` (ページ ${currentPage} / ${totalPages})`}
                    </span>
                </div>
            )}

            <div className="replay-items">
                {replays.length === 0 ? (
                    <div className="no-replays">
                        <p>保存されたリプレイがありません。</p>
                        <p>Pokemon Showdownのリプレイページで「リプレイを追加」ボタンを使用してリプレイを保存してください。</p>
                    </div>
                ) : filteredReplays.length === 0 ? (
                    <div className="no-replays">
                        <p>フィルター条件に一致するリプレイが見つかりませんでした。</p>
                        <p>フィルター条件を変更してお試しください。</p>
                    </div>
                ) : (
                    currentPageReplays.map((replay) => (
                        <ReplayItem 
                            key={replay.id} 
                            replay={replay} 
                            onDelete={handleDelete}
                            onShowDetails={handleShowDetails}
                            userPlayerName={userPlayerName}
                            userPlayerNames={userPlayerNames}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedReplays.has(replay.id)}
                            onSelect={handleSelectReplay}
                        />
                    ))
                )}
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        最初
                    </button>
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        前へ
                    </button>
                    
                    {/* ページ番号ボタン */}
                    {(() => {
                        const pages = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        
                        // 表示ページ数を調整
                        if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        
                        // 最初のページから離れている場合は "..." を表示
                        if (startPage > 1) {
                            pages.push(
                                <button key={1} onClick={() => handlePageChange(1)} className="pagination-button">1</button>
                            );
                            if (startPage > 2) {
                                pages.push(<span key="start-ellipsis" className="pagination-ellipsis">...</span>);
                            }
                        }
                        
                        // ページ番号ボタンを生成
                        for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(i)}
                                    className={`pagination-button ${i === currentPage ? 'active' : ''}`}
                                >
                                    {i}
                                </button>
                            );
                        }
                        
                        // 最後のページから離れている場合は "..." を表示
                        if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                                pages.push(<span key="end-ellipsis" className="pagination-ellipsis">...</span>);
                            }
                            pages.push(
                                <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="pagination-button">
                                    {totalPages}
                                </button>
                            );
                        }
                        
                        return pages;
                    })()}
                    
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        次へ
                    </button>
                    <button 
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        最後
                    </button>
                </div>
            )}

            {/* リプレイ詳細モーダル */}
            <ReplayDetailsModal 
                replay={selectedReplay}
                isOpen={showDetailsModal}
                onClose={handleCloseDetailsModal}
            />
        </div>
    );
};