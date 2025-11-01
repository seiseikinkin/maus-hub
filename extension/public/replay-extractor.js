// Pokemon Showdown Replay Extractor
console.log("Pokemon Showdown Replay Extractor loaded at:", new Date().toISOString());
console.log("Current URL:", window.location.href);
console.log("Document ready state:", document.readyState);

// URLパターンをチェックする関数
function isReplayUrl(url) {
    // より柔軟なパターンマッチング
    const patterns = [
        /^https:\/\/replay\.pokemonshowdown\.com\/[a-zA-Z0-9]+-[0-9]+-[a-zA-Z0-9]+/,
        /^https:\/\/replay\.pokemonshowdown\.com\/.*-.*-.*$/,
        /^https:\/\/replay\.pokemonshowdown\.com\/[^\/]+$/,
    ];

    const isMatch = patterns.some((pattern) => pattern.test(url));
    console.log("URL pattern check:", url, "->", isMatch);

    // より詳細なチェック
    if (url.includes("replay.pokemonshowdown.com")) {
        console.log("Pokemon Showdown replay domain detected");
        return true;
    }

    return isMatch;
}

// 公式APIからリプレイデータを取得する関数
async function fetchReplayDataFromAPI(url) {
    try {
        // URLからクエリパラメータを除去
        const cleanUrl = url.split("?")[0];
        console.log("Original URL:", url);
        console.log("Cleaned URL:", cleanUrl);
        console.log("Attempting to fetch data from official API for:", cleanUrl);

        // Pokemon ShowdownのJSON APIを試す
        const jsonUrl = cleanUrl + ".json";
        const response = await fetch(jsonUrl);

        if (response.ok) {
            const data = await response.json();
            console.log("Successfully fetched data from API:", data);

            // バトルログから詳細情報を抽出
            const players = data.players || [];
            const battleLog = data.log || "";
            const battleData = extractBattleDataFromLog(battleLog, players);

            return {
                url: cleanUrl,
                players: players,
                format: data.format || "Unknown Format",
                battleLog: battleLog,
                rating: data.rating,
                battleDate: data.uploadtime ? new Date(data.uploadtime * 1000).toDateString() : null,
                teams: battleData.teams, // 抽出したポケモン情報
                totalTurns: battleData.totalTurns, // 総ターン数
                battleStartTime: battleData.battleStartTime, // バトル開始時刻
                timestamp: Date.now(),
                source: "official_api",
            };
        } else {
            console.log("API request failed with status:", response.status);
        }
    } catch (error) {
        console.log("Official API failed:", error);
    }

    return null;
}

