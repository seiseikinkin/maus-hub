// Pokemon Showdown Replay Extractor - Simple Version
console.log("🎬 Pokemon Showdown Replay Extractor loaded!");

// 即座に固定ボタンを作成する関数
function createFixedReplayButton() {
    // 既存のボタンをチェック
    if (document.getElementById("replay-add-button")) {
        console.log("Button already exists");
        return;
    }

    console.log("Creating fixed replay button...");

    // 固定位置のボタンコンテナを作成
    const container = document.createElement("div");
    container.id = "replay-button-container";
    container.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        border: 2px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
    `;

    // ボタンを作成
    const button = document.createElement("button");
    button.id = "replay-add-button";
    button.innerHTML = "🎬 リプレイを追加";
    button.style.cssText = `
        padding: 12px 20px;
        background: linear-gradient(45deg, #4CAF50, #45a049);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        font-family: Arial, sans-serif;
    `;

    // ホバー効果
    button.addEventListener("mouseenter", () => {
        button.style.transform = "scale(1.05)";
        button.style.boxShadow = "0 6px 20px rgba(76, 175, 80, 0.6)";
    });

    button.addEventListener("mouseleave", () => {
        button.style.transform = "scale(1)";
        button.style.boxShadow = "0 4px 15px rgba(76, 175, 80, 0.4)";
    });

    // クリックイベント
    button.addEventListener("click", async () => {
        console.log("Replay button clicked!");

        button.disabled = true;
        button.innerHTML = "⏳ 処理中...";
        button.style.background = "#FFA500";

        try {
            // リプレイデータを抽出
            const replayData = extractSimpleReplayData();
            console.log("Extracted replay data:", replayData);

            // バックグラウンドスクリプトにデータを送信
            const response = await chrome.runtime.sendMessage({
                action: "saveReplay",
                data: replayData,
            });

            if (response && response.success) {
                button.innerHTML = "✅ 保存完了!";
                button.style.background = "linear-gradient(45deg, #27ae60, #2ecc71)";

                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = "🎬 リプレイを追加";
                    button.style.background = "linear-gradient(45deg, #4CAF50, #45a049)";
                }, 3000);
            } else {
                throw new Error(response?.error || "保存に失敗しました");
            }
        } catch (error) {
            console.error("Error saving replay:", error);
            button.innerHTML = "❌ エラー発生";
            button.style.background = "linear-gradient(45deg, #e74c3c, #c0392b)";

            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = "🎬 リプレイを追加";
                button.style.background = "linear-gradient(45deg, #4CAF50, #45a049)";
            }, 3000);
        }
    });

    container.appendChild(button);
    document.body.appendChild(container);

    console.log("✅ Fixed replay button created successfully!");
}

// 簡潔なリプレイデータ抽出関数
function extractSimpleReplayData() {
    const url = window.location.href;
    const title = document.title || "Pokemon Showdown Replay";

    // プレイヤー名を抽出（タイトルから）
    let players = [];
    const titleMatch = title.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s+\||$)/);
    if (titleMatch) {
        players = [titleMatch[1].trim(), titleMatch[2].trim()];
    }

    // フォーマットを抽出
    let format = "Unknown Format";
    const formatMatch = title.match(/\[(.+?)\]/);
    if (formatMatch) {
        format = formatMatch[1];
    }

    // 基本的なチーム情報（空のオブジェクト）
    const teams = {};
    players.forEach((player) => {
        teams[player] = []; // 実際のポケモン情報は後で拡張可能
    });

    return {
        url: url,
        title: title,
        players: players,
        rating: null,
        battleDate: new Date().toISOString(),
        format: format,
        teams: teams,
        battleLog: "", // 簡潔版ではログを省略
        timestamp: Date.now(),
    };
}

// URLチェック関数
function isReplayURL() {
    const url = window.location.href;
    return url.includes("replay.pokemonshowdown.com");
}

// 初期化関数
function init() {
    console.log("Initializing replay extractor...");
    console.log("Current URL:", window.location.href);

    if (isReplayURL()) {
        console.log("✅ Replay URL detected!");

        // 複数回試行してボタンを確実に作成
        let attempts = 0;
        const tryCreateButton = () => {
            attempts++;
            console.log(`Creating button attempt ${attempts}`);

            createFixedReplayButton();

            // ボタンが作成されていない場合、再試行
            if (!document.getElementById("replay-add-button") && attempts < 5) {
                setTimeout(tryCreateButton, 1000);
            } else if (document.getElementById("replay-add-button")) {
                console.log("🎉 Button successfully created!");
            }
        };

        // 即座に実行
        tryCreateButton();

        // ページ読み込み完了後にも実行
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", tryCreateButton);
        }

        // 少し遅延して再実行
        setTimeout(tryCreateButton, 2000);
    } else {
        console.log("❌ Not a replay URL");
    }
}

// スクリプト実行
init();

// URL変更の監視
let currentURL = window.location.href;
setInterval(() => {
    if (currentURL !== window.location.href) {
        currentURL = window.location.href;
        console.log("URL changed, reinitializing...");
        setTimeout(init, 1000);
    }
}, 1000);
