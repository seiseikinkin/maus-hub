// Pokemon Showdown リプレイ自動登録スクリプト
console.log("Maus Hub: Pokemon Showdown リプレイ自動登録スクリプトが読み込まれました");

class ReplayAutoRegister {
    constructor() {
        this.isInitialized = false;
        this.currentBattleData = null;
        this.processedBattles = new Set(); // 処理済みリプレイのトラッキング
        this.battleControlsObserver = null; // MutationObserver
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        console.log("Maus Hub: リプレイ手動登録機能を初期化中...");
        console.log("Maus Hub: 現在のURL:", location.href);
        console.log("Maus Hub: 現在のpathname:", location.pathname);

        // Chrome拡張機能の状態をチェック
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
            console.warn("Maus Hub: Chrome拡張機能が利用できません。拡張機能を確認してください。");
            setTimeout(() => {
                console.log("Maus Hub: 5秒後に再初期化を試行します...");
                this.isInitialized = false;
                this.init();
            }, 5000);
            return;
        }

        console.log("Maus Hub: Chrome拡張機能の状態OK");

        // Maus Hubに記録ボタンを設定
        this.setupMausHubButton();

        this.isInitialized = true;
        console.log("Maus Hub: リプレイ手動登録機能が初期化されました");
    }

    // 対戦URLからリプレイURLに変換
    convertBattleUrlToReplayUrl(battleUrl) {
        // 例: https://play.pokemonshowdown.com/battle-gen9randombattle-2473452732-knkar02l4affoxh28s6maga95rur78ipw
        // →   https://replay.pokemonshowdown.com/gen9randombattle-2473452732-knkar02l4affoxh28s6maga95rur78ipw

        if (!battleUrl || typeof battleUrl !== "string") {
            return null;
        }

        // battle-の部分を削除してreplay.pokemonshowdown.comに変換
        const battleMatch = battleUrl.match(/https:\/\/play\.pokemonshowdown\.com\/battle-(.+)/);
        if (battleMatch) {
            const battleId = battleMatch[1];
            return `https://replay.pokemonshowdown.com/${battleId}`;
        }

        return null;
    }

    // /savereplayコマンドを送信し、同時にFirebaseに登録（PASRS Helper方式）
    async sendSaveReplayCommand(roomId) {
        console.log("Maus Hub: Save Replayボタンをクリックしてリプレイを生成中...");

        return new Promise((resolve, reject) => {
            try {
                // Save Replayボタンを直接クリック
                const saveReplayButton = document.querySelector('button.button[name="saveReplay"]');
                if (!saveReplayButton) {
                    console.error("Maus Hub: Save Replayボタンが見つかりません");
                    reject(new Error("Save Replayボタンが見つかりません"));
                    return;
                }

                console.log("Maus Hub: Save Replayボタンをクリックします");
                saveReplayButton.click();

                // Save Replayボタンクリック後、現在のURLからリプレイURLを生成
                const battleUrl = location.href;
                const replayUrl = this.convertBattleUrlToReplayUrl(battleUrl);

                if (replayUrl) {
                    console.log("Maus Hub: タブのURLからリプレイURL生成成功:", replayUrl);
                    console.log("Maus Hub: 元の対戦URL:", battleUrl);
                    console.log("Maus Hub: URLの形式確認 - replay.pokemonshowdown.com含む:", replayUrl.includes("replay.pokemonshowdown.com"));

                    // リプレイAPIからデータを取得
                    this.fetchReplayDataFromAPI(replayUrl)
                        .then((replayData) => {
                            if (replayData) {
                                console.log("Maus Hub: リプレイAPIからデータ取得成功:", replayData);
                                // Firebase登録を実行
                                this.sendReplayToBackground(replayData);
                                resolve(true);
                            } else {
                                console.error("Maus Hub: リプレイAPIからのデータ取得に失敗しました");
                                reject(new Error("リプレイAPIからデータを取得できませんでした"));
                            }
                        })
                        .catch((error) => {
                            console.error("Maus Hub: リプレイデータ取得中にエラー:", error);
                            reject(error);
                        });
                } else {
                    console.error("Maus Hub: タブのURLからリプレイURLの生成に失敗しました");
                    console.error("Maus Hub: 対戦URL:", battleUrl);
                    reject(new Error("リプレイURLの生成に失敗しました"));
                }
            } catch (error) {
                console.error("Maus Hub: /savereplayコマンドの送信に失敗:", error);
                reject(error);
            }
        });
    }

    // リプレイ生成完了を待機
    waitForReplayGeneration() {
        return new Promise((resolve, reject) => {
            console.log("Maus Hub: リプレイ生成完了を待機中...");

            let attempts = 0;
            const maxAttempts = 30; // 15秒間待機

            const checkReplayGeneration = () => {
                attempts++;

                // 1. URLの変化をチェック（リプレイページにリダイレクトされる場合）
                if (location.pathname.includes("/replay/")) {
                    const replayId = location.pathname.replace("/replay/", "");
                    const replayUrl = `https://replay.pokemonshowdown.com/${replayId}`;
                    console.log("Maus Hub: URLリダイレクトでリプレイ生成を確認:", replayUrl);
                    resolve(replayUrl);
                    return;
                }

                // 2. バトルログで成功メッセージをチェック
                const logMessages = document.querySelectorAll(".battle-log .message");
                for (const message of logMessages) {
                    const text = message.textContent;
                    if (text.includes("replay saved") || text.includes("リプレイが保存")) {
                        // 現在の対戦URLからリプレイURLを生成
                        const battleUrl = location.href;
                        const replayUrl = this.convertBattleUrlToReplayUrl(battleUrl);
                        if (replayUrl) {
                            console.log("Maus Hub: 保存メッセージでリプレイ生成を確認:", replayUrl);
                            resolve(replayUrl);
                            return;
                        }
                    }
                }

                // 3. 一定時間後（5秒後）に対戦URLから直接リプレイURLを生成
                if (attempts >= 10) {
                    // 5秒経過後
                    const battleUrl = location.href;
                    const replayUrl = this.convertBattleUrlToReplayUrl(battleUrl);
                    if (replayUrl) {
                        console.log("Maus Hub: タイムアウト後に対戦URLからリプレイURLを生成:", replayUrl);
                        resolve(replayUrl);
                        return;
                    }
                }

                // 最大試行回数に達した場合
                if (attempts >= maxAttempts) {
                    console.error("Maus Hub: リプレイ生成の待機がタイムアウトしました");
                    reject(new Error("リプレイ生成のタイムアウトです"));
                    return;
                }

                // 500ms後に再試行
                setTimeout(checkReplayGeneration, 500);
            };

            // 最初のチェックを開始
            checkReplayGeneration();
        });
    }

    // アクティブなWebSocketを取得
    getActiveWebSocket() {
        // Pokemon Showdownのコネクションオブジェクトを探す
        if (typeof window.app !== "undefined" && window.app.connection) {
            return window.app.connection;
        }

        // グローバルなWebSocket接続を探す
        if (typeof window.websocket !== "undefined") {
            return window.websocket;
        }

        // DOM内のWebSocketを探す（最後の手段）
        try {
            // すべてのWebSocketインスタンスを探す方法は限定的
            // 通常はapp.connectionかwindow.sendを使用する
            return null;
        } catch (error) {
            return null;
        }
    }

    // Maus Hubに記録ボタンの設定
    setupMausHubButton() {
        console.log("Maus Hub: Maus Hubに記録ボタンの設定を開始");

        // 初期チェック
        this.checkAndAddMausHubButton();

        // MutationObserverで.battle-controlsの変更を監視
        this.setupBattleControlsObserver();
    }

    // .battle-controls要素の変更を監視
    setupBattleControlsObserver() {
        console.log("Maus Hub: .battle-controls要素の監視を開始");

        // MutationObserverを作成
        this.battleControlsObserver = new MutationObserver((mutations) => {
            let shouldCheck = false;

            mutations.forEach((mutation) => {
                // ノードの追加・削除をチェック
                if (mutation.type === "childList") {
                    // saveReplayボタンの追加・削除をチェック
                    const addedNodes = Array.from(mutation.addedNodes);
                    const removedNodes = Array.from(mutation.removedNodes);

                    const hasReplayButton = addedNodes.some(
                        (node) =>
                            node.nodeType === Node.ELEMENT_NODE &&
                            ((node.matches && node.matches('button[name="saveReplay"]')) ||
                                (node.querySelector && node.querySelector('button[name="saveReplay"]')))
                    );

                    const removedReplayButton = removedNodes.some(
                        (node) =>
                            node.nodeType === Node.ELEMENT_NODE &&
                            ((node.matches && node.matches('button[name="saveReplay"]')) ||
                                (node.querySelector && node.querySelector('button[name="saveReplay"]')))
                    );

                    if (hasReplayButton || removedReplayButton) {
                        shouldCheck = true;
                        console.log("Maus Hub: saveReplayボタンの変更を検出");
                    }
                }
                // 属性の変更もチェック（ログは出力しない）
                else if (mutation.type === "attributes") {
                    shouldCheck = true;
                }
            });

            if (shouldCheck) {
                // 少し遅延してチェック（DOM更新完了を待つ）
                setTimeout(() => {
                    this.checkAndAddMausHubButton();
                }, 100);
            }
        });

        // 監視対象を設定（.battle-controlsとbody全体）
        const observeTargets = [
            document.querySelector(".battle-controls"),
            document.body, // .battle-controlsが動的に作成される場合に備えて
        ].filter(Boolean);

        observeTargets.forEach((target) => {
            this.battleControlsObserver.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["class", "style", "hidden"],
            });
            console.log("Maus Hub: 監視対象を設定:", target.tagName, target.className);
        });

        console.log("Maus Hub: MutationObserverによる監視を開始しました");
    }

    // MutationObserverを停止
    stopBattleControlsObserver() {
        if (this.battleControlsObserver) {
            this.battleControlsObserver.disconnect();
            this.battleControlsObserver = null;
            console.log("Maus Hub: .battle-controls要素の監視を停止");
        }
    }

    // バトルコントロールエリアにMaus Hubボタンを追加
    checkAndAddMausHubButton() {
        // バトルページでない場合はスキップ
        if (!this.isBattlePage()) {
            return;
        }

        // saveReplayボタンが存在しない場合はスキップ
        const saveReplayButton = document.querySelector('button.button[name="saveReplay"]');
        if (!saveReplayButton) {
            return;
        }

        // 既にボタンコンテナが存在する場合はスキップ
        if (document.querySelector("#maus-hub-button-container")) {
            console.log("Maus Hub: ボタンが既に存在するためスキップ");
            return;
        }

        // saveReplayボタンの親要素を取得
        const parentElement = saveReplayButton.parentElement;
        if (!parentElement) {
            console.log("Maus Hub: saveReplayボタンの親要素が見つかりません");
            return;
        }

        console.log("Maus Hub: saveReplayボタンの親要素:", parentElement);

        console.log("Maus Hub: Maus Hubに記録ボタンを追加します");

        // ボタンを作成
        const mausHubButton = document.createElement("button");
        mausHubButton.id = "maus-hub-record-button";
        mausHubButton.className = "button";
        mausHubButton.textContent = "Save to Maus Hub";

        // ボタンのスタイルを設定
        mausHubButton.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 18px 24px;
            margin: 2px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        // ホバー効果を追加
        mausHubButton.addEventListener("mouseenter", () => {
            mausHubButton.style.transform = "translateY(-1px)";
            mausHubButton.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
        });

        mausHubButton.addEventListener("mouseleave", () => {
            mausHubButton.style.transform = "translateY(0)";
            mausHubButton.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
        });

        // クリックイベントを追加
        mausHubButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.handleMausHubButtonClick();
        });

        // pタグを作成してボタンを囲む
        const buttonContainer = document.createElement("p");
        buttonContainer.id = "maus-hub-button-container";
        buttonContainer.style.cssText = `
            margin: 4px 0;
            padding: 0;
            text-align: left;
        `;

        // ボタンをpタグの子要素として追加
        buttonContainer.appendChild(mausHubButton);

        // pタグをsaveReplayボタンの直後に挿入
        if (saveReplayButton.nextSibling) {
            parentElement.insertBefore(buttonContainer, saveReplayButton.nextSibling);
        } else {
            parentElement.appendChild(buttonContainer);
        }

        console.log("Maus Hub: Maus Hubに記録ボタンをpタグ内でsaveReplayボタンの下に追加しました");
    }

    // Maus Hubボタンクリック時の処理
    async handleMausHubButtonClick() {
        console.log("Maus Hub: Maus Hubに記録ボタンがクリックされました");

        // ボタンを一時的に無効化
        const button = document.querySelector("#maus-hub-record-button");
        if (button) {
            button.disabled = true;
            button.textContent = "認証確認中...";
            button.style.opacity = "0.6";
        }

        try {
            // 最初にユーザー認証をチェック
            console.log("Maus Hub: ユーザー認証状態をチェック中...");
            const isAuthenticated = await this.checkUserAuthentication();

            if (!isAuthenticated) {
                console.warn("Maus Hub: ユーザーが認証されていません");
                this.showNotification("ログインが必要です", "warning");
                return;
            }

            console.log("Maus Hub: ユーザー認証済み");

            const battleId = this.getBattleIdFromUrl();

            if (!battleId) {
                console.warn("Maus Hub: バトルIDが取得できません");
                this.showNotification("登録失敗", "error");
                return;
            }

            // 重複処理を防ぐ
            if (this.processedBattles.has(battleId)) {
                console.log("Maus Hub: 既に処理済みのリプレイです:", battleId);
                this.showNotification("このリプレイは既に登録済みです", "warning");
                return;
            }

            // ボタンのテキストを更新
            if (button) {
                button.textContent = "処理中...";
            }

            // 処理済みとしてマーク
            this.processedBattles.add(battleId);

            // /savereplayコマンドを実行してFirebaseに登録
            await this.sendSaveReplayCommand(battleId);

            console.log("Maus Hub: リプレイ登録が正常に完了しました");
            this.showNotification("登録完了", "success");
        } catch (error) {
            console.error("Maus Hub: Maus Hubボタン処理でエラー:", error);
            this.showNotification("登録失敗", "error");

            // エラー時は処理済みマークを削除
            this.processedBattles.delete(battleId);
        } finally {
            // ボタンを元に戻す
            if (button) {
                button.disabled = false;
                button.textContent = "Save to Maus Hub";
                button.style.opacity = "1";
            }
        }
    }

    setupPageChangeObserver() {
        // URLの変更を監視してバトルページかどうかチェック
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.onPageChange();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    onPageChange() {
        // バトルページかどうかチェック
        if (this.isBattlePage()) {
            console.log("Maus Hub: バトルページを検出");
            this.currentBattleData = this.extractBattleData();

            // ページ変更時にもボタンをチェック
            setTimeout(() => {
                this.checkAndAddMausHubButton();
            }, 1000);
        }
    }

    isBattlePage() {
        // URLがバトルページかどうかチェック
        return location.pathname.startsWith("/battle-") || document.querySelector(".battle") !== null;
    }

    // 対戦が終了したかどうかを検出
    isBattleEnded() {
        console.log("Maus Hub: 対戦終了状態をチェック中...");

        // 1. 勝敗メッセージの確認
        const battleMessages = document.querySelectorAll(".battle-log .inner .message");
        for (const message of battleMessages) {
            const text = message.textContent.toLowerCase();
            if (
                text.includes("won the battle") ||
                text.includes("forfeited") ||
                text.includes("wins!") ||
                text.includes("勝利") ||
                text.includes("敗北") ||
                text.includes("フォーフィット")
            ) {
                console.log("Maus Hub: 勝敗メッセージで対戦終了を検出:", text);
                return true;
            }
        }

        // 2. リプレイボタンの存在確認（対戦終了時に表示される）
        const replayButtons = document.querySelectorAll("button");
        for (const button of replayButtons) {
            const buttonText = button.textContent.toLowerCase();
            if (
                buttonText.includes("upload and share replay") ||
                buttonText.includes("download replay") ||
                buttonText.includes("save replay") ||
                buttonText.includes("リプレイを保存") ||
                buttonText.includes("リプレイをアップロード")
            ) {
                console.log("Maus Hub: リプレイボタンで対戦終了を検出:", button.textContent);
                return true;
            }
        }

        // 3. フォームの確認（リプレイ保存フォームが表示されるか）
        const replayForm = document.querySelector('form[action="/savereplay"]') || document.querySelector('form[action*="replay"]');
        if (replayForm) {
            console.log("Maus Hub: リプレイフォームで対戦終了を検出");
            return true;
        }

        // 4. バトルログで最後のメッセージを確認
        const logMessages = document.querySelectorAll(".battle-log .message");
        if (logMessages.length > 0) {
            const lastMessage = logMessages[logMessages.length - 1];
            const lastText = lastMessage.textContent.toLowerCase();
            if (lastText.includes("battle ended") || lastText.includes("対戦終了") || lastText.includes("勝負あり")) {
                console.log("Maus Hub: 最終メッセージで対戦終了を検出:", lastText);
                return true;
            }
        }

        console.log("Maus Hub: 対戦はまだ進行中です");
        return false;
    }

    // リプレイAPIからデータを取得
    async fetchReplayDataFromAPI(replayUrl) {
        try {
            console.log("Maus Hub: リプレイAPIからデータを取得中 - リプレイURL:", replayUrl);

            // リプレイURLの形式を確認
            if (!replayUrl || !replayUrl.includes("replay.pokemonshowdown.com")) {
                console.error("Maus Hub: 無効なリプレイURL:", replayUrl);
                return null;
            }

            // リプレイURLからリプレイIDを抽出
            const replayIdMatch = replayUrl.match(/\/([^\/]+)$/);
            if (!replayIdMatch) {
                console.error("Maus Hub: リプレイIDの抽出に失敗:", replayUrl);
                return null;
            }

            const replayId = replayIdMatch[1];
            const apiUrl = `https://replay.pokemonshowdown.com/${replayId}.json`;

            console.log("Maus Hub: リプレイID抽出:", replayId);
            console.log("Maus Hub: API URL:", apiUrl);

            const response = await fetch(apiUrl);
            console.log("Maus Hub: APIレスポンス状態:", response.status, response.statusText);

            if (!response.ok) {
                console.error("Maus Hub: リプレイAPI取得失敗:", response.status, response.statusText);
                console.error("Maus Hub: リクエストURL:", apiUrl);
                return null;
            }

            const replayData = await response.json();
            console.log("Maus Hub: 生リプレイデータ:", replayData);

            // リプレイデータを解析して必要な情報を抽出
            const parsedData = this.parseReplayData(replayData, replayUrl);
            console.log("Maus Hub: 解析されたリプレイデータ:", parsedData);

            return parsedData;
        } catch (error) {
            console.error("Maus Hub: リプレイAPIからのデータ取得でエラー:", error);
            return null;
        }
    }

    // リプレイデータを解析
    parseReplayData(replayData, replayUrl) {
        try {
            const data = {
                url: replayUrl,
                players: [],
                format: "Unknown Format",
                rating: null,
                battleDate: null,
                teams: {},
                selectedPokemon: {},
                battleLog: "",
                timestamp: Date.now(),
                createdAt: Date.now(),
                totalTurns: 0,
                battleStartTime: null,
            };

            console.log("Maus Hub: APIレスポンス全体:", replayData);

            // プレイヤー情報を取得
            data.players = replayData.players || [];
            console.log("Maus Hub: プレイヤー情報取得:", data.players);

            // フォーマット情報を取得
            data.format = replayData.format || "Unknown Format";
            console.log("Maus Hub: フォーマット情報取得:", data.format);

            // レーティング情報を取得
            data.rating = replayData.rating || null;
            console.log("Maus Hub: レーティング情報取得:", data.rating);

            // バトル日付を取得
            if (replayData.uploadtime) {
                data.battleDate = new Date(replayData.uploadtime * 1000).toDateString();
                console.log("Maus Hub: バトル日付取得:", data.battleDate);
            }

            // バトルログを取得
            data.battleLog = replayData.log || "";
            console.log("Maus Hub: バトルログ取得（文字数）:", data.battleLog.length);

            // バトルログから詳細情報を抽出（webページと同じロジック）
            if (data.battleLog) {
                const battleData = this.extractBattleDataFromLog(data.battleLog, data.players);
                data.teams = battleData.teams;
                data.selectedPokemon = battleData.selectedPokemon;
                data.totalTurns = battleData.totalTurns;
                if (battleData.battleStartTime) {
                    data.battleStartTime = battleData.battleStartTime;
                }
                console.log("Maus Hub: バトルデータ抽出完了:", battleData);
            }

            // 最終的なデータ検証
            console.log("Maus Hub: 解析完了データ:", {
                url: data.url,
                players: data.players,
                format: data.format,
                rating: data.rating,
                battleDate: data.battleDate,
                teams: data.teams,
                selectedPokemon: data.selectedPokemon,
                totalTurns: data.totalTurns,
                battleStartTime: data.battleStartTime,
                battleLogLength: data.battleLog.length,
            });

            // 必要な情報が取得できているかチェック
            if (data.format === "Unknown Format") {
                console.warn("Maus Hub: フォーマット情報が取得できませんでした");
            }
            if (data.players.length === 0) {
                console.warn("Maus Hub: プレイヤー情報が取得できませんでした");
            }
            if (Object.keys(data.teams).length === 0) {
                console.warn("Maus Hub: チーム情報が取得できませんでした");
            }
            if (Object.keys(data.selectedPokemon).length === 0) {
                console.warn("Maus Hub: selectedPokemon情報が取得できませんでした");
            }
            if (data.rating === null) {
                console.warn("Maus Hub: レーティング情報が取得できませんでした");
            }

            return data;
        } catch (error) {
            console.error("Maus Hub: リプレイデータ解析エラー:", error);
            return null;
        }
    }

    // バトルログから詳細情報を抽出する関数（webページと同じロジック）
    extractBattleDataFromLog(battleLog, players) {
        if (!battleLog || !Array.isArray(players) || players.length === 0) {
            return { teams: {}, totalTurns: 0, battleStartTime: null, selectedPokemon: {} };
        }

        const teams = {};
        const selectedPokemon = {};
        let totalTurns = 0;
        let battleStartTime = null;

        // プレイヤーごとにチームと選出ポケモンを初期化
        players.forEach((player) => {
            teams[player] = [];
            selectedPokemon[player] = [];
        });

        try {
            // バトルログが文字列の場合は配列に変換
            let logLines = [];
            if (typeof battleLog === "string") {
                logLines = battleLog.split("\n");
            } else if (Array.isArray(battleLog)) {
                logLines = battleLog;
            }

            console.log("Maus Hub: バトルログ行数:", logLines.length);

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
                            if (!pokemonName || pokemonName.startsWith("L") || /^[0-9]/.test(pokemonName)) {
                                console.log(`Maus Hub: 無効なポケモン名をスキップ: "${pokemonName}"`);
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
                                console.log(`Maus Hub: ポケモン発見: ${pokemonName} for player ${playerName} (${playerSide})`);
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
                                console.log(`Maus Hub: バトル開始時刻発見: ${battleStartTime} (timestamp: ${timestamp})`);
                            }
                        }
                    }
                    // 選出ポケモンの抽出: |switch|p1a: Pokemon|...
                    else if (line.startsWith("|switch|")) {
                        const parts = line.split("|");
                        if (parts.length >= 3) {
                            const switchInfo = parts[2]; // 例: "p1a: Gastrodon"
                            const colonIndex = switchInfo.indexOf(":");
                            if (colonIndex !== -1) {
                                const playerSide = switchInfo.substring(0, colonIndex).charAt(1); // "1" または "2"
                                const pokemonName = switchInfo.substring(colonIndex + 1).trim();

                                // プレイヤーとの対応付け
                                let playerName = null;
                                if (playerSide === "1" && players[0]) {
                                    playerName = players[0];
                                } else if (playerSide === "2" && players[1]) {
                                    playerName = players[1];
                                }

                                if (playerName && pokemonName && !selectedPokemon[playerName].includes(pokemonName)) {
                                    selectedPokemon[playerName].push(pokemonName);
                                    console.log(`Maus Hub: 選出ポケモン発見: ${pokemonName} for player ${playerName}`);
                                }
                            }
                        }
                    }
                }
            });

            console.log("Maus Hub: 抽出されたバトルデータ:", { teams, totalTurns, battleStartTime, selectedPokemon });
            return { teams, totalTurns, battleStartTime, selectedPokemon };
        } catch (error) {
            console.error("Maus Hub: バトルログからのデータ抽出エラー:", error);
            return { teams: {}, totalTurns: 0, battleStartTime: null, selectedPokemon: {} };
        }
    }

    extractBattleData() {
        const data = {
            url: location.href, // 対戦URL（後でリプレイURLに置き換える）
            timestamp: Date.now(),
            players: [],
            format: "Unknown Format",
            rating: null,
        };

        console.log("Maus Hub: バトルデータ抽出開始 - URL:", location.href);

        try {
            // プレイヤー名を抽出
            const playerElements = document.querySelectorAll(".username");
            data.players = Array.from(playerElements).map((el) => el.textContent.trim());

            // フォーマットを抽出（複数のセレクタを試行）
            const formatSelectors = [
                ".format",
                ".battle-format",
                "[data-format]",
                ".formatselect option[selected]",
                "select[name='format'] option[selected]",
                ".roomtitle", // ルームタイトルからフォーマットを抽出
                "h1", // ページタイトル
                ".battle-info .format",
            ];

            let formatFound = false;
            for (const selector of formatSelectors) {
                const formatElement = document.querySelector(selector);
                if (formatElement) {
                    let formatText = formatElement.textContent || formatElement.getAttribute("data-format") || "";
                    formatText = formatText.trim();

                    // ルームタイトルの場合は、フォーマット部分を抽出
                    if (selector === ".roomtitle" || selector === "h1") {
                        const formatMatch = formatText.match(/\[([^\]]+)\]/);
                        if (formatMatch) {
                            formatText = formatMatch[1];
                        }
                    }

                    if (formatText && formatText !== "Unknown Format") {
                        data.format = formatText;
                        formatFound = true;
                        console.log("Maus Hub: フォーマット抽出成功:", formatText, "セレクタ:", selector);
                        break;
                    }
                }
            }

            if (!formatFound) {
                console.warn("Maus Hub: フォーマット情報を取得できませんでした");
                // URLからフォーマットを推測（battle-gen9ou等）
                const urlMatch = location.href.match(/battle-([^-]+)/);
                if (urlMatch) {
                    data.format = urlMatch[1];
                    console.log("Maus Hub: URLからフォーマットを推測:", data.format);
                }
            }

            // レーティングを抽出（あれば）
            const ratingElement = document.querySelector(".rating") || document.querySelector(".ladder-rating");
            if (ratingElement) {
                const ratingMatch = ratingElement.textContent.match(/(\d+)/);
                if (ratingMatch) {
                    data.rating = parseInt(ratingMatch[1]);
                }
            }

            console.log("Maus Hub: バトルデータを抽出:", data);
        } catch (error) {
            console.error("Maus Hub: バトルデータの抽出に失敗:", error);
        }

        return data;
    }

    getBattleIdFromUrl() {
        const match = location.pathname.match(/\/battle-(.+)/);
        return match ? match[1] : null;
    }

    async checkUserAuthentication() {
        return new Promise((resolve) => {
            if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
                try {
                    chrome.runtime.sendMessage(
                        {
                            action: "checkAuth",
                        },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("Maus Hub: Chrome runtime error:", chrome.runtime.lastError.message);
                                resolve(false);
                                return;
                            }
                            console.log("Maus Hub: 認証チェック結果:", response);
                            resolve(response && response.success && response.authenticated);
                        }
                    );
                } catch (error) {
                    console.error("Maus Hub: 認証チェック中にエラー:", error);
                    resolve(false);
                }
            } else {
                console.warn("Maus Hub: Chrome runtime not available or extension context invalidated");
                resolve(false);
            }
        });
    }

    async sendReplayToBackground(battleData) {
        console.log("Maus Hub: バックグラウンドにリプレイデータを送信:", battleData);

        // Chrome拡張のメッセージングAPIを使用
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
            try {
                chrome.runtime.sendMessage(
                    {
                        action: "saveReplay",
                        data: battleData,
                    },
                    (response) => {
                        try {
                            if (chrome.runtime.lastError) {
                                console.error("Maus Hub: Chrome runtime error:", chrome.runtime.lastError.message);
                                return;
                            }

                            if (response && response.success) {
                                console.log("Maus Hub: リプレイが正常に登録されました");
                            } else {
                                const errorMsg = response && response.error ? response.error : "不明なエラー";
                                console.error("Maus Hub: リプレイの登録に失敗:", errorMsg);
                                console.error("Maus Hub: 完全なレスポンス:", response);
                                throw new Error(errorMsg);
                            }
                        } catch (error) {
                            console.error("Maus Hub: レスポンス処理中にエラー:", error);
                            throw error;
                        }
                    }
                );
            } catch (error) {
                console.error("Maus Hub: メッセージ送信中にエラー:", error);
                throw new Error("拡張機能との通信に失敗しました");
            }
        } else {
            console.error("Maus Hub: Chrome拡張機能が利用できません - コンテキストが無効化されている可能性があります");
            throw new Error("拡張機能が利用できません");
        }
    }

    showNotification(message, type = "info") {
        // Pokemon Showdownのページに通知を表示
        const notification = document.createElement("div");

        // 背景色を決定
        let backgroundColor = "#3498db"; // デフォルト（info）
        if (type === "success") {
            backgroundColor = "#27ae60";
        } else if (type === "error") {
            backgroundColor = "#e74c3c";
        } else if (type === "warning") {
            backgroundColor = "#f39c12";
        }

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            background: ${backgroundColor};
        `;
        notification.textContent = message;

        // 安全にDOM要素を追加
        try {
            document.body.appendChild(notification);
        } catch (error) {
            console.error("Maus Hub: 通知の表示に失敗:", error);
            return;
        }

        // フェードイン
        setTimeout(() => {
            if (notification.style) {
                notification.style.opacity = "1";
            }
        }, 100);

        // 3秒後にフェードアウトして削除
        setTimeout(() => {
            if (notification.style) {
                notification.style.opacity = "0";
                setTimeout(() => {
                    try {
                        if (notification.parentNode && document.body.contains(notification)) {
                            document.body.removeChild(notification);
                        }
                    } catch (error) {
                        console.error("Maus Hub: 通知の削除に失敗:", error);
                    }
                }, 300);
            }
        }, 3000);
    }

    destroy() {
        // WebSocket関連のクリーンアップ
        if (this.originalWebSocketSend && typeof WebSocket !== "undefined") {
            WebSocket.prototype.send = this.originalWebSocketSend;
        }
        if (this.originalConsoleLog && typeof console !== "undefined") {
            console.log = this.originalConsoleLog;
        }

        this.isInitialized = false;
    }
}

// ページ読み込み完了後に初期化
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        window.mausHubReplayAutoRegister = new ReplayAutoRegister();
    });
} else {
    window.mausHubReplayAutoRegister = new ReplayAutoRegister();
}

// ページアンロード時にクリーンアップ
window.addEventListener("beforeunload", () => {
    if (window.mausHubReplayAutoRegister) {
        window.mausHubReplayAutoRegister.destroy();
    }
});