// バトルログから詳細情報を抽出する関数
function extractBattleDataFromLog(battleLog, players) {
    if (!battleLog || !Array.isArray(players) || players.length === 0) {
        return { teams: {}, totalTurns: 0, battleStartTime: null };
    }

    const teams = {};
    let totalTurns = 0;
    let battleStartTime = null;

    // プレイヤーごとにチームを初期化
    players.forEach((player) => {
        teams[player] = [];
    });

    try {
        // バトルログが文字列の場合は配列に変換
        let logLines = [];
        if (typeof battleLog === "string") {
            logLines = battleLog.split("\n");
        } else if (Array.isArray(battleLog)) {
            logLines = battleLog;
        }

        console.log("Processing battle log lines:", logLines.length);

        // バトルログを解析
        logLines.forEach((line) => {
            if (typeof line === "string") {
                // ポケモン情報の抽出: |poke|p1|Pokemon|... または |poke|p2|Pokemon|...
                if (line.startsWith("|poke|")) {
                    const parts = line.split("|");
                    if (parts.length >= 4) {
                        const playerSide = parts[2]; // p1 または p2
                        const pokemonInfo = parts[3]; // Pokemon名（例: "Gastrodon-East, L50, M"）

                        // ポケモン名を正規化
                        let pokemonName = pokemonInfo;

                        // カンマで分割されている場合は最初の部分（実際のポケモン名）を取得
                        if (pokemonName.includes(",")) {
                            pokemonName = pokemonName.split(",")[0].trim();
                        } else {
                            pokemonName = pokemonName.trim();
                        }

                        // 空文字やレベル情報などの無効な名前をスキップ
                        if (!pokemonName || pokemonName.startsWith("L") || pokemonName.match(/^[0-9]/)) {
                            console.log(`Skipping invalid Pokemon name: "${pokemonName}"`);
                            return;
                        }

                        // プレイヤーとの対応付け
                        let playerName = null;
                        if (playerSide === "p1" && players[0]) {
                            playerName = players[0];
                        } else if (playerSide === "p2" && players[1]) {
                            playerName = players[1];
                        }

                        if (playerName && pokemonName && !teams[playerName].includes(pokemonName)) {
                            teams[playerName].push(pokemonName);
                            console.log(`Found Pokemon: ${pokemonName} for player ${playerName} (${playerSide})`);
                        }
                    }
                }
                // 総ターン数の抽出: |turn|数字|
                else if (line.startsWith("|turn|")) {
                    const parts = line.split("|");
                    if (parts.length >= 3) {
                        const turnNumber = parseInt(parts[2]);
                        if (!isNaN(turnNumber) && turnNumber > totalTurns) {
                            totalTurns = turnNumber;
                        }
                    }
                }
                // バトル開始時刻の抽出: |t:|タイムスタンプ|（最初のもの）
                else if (line.startsWith("|t:|") && battleStartTime === null) {
                    const parts = line.split("|");
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

        console.log("Extracted battle data:", { teams, totalTurns, battleStartTime });
        return { teams, totalTurns, battleStartTime };
    } catch (error) {
        console.error("Error extracting Pokemon from battle log:", error);
        return {};
    }
}

// リプレイデータを抽出する関数（公式APIのみ使用）
async function extractReplayData() {
    const url = window.location.href;

    console.log("Fetching replay data using official API only");
    const apiData = await fetchReplayDataFromAPI(url);

    if (apiData) {
        console.log("Successfully retrieved data from official API");
        return apiData;
    }

    console.error("Official API failed - no fallback available");
    return null;
}

// リプレイボタンを追加する関数
function addReplayButton() {
    try {
        console.log("addReplayButton called");

        // 既にボタンが存在するかチェック
        if (document.querySelector("#add-replay-button")) {
            console.log("Button already exists");
            return;
        }

        // 固定位置にボタンを表示（DOM解析不要）
        const fixedButtonContainer = document.createElement("div");
        fixedButtonContainer.id = "replay-button-container";
        fixedButtonContainer.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            z-index: 999999;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 2px solid #fff;
        `;

        const fixedButton = document.createElement("button");
        fixedButton.id = "add-replay-button";
        fixedButton.style.cssText = `
            padding: 12px 20px;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
        `;
        fixedButton.innerHTML = "🎬 リプレイを追加";

        // ホバー効果を追加
        fixedButton.addEventListener("mouseenter", () => {
            fixedButton.style.transform = "scale(1.05)";
            fixedButton.style.boxShadow = "0 4px 15px rgba(76, 175, 80, 0.5)";
        });

        fixedButton.addEventListener("mouseleave", () => {
            fixedButton.style.transform = "scale(1)";
            fixedButton.style.boxShadow = "0 2px 10px rgba(76, 175, 80, 0.3)";
        });

        fixedButtonContainer.appendChild(fixedButton);
        document.body.appendChild(fixedButtonContainer);

        console.log("Fixed position button added successfully");

        // ボタンクリック処理を定義
        const handleButtonClick = async (buttonElement) => {
            buttonElement.disabled = true;
            buttonElement.textContent = "公式API取得中...";

            try {
                const replayData = await extractReplayData();
                if (!replayData) {
                    throw new Error("公式APIからのデータ取得に失敗しました。リプレイが公開されていない可能性があります。");
                }

                console.log("Extracted replay data:", replayData);

                // バックグラウンドスクリプトにデータを送信
                const response = await chrome.runtime.sendMessage({
                    action: "saveReplay",
                    data: replayData,
                });

                if (response && response.success) {
                    // 詳細情報を含む成功メッセージ
                    const teamInfo = Object.entries(replayData.teams || {})
                        .map(([player, pokemon]) => `${player}: ${pokemon.join(", ")}`)
                        .join("\n- ");
                    const battleInfo = [
                        `プレイヤー: ${replayData.players.join(" vs ")}`,
                        `総ターン数: ${replayData.totalTurns}ターン`,
                        replayData.battleStartTime ? `開始時刻: ${new Date(replayData.battleStartTime).toLocaleString("ja-JP")}` : "",
                        `チーム:\n- ${teamInfo}`,
                    ]
                        .filter(Boolean)
                        .join("\n- ");

                    console.log(`リプレイが正常に追加されました！（公式API使用）\n取得したデータ:\n- ${battleInfo}`);

                    buttonElement.textContent = "保存完了! (公式API)";
                    buttonElement.style.backgroundColor = "#27ae60";
                    setTimeout(() => {
                        buttonElement.disabled = false;
                        buttonElement.innerHTML = "🎬 リプレイを追加";
                        buttonElement.style.backgroundColor = "";
                    }, 4000);
                } else {
                    throw new Error(response?.error || "保存に失敗しました");
                }
            } catch (error) {
                console.error("Error saving replay:", error);
                buttonElement.textContent = "API取得失敗";
                buttonElement.style.backgroundColor = "#e74c3c";
                setTimeout(() => {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = "🎬 リプレイを追加";
                    buttonElement.style.backgroundColor = "";
                }, 3000);
            }
        };

        // 固定ボタンにクリックイベントを追加
        fixedButton.addEventListener("click", () => handleButtonClick(fixedButton));
    } catch (error) {
        console.error("Error adding replay button:", error);
    }
}

// ページ初期化
function initialize() {
    const currentUrl = window.location.href;
    console.log("Initialize called, current URL:", currentUrl);

    if (isReplayUrl(currentUrl)) {
        console.log("Replay URL detected, adding button...");

        // シンプルにボタンを追加（DOM解析による複数回試行を削除）
        const addButton = () => {
            console.log("Adding replay button...");
            addReplayButton();
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                setTimeout(addButton, 500);
            });
        } else {
            setTimeout(addButton, 500);
        }
    } else {
        console.log("Not a replay URL:", currentUrl);
    }
}

// 初期化実行
initialize();

// URLが変更された場合の処理（SPAの場合）
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        console.log("URL changed to:", lastUrl);
        setTimeout(initialize, 1000);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});
