// Pokemon Showdown リプレイ自動登録スクリプト
console.log("Maus Hub: Pokemon Showdown リプレイ自動登録スクリプトが読み込まれました");

class ReplayAutoRegister {
    constructor() {
        this.isInitialized = false;
        this.battleEndObserver = null;
        this.currentBattleData = null;
        this.isProcessingBattleEnd = false; // 処理中フラグ
        this.processedBattles = new Set(); // 処理済みバトルのトラッキング
        this.lastBattleEndTime = 0; // 最後のバトル終了処理時刻
        this.init();
    }

    init() {
        if (this.isInitialized) return;

        console.log("Maus Hub: リプレイ自動登録機能を初期化中...");

        // バトル終了を検知するオブザーバーを設定
        this.setupBattleEndObserver();

        // ページの変更を監視
        this.setupPageChangeObserver();

        this.isInitialized = true;
        console.log("Maus Hub: リプレイ自動登録機能が初期化されました");
    }

    setupBattleEndObserver() {
        // バトル結果エリアを監視
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        this.battleEndObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "childList") {
                    // バトル終了メッセージを探す
                    this.checkForBattleEnd();
                }
            }
        });

        this.battleEndObserver.observe(targetNode, config);
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
        }
    }

    isBattlePage() {
        // URLがバトルページかどうかチェック
        return location.pathname.startsWith("/battle-") || document.querySelector(".battle") !== null;
    }

    checkForBattleEnd() {
        // 処理中の場合はスキップ
        if (this.isProcessingBattleEnd) {
            console.log("Maus Hub: バトル終了処理中のためスキップ");
            return;
        }

        // 最近処理した場合はスキップ（10秒以内の重複処理を防ぐ）
        const now = Date.now();
        if (now - this.lastBattleEndTime < 10000) {
            console.log("Maus Hub: 最近処理済みのためスキップ");
            return;
        }

        // バトルログのメッセージをチェック
        const battleLogMessages = document.querySelectorAll(".battle-log .message, .battle-log .message-effect");
        for (const message of battleLogMessages) {
            if (
                message.textContent.includes("won the battle") ||
                message.textContent.includes("wins the battle") ||
                message.textContent.includes("勝利した") ||
                message.textContent.includes("勝った")
            ) {
                const battleId = this.getBattleIdFromUrl();
                if (battleId && this.processedBattles.has(battleId)) {
                    console.log("Maus Hub: 既に処理済みのバトル:", battleId);
                    return;
                }

                console.log("Maus Hub: バトル終了を検出（メッセージ）:", message.textContent.trim());
                this.triggerBattleEndHandling(battleId);
                return;
            }
        }

        // リプレイボタンの存在をチェック
        const replayButton =
            document.querySelector('button[name="saveReplay"]') || document.querySelector(".replaybutton") || document.querySelector(".replay-button");
        if (replayButton) {
            const battleId = this.getBattleIdFromUrl();
            if (battleId && this.processedBattles.has(battleId)) {
                console.log("Maus Hub: 既に処理済みのバトル:", battleId);
                return;
            }

            console.log("Maus Hub: リプレイボタンを検出");
            this.triggerBattleEndHandling(battleId);
            return;
        }

        // より確実な方法：バトルログから勝利メッセージを検出
        this.checkBattleLogForWin();
    }

    // バトル終了処理のトリガー（重複防止付き）
    triggerBattleEndHandling(battleId) {
        if (this.isProcessingBattleEnd) return;

        this.isProcessingBattleEnd = true;
        this.lastBattleEndTime = Date.now();

        if (battleId) {
            this.processedBattles.add(battleId);
        }

        setTimeout(async () => {
            try {
                await this.handleBattleEnd();
            } finally {
                // 処理完了後、フラグをリセット
                setTimeout(() => {
                    this.isProcessingBattleEnd = false;
                }, 5000); // 5秒後にリセット
            }
        }, 2000); // 2秒後に処理
    }

    checkBattleLogForWin() {
        if (this.isProcessingBattleEnd) return;

        const battleLog = document.querySelector(".battle-log") || document.querySelector(".battle-log-add");
        if (!battleLog) return;

        // より広範囲のメッセージを検索
        const logMessages = battleLog.querySelectorAll(".message, .battle-history, p, div");
        for (const message of logMessages) {
            const text = message.textContent.toLowerCase();
            if (
                text.includes("won the battle") ||
                text.includes("wins the battle") ||
                text.includes("勝利") ||
                text.includes("victory") ||
                text.includes("has won") ||
                text.includes("が勝った") ||
                text.includes("の勝利")
            ) {
                const battleId = this.getBattleIdFromUrl();
                if (battleId && this.processedBattles.has(battleId)) {
                    console.log("Maus Hub: 既に処理済みのバトル:", battleId);
                    return;
                }

                console.log("Maus Hub: バトルログから勝利を検出:", message.textContent.trim());
                this.triggerBattleEndHandling(battleId);
                return;
            }
        }

        // バトル終了の別の指標もチェック
        this.checkForBattleEndIndicators();
    }

    checkForBattleEndIndicators() {
        if (this.isProcessingBattleEnd) return;

        // Pokemon Showdownの様々なバトル終了指標をチェック
        const indicators = [
            // リプレイ関連
            () => document.querySelector('button[name="saveReplay"]'),
            () => document.querySelector(".replaybutton"),
            () => document.querySelector(".controls .replaybutton"),

            // バトル状態関連
            () => document.querySelector(".battle-log")?.textContent.includes("forfeited"),
            () => document.querySelector(".battle-log")?.textContent.includes("タイムアップ"),
            () => document.querySelector(".battle-log")?.textContent.includes("time up"),

            // UI状態関連
            () => document.querySelector(".battle")?.classList.contains("battle-ended"),
            () => document.querySelector(".rightbar .winning"),
        ];

        for (const indicator of indicators) {
            try {
                if (indicator()) {
                    const battleId = this.getBattleIdFromUrl();
                    if (battleId && this.processedBattles.has(battleId)) {
                        console.log("Maus Hub: 既に処理済みのバトル:", battleId);
                        return;
                    }

                    console.log("Maus Hub: バトル終了指標を検出");
                    this.triggerBattleEndHandling(battleId);
                    return;
                }
            } catch (e) {
                // エラーは無視して次のインジケータをチェック
            }
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

    async handleBattleEnd() {
        console.log("Maus Hub: バトル終了処理を開始");

        try {
            // リプレイURLを取得
            const replayUrl = await this.getReplayUrl();
            if (!replayUrl) {
                console.log("Maus Hub: リプレイURLが見つかりません");
                this.showNotification("リプレイURLの取得に失敗しました", "error");
                return;
            }

            console.log("Maus Hub: リプレイURL取得:", replayUrl);

            // リプレイURLの形式を検証
            if (!replayUrl.includes("replay.pokemonshowdown.com")) {
                console.error("Maus Hub: 無効なリプレイURL形式:", replayUrl);
                this.showNotification("取得したURLがリプレイURLではありません", "error");
                return;
            }

            // バトルデータを更新（対戦URLをリプレイURLに置き換え）
            const battleData = this.currentBattleData || this.extractBattleData();
            battleData.url = replayUrl; // 対戦URLをリプレイURLで上書き
            battleData.replayUrl = replayUrl; // 念のため専用フィールドも設定

            console.log("Maus Hub: 送信するバトルデータ:", battleData);

            // バックグラウンドスクリプトにリプレイデータを送信
            this.sendReplayToBackground(battleData);
        } catch (error) {
            console.error("Maus Hub: バトル終了処理でエラー:", error);
            this.showNotification("リプレイの処理中にエラーが発生しました", "error");
        }
    }

    async getReplayUrl() {
        console.log("Maus Hub: リプレイURL取得開始");

        // リプレイボタンを探す
        const replayButton =
            document.querySelector('button[name="saveReplay"]') ||
            document.querySelector(".replaybutton") ||
            this.findButtonByText("Save replay") ||
            this.findButtonByText("リプレイを保存");

        if (replayButton) {
            console.log("Maus Hub: リプレイボタンを発見、クリックします");
            // ボタンをクリックしてリプレイを保存
            replayButton.click();

            // リプレイ保存後のURL入力フィールドを待機
            return new Promise((resolve) => {
                const checkForReplayUrl = (attempts = 0) => {
                    const maxAttempts = 10; // 最大10回（5秒間）試行

                    // 様々なセレクタでリプレイURL入力フィールドを探す
                    const replayInput =
                        document.querySelector("input[readonly]") ||
                        document.querySelector('input[value*="replay.pokemonshowdown.com"]') ||
                        document.querySelector('input[placeholder*="replay"]') ||
                        document.querySelector(".replayurl input") ||
                        document.querySelector('input[type="text"][value^="https://replay.pokemonshowdown.com"]');

                    if (replayInput && replayInput.value && replayInput.value.includes("replay.pokemonshowdown.com")) {
                        console.log("Maus Hub: リプレイURL取得成功:", replayInput.value);
                        resolve(replayInput.value);
                        return;
                    }

                    // まだ見つからない場合、再試行
                    if (attempts < maxAttempts) {
                        setTimeout(() => checkForReplayUrl(attempts + 1), 500);
                    } else {
                        console.log("Maus Hub: リプレイURL入力フィールドが見つからない、代替方法を試行");
                        // 代替方法：バトルIDから構築を試みる
                        const battleId = this.getBattleIdFromUrl();
                        if (battleId) {
                            // バトルIDからリプレイURLを推測（完全ではないが最善の試み）
                            const constructedUrl = `https://replay.pokemonshowdown.com/${battleId}`;
                            console.log("Maus Hub: リプレイURLを推測:", constructedUrl);
                            resolve(constructedUrl);
                        } else {
                            console.error("Maus Hub: リプレイURLの取得に完全に失敗");
                            resolve(null);
                        }
                    }
                };

                // 最初のチェックは少し待機してから開始
                setTimeout(() => checkForReplayUrl(), 1000);
            });
        }

        // ボタンが見つからない場合、既にリプレイURLが表示されているかチェック
        const existingReplayInput = document.querySelector('input[value*="replay.pokemonshowdown.com"]');
        if (existingReplayInput && existingReplayInput.value) {
            console.log("Maus Hub: 既存のリプレイURL発見:", existingReplayInput.value);
            return existingReplayInput.value;
        }

        console.log("Maus Hub: リプレイボタンもURLも見つからない");
        return null;
    }

    // ボタンのテキストで検索するヘルパーメソッド
    findButtonByText(text) {
        const buttons = document.querySelectorAll("button");
        for (const button of buttons) {
            if (button.textContent.trim().includes(text)) {
                return button;
            }
        }
        return null;
    }

    getBattleIdFromUrl() {
        const match = location.pathname.match(/\/battle-(.+)/);
        return match ? match[1] : null;
    }

    // Pokemon ShowdownのAPIを使ってリプレイURLを取得する試み
    async tryGetReplayFromAPI() {
        const battleId = this.getBattleIdFromUrl();
        if (!battleId) return null;

        try {
            // Pokemon ShowdownのAPIエンドポイントを試行
            const apiUrl = `https://replay.pokemonshowdown.com/search/?user=&format=&output=json&limit=1`;
            console.log("Maus Hub: API経由でのリプレイURL取得を試行");

            // 注意: これは実際のAPIではない可能性があります
            // Pokemon Showdownの内部システムからリプレイURLを取得する方法は限定的です

            return null; // 今回は実装しない
        } catch (error) {
            console.error("Maus Hub: API経由でのリプレイURL取得に失敗:", error);
            return null;
        }
    }

    async checkUserAuthentication() {
        return new Promise((resolve) => {
            if (typeof chrome !== "undefined" && chrome.runtime) {
                chrome.runtime.sendMessage(
                    {
                        action: "checkAuth",
                    },
                    (response) => {
                        console.log("Maus Hub: 認証チェック結果:", response);
                        resolve(response && response.success && response.authenticated);
                    }
                );
            } else {
                console.warn("Maus Hub: Chrome runtime not available");
                resolve(false);
            }
        });
    }

    async sendReplayToBackground(battleData) {
        console.log("Maus Hub: バックグラウンドにリプレイデータを送信:", battleData);

        // 事前に認証チェックを実行
        console.log("Maus Hub: ユーザー認証状態をチェック中...");
        const isAuthenticated = await this.checkUserAuthentication();

        if (!isAuthenticated) {
            console.warn("Maus Hub: ユーザーが認証されていません - 自動登録をスキップ");
            this.showNotification("自動登録にはログインが必要です。拡張機能からログインしてください。", "warning");
            return;
        }

        console.log("Maus Hub: ユーザー認証済み - 自動登録を実行");

        // Chrome拡張のメッセージングAPIを使用
        if (typeof chrome !== "undefined" && chrome.runtime) {
            try {
                chrome.runtime.sendMessage(
                    {
                        type: "AUTO_REGISTER_REPLAY",
                        data: battleData,
                    },
                    (response) => {
                        try {
                            if (response && response.success) {
                                console.log("Maus Hub: リプレイが正常に登録されました");
                                this.showNotification("リプレイが自動登録されました！", "success");
                            } else {
                                const errorMsg = response && response.error ? response.error : "不明なエラー";
                                console.error("Maus Hub: リプレイの登録に失敗:", errorMsg);
                                console.error("Maus Hub: 完全なレスポンス:", response);
                                this.showNotification(`リプレイの自動登録に失敗: ${errorMsg}`, "error");
                            }
                        } catch (error) {
                            console.error("Maus Hub: レスポンス処理中にエラー:", error);
                            this.showNotification("リプレイの自動登録中にエラーが発生しました", "error");
                        }
                    }
                );
            } catch (error) {
                console.error("Maus Hub: メッセージ送信中にエラー:", error);
                this.showNotification("拡張機能との通信に失敗しました", "error");
            }
        } else {
            console.error("Maus Hub: Chrome拡張機能が利用できません");
            this.showNotification("Chrome拡張機能が利用できません", "error");
        }
    }

    showNotification(message, type = "info") {
        // Pokemon Showdownのページに通知を表示
        const notification = document.createElement("div");
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
            ${
                type === "success"
                    ? "background: #27ae60;"
                    : type === "error"
                    ? "background: #e74c3c;"
                    : type === "warning"
                    ? "background: #f39c12;"
                    : "background: #3498db;"
            }
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // フェードイン
        setTimeout(() => (notification.style.opacity = "1"), 100);

        // 3秒後にフェードアウトして削除
        setTimeout(() => {
            notification.style.opacity = "0";
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    destroy() {
        if (this.battleEndObserver) {
            this.battleEndObserver.disconnect();
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
