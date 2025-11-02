import React, { useState, useEffect } from "react";
import LoginComponent from "../components/LoginComponent";



const Popup: React.FC = () => {
    const [isPokePastSite, setIsPokePastSite] = useState<boolean>(false);
    const [isReplaySite, setIsReplaySite] = useState<boolean>(false);
    const [status, setStatus] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // ダークテーマの色定義
    const darkTheme = {
        background: "#1a1a1a",
        surface: "#2d2d2d",
        surfaceVariant: "#3a3a3a",
        primary: "#4fc3f7",
        primaryVariant: "#29b6f6",
        secondary: "#81c784",
        error: "#ef5350",
        warning: "#ffb74d",
        onBackground: "#ffffff",
        onSurface: "#e0e0e0",
        onSurfaceVariant: "#b0b0b0",
        border: "#4a4a4a",
        borderLight: "#3a3a3a",
        success: "#66bb6a",
        successLight: "#2e7d32",
        errorLight: "#c62828",
        warningLight: "#f57c00",
    };

    // 初期化処理
    useEffect(() => {
        // 認証状態を読み込み
        const loadAuthState = async () => {
            try {
                console.log("Loading auth state from storage...");
                const result = await chrome.storage.local.get(["currentUser", "isAuthenticated"]);
                console.log("Storage result:", result);
                console.log("currentUser exists:", !!result.currentUser);
                console.log("isAuthenticated:", result.isAuthenticated);

                if (result.currentUser && result.isAuthenticated) {
                    console.log("User authenticated:", result.currentUser);
                    setIsAuthenticated(true);
                } else {
                    console.log("User not authenticated - missing data:", {
                        hasCurrentUser: !!result.currentUser,
                        isAuthenticated: result.isAuthenticated
                    });
                    setIsAuthenticated(false);
                    setStatus("");
                }
            } catch (error) {
                console.error("Error loading auth state:", error);
                setIsAuthenticated(false);
                setStatus("❌ 認証状態の読み込みに失敗しました");
            }
        };

        // 現在のタブ情報を取得
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                return;
            }

            const activeTab = tabs[0];
            if (activeTab?.url) {
                setIsPokePastSite(activeTab.url.includes("pokepast.es"));
                setIsReplaySite(activeTab.url.includes("replay.pokemonshowdown.com"));
            }
        });

        loadAuthState();

        // ストレージの変更を監視
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            console.log("Storage changed:", changes);
            if (changes.currentUser || changes.isAuthenticated) {
                console.log("Auth-related storage changed, reloading auth state");
                loadAuthState();
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    // URL追加処理
    const handleAddClick = () => {
        setIsLoading(true);
        setStatus("");

        chrome.runtime.sendMessage({ action: "addPokePaste" }, (response: unknown) => {
            setIsLoading(false);

            if (chrome.runtime.lastError) {
                setStatus(`❌ 通信エラー: ${chrome.runtime.lastError.message}`);
                return;
            }

            if (typeof response === "object" && response !== null) {
                const responseObj = response as Record<string, unknown>;
                if ("success" in responseObj && responseObj.success === true) {
                    setStatus("✅ URLを保存しました！");
                } else if ("error" in responseObj && typeof responseObj.error === "string") {
                    setStatus(`❌ エラー: ${responseObj.error}`);
                } else {
                    setStatus("❌ 予期しない応答形式です");
                }
            } else {
                setStatus("❌ 無効な応答です");
            }
        });
    };

    // バトルログからチーム情報を抽出する関数
    const extractBattleDataFromLog = (battleLog: string, players: string[]) => {
        if (!battleLog || !Array.isArray(players) || players.length === 0) {
            return { teams: {}, selectedPokemon: {}, totalTurns: 0, battleStartTime: null };
        }

        const teams: Record<string, string[]> = {};
        const selectedPokemon: Record<string, string[]> = {};
        let totalTurns = 0;
        let battleStartTime: string | null = null;

        // プレイヤーごとにチームと選出ポケモンを初期化
        players.forEach((player) => {
            teams[player] = [];
            selectedPokemon[player] = [];
        });

        // 選出ポケモンを追跡するためのSet
        const switchedPokemon: Record<string, Set<string>> = {
            p1: new Set(),
            p2: new Set()
        };

        try {
            const logLines = battleLog.split('\n');
            console.log('Processing battle log lines:', logLines.length);

            logLines.forEach((line) => {
                if (typeof line === 'string') {
                    // ポケモン情報の抽出: |poke|p1|Pokemon|... または |poke|p2|Pokemon|...
                    if (line.startsWith('|poke|')) {
                        const parts = line.split('|');
                        if (parts.length >= 4) {
                            const playerSide = parts[2]; // p1 または p2
                            const pokemonInfo = parts[3]; // Pokemon名（例: "Gastrodon-East, L50, M"）

                            // ポケモン名を正規化
                            let pokemonName = pokemonInfo;

                            // カンマで分割されている場合は最初の部分（実際のポケモン名）を取得
                            if (pokemonName.includes(',')) {
                                pokemonName = pokemonName.split(',')[0].trim();
                            } else {
                                pokemonName = pokemonName.trim();
                            }

                            // 空文字やレベル情報などの無効な名前をスキップ
                            if (!pokemonName || pokemonName.startsWith('L') || /^[0-9]/.test(pokemonName)) {
                                console.log(`Skipping invalid Pokemon name: "${pokemonName}"`);
                                return;
                            }

                            // プレイヤーとの対応付け
                            let playerName: string | null = null;
                            if (playerSide === 'p1' && players[0]) {
                                playerName = players[0];
                            } else if (playerSide === 'p2' && players[1]) {
                                playerName = players[1];
                            }

                            if (playerName && pokemonName && !teams[playerName].includes(pokemonName)) {
                                teams[playerName].push(pokemonName);
                                console.log(`Found Pokemon: ${pokemonName} for player ${playerName} (${playerSide})`);
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
                    // 選出ポケモンの抽出: |switch|p1a: Torkoal|Torkoal, L50, M|100/100
                    else if (line.startsWith('|switch|')) {
                        const parts = line.split('|');
                        if (parts.length >= 3) {
                            const playerSlot = parts[2]; // p1a: Torkoal など
                            const pokemonInfo = parts[3]; // Torkoal, L50, M など
                            
                            if (playerSlot && pokemonInfo) {
                                // プレイヤー側を判定 (p1a, p1b -> p1, p2a, p2b -> p2)
                                const side = playerSlot.startsWith('p1') ? 'p1' : 'p2';
                                
                                // ポケモン名を抽出（カンマより前の部分）
                                const pokemonName = pokemonInfo.split(',')[0].trim();
                                
                                if (pokemonName) {
                                    switchedPokemon[side].add(pokemonName);
                                    console.log(`Found selected Pokemon: ${pokemonName} for ${side}`);
                                }
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
                }
            });

            // プレイヤー名と選出ポケモンをマッピング
            if (players.length >= 2) {
                selectedPokemon[players[0]] = Array.from(switchedPokemon.p1);
                selectedPokemon[players[1]] = Array.from(switchedPokemon.p2);
            }

            console.log('Extracted battle data:', { teams, selectedPokemon, totalTurns, battleStartTime });
            return { teams, selectedPokemon, totalTurns, battleStartTime };
        } catch (error) {
            console.error('Error extracting battle data from log:', error);
            return { teams: {}, selectedPokemon: {}, totalTurns: 0, battleStartTime: null };
        }
    };

    // 公式APIからリプレイデータを取得する関数
    const fetchReplayDataFromAPI = async (url: string) => {
        try {
            // URLからクエリパラメータを除去
            const cleanUrl = url.split('?')[0];
            console.log('Original URL:', url);
            console.log('Cleaned URL:', cleanUrl);
            
            // Pokemon ShowdownのJSON APIを試す
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
                    battleDate: data.uploadtime ? new Date(data.uploadtime * 1000).toDateString() : new Date().toDateString(),
                    teams: battleData.teams,
                    selectedPokemon: battleData.selectedPokemon,
                    totalTurns: battleData.totalTurns,
                    battleStartTime: battleData.battleStartTime
                };
            }
        } catch (error) {
            console.log('JSON API failed:', error);
        }
        
        // APIが失敗した場合はnullを返す
        return null;
    };

    // リプレイ追加処理
    const handleAddReplay = () => {
        setIsLoading(true);
        setStatus("");

        // 現在のタブからリプレイデータを抽出
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.url || !activeTab?.id) {
                setIsLoading(false);
                setStatus("❌ アクティブなタブが見つかりません");
                return;
            }

            // 認証状態を再確認
            const authCheck = await chrome.storage.local.get(["currentUser", "isAuthenticated"]);
            console.log("Auth check before saving:", authCheck);
            
            if (!authCheck.currentUser || !authCheck.isAuthenticated) {
                setIsLoading(false);
                setStatus("❌ 認証が確認できません。ログインしてください。");
                return;
            }

            // まず公式APIからデータを取得を試す
            const apiData = await fetchReplayDataFromAPI(activeTab.url);
            
            if (apiData) {
                // URLからクエリパラメータを除去
                const cleanUrl = activeTab.url.split('?')[0];
                
                // APIからデータが取得できた場合
                const replayData = {
                    url: cleanUrl,
                    players: apiData.players,
                    rating: apiData.rating,
                    battleDate: apiData.battleDate,
                    format: apiData.format,
                    teams: apiData.teams,
                    selectedPokemon: apiData.selectedPokemon,
                    battleLog: apiData.battleLog,
                    totalTurns: apiData.totalTurns,
                    battleStartTime: apiData.battleStartTime,
                    timestamp: Date.now(),
                };

                console.log("Sending replay data to background:", replayData);
                chrome.runtime.sendMessage({ 
                    action: "saveReplay", 
                    data: replayData 
                }, (response: unknown) => {
                    console.log("Background response:", response);
                    setIsLoading(false);

                    if (chrome.runtime.lastError) {
                        setStatus(`❌ 通信エラー: ${chrome.runtime.lastError.message}`);
                        return;
                    }

                    if (typeof response === "object" && response !== null) {
                        const responseObj = response as Record<string, unknown>;
                        if ("success" in responseObj && responseObj.success === true) {
                            setStatus(`✅ リプレイを保存しました！（公式API使用）\n ${apiData.players.join(' vs ')}`);
                        } else if ("error" in responseObj && typeof responseObj.error === "string") {
                            setStatus(`❌ エラー: ${responseObj.error}`);
                        } else {
                            setStatus("❌ 予期しない応答形式です");
                        }
                    } else {
                        setStatus("❌ 無効な応答です");
                    }
                });
                return;
            }

            // APIが失敗した場合はエラーを表示
            setIsLoading(false);
            setStatus("❌ 公式APIからデータを取得できませんでした。\nリプレイが公開されていない可能性があります。");
        });
    };

    // ログインハンドラー
    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    // ログアウトハンドラー
    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    return (
        <div
            style={{
                width: "380px",
                padding: "12px",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                backgroundColor: darkTheme.background,
                color: darkTheme.onBackground,
                minHeight: "180px",
            }}
        >
            {/* ヘッダー */}
            <div
                style={{
                    borderBottom: `1px solid ${darkTheme.border}`,
                    paddingBottom: "8px",
                    marginBottom: "12px",
                }}
            >
                <h2
                    style={{
                        margin: "0",
                        color: darkTheme.primary,
                        fontSize: "16px",
                        fontWeight: "600",
                    }}
                >
                    Maus Hub Extension
                </h2>
            </div>

            {/* ログインコンポーネント */}
            <LoginComponent onLogin={handleLogin} onLogout={handleLogout} darkTheme={darkTheme} />

            {/* 認証時のみ表示される機能 */}
            {isAuthenticated && (
                <div>
                    {/* メインボタン */}
                    <div style={{ marginBottom: "12px" }}>
                        {/* PokePaste セクション */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "8px",
                                padding: "6px 10px",
                                backgroundColor: isPokePastSite ? `${darkTheme.success}20` : `${darkTheme.surfaceVariant}20`,
                                borderRadius: "5px",
                                border: `1px solid ${isPokePastSite ? darkTheme.success : darkTheme.borderLight}40`,
                            }}
                        >
                            <span
                                style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    backgroundColor: isPokePastSite ? darkTheme.success : darkTheme.onSurfaceVariant,
                                    marginRight: "8px",
                                    boxShadow: `0 0 6px ${isPokePastSite ? darkTheme.success : darkTheme.onSurfaceVariant}60`,
                                }}
                            ></span>
                            <span
                                style={{
                                    fontSize: "13px",
                                    color: isPokePastSite ? darkTheme.success : darkTheme.onSurfaceVariant,
                                    fontWeight: "500",
                                }}
                            >
                                {isPokePastSite ? "📝 PokePaste site detected" : "📝 PokePaste (pokepast.es)"}
                            </span>
                        </div>

                        <button
                            onClick={handleAddClick}
                            disabled={!isPokePastSite || isLoading}
                            style={{
                                width: "100%",
                                padding: "10px 20px",
                                backgroundColor: isPokePastSite && !isLoading ? darkTheme.success : darkTheme.surfaceVariant,
                                color: isPokePastSite && !isLoading ? "#ffffff" : darkTheme.onSurfaceVariant,
                                border: `1px solid ${isPokePastSite && !isLoading ? darkTheme.success : darkTheme.border}`,
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: isPokePastSite && !isLoading ? "pointer" : "not-allowed",
                                transition: "all 0.2s ease",
                                boxShadow: isPokePastSite && !isLoading ? `0 3px 8px ${darkTheme.success}40` : "none",
                                marginBottom: "12px",
                            }}
                        >
                            {isLoading ? "処理中..." : isPokePastSite ? "PokePasteを追加" : "無効"}
                        </button>

                        {/* Pokemon Showdown Replay セクション */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "8px",
                                padding: "6px 10px",
                                backgroundColor: isReplaySite ? `${darkTheme.primary}20` : `${darkTheme.surfaceVariant}20`,
                                borderRadius: "5px",
                                border: `1px solid ${isReplaySite ? darkTheme.primary : darkTheme.borderLight}40`,
                            }}
                        >
                            <span
                                style={{
                                    width: "10px",
                                    height: "10px",
                                    borderRadius: "50%",
                                    backgroundColor: isReplaySite ? darkTheme.primary : darkTheme.onSurfaceVariant,
                                    marginRight: "8px",
                                    boxShadow: `0 0 6px ${isReplaySite ? darkTheme.primary : darkTheme.onSurfaceVariant}60`,
                                }}
                            ></span>
                            <span
                                style={{
                                    fontSize: "13px",
                                    color: isReplaySite ? darkTheme.primary : darkTheme.onSurfaceVariant,
                                    fontWeight: "500",
                                }}
                            >
                                {isReplaySite ? "🎬 Replay site detected" : "🎬 Pokemon Showdown Replay"}
                            </span>
                        </div>

                        <button
                            onClick={handleAddReplay}
                            disabled={!isReplaySite || isLoading}
                            style={{
                                width: "100%",
                                padding: "10px 20px",
                                backgroundColor: isReplaySite && !isLoading ? darkTheme.primary : darkTheme.surfaceVariant,
                                color: isReplaySite && !isLoading ? "#ffffff" : darkTheme.onSurfaceVariant,
                                border: `1px solid ${isReplaySite && !isLoading ? darkTheme.primary : darkTheme.border}`,
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: isReplaySite && !isLoading ? "pointer" : "not-allowed",
                                transition: "all 0.2s ease",
                                boxShadow: isReplaySite && !isLoading ? `0 3px 8px ${darkTheme.primary}40` : "none",
                            }}
                        >
                            {isLoading ? "処理中..." : isReplaySite ? "リプレイを追加" : "無効"}
                        </button>

                    </div>

                    {/* ステータス表示 */}
                    {status && (
                        <div
                            style={{
                                marginTop: "12px",
                                padding: "10px",
                                backgroundColor: status.includes("✅") ? `${darkTheme.success}20` : `${darkTheme.error}20`,
                                border: `1px solid ${status.includes("✅") ? darkTheme.success : darkTheme.error}40`,
                                borderRadius: "6px",
                                fontSize: "12px",
                                color: status.includes("完了") || status.includes("保存") ? darkTheme.success : darkTheme.error,
                                whiteSpace: "pre-line",
                                fontWeight: "500",
                            }}
                        >
                            {status}
                        </div>
                    )}


                </div>
            )}
        </div>
    );
};

export default Popup;
