// Pokemon Showdown リプレイ自動登録スクリプト（デバッグ版）
console.log("Maus Hub: デバッグ版リプレイ自動登録スクリプトが読み込まれました");

// 基本的なバトル終了検出のみ
function checkBattleEnd() {
    try {
        // バトルログから勝利メッセージを検索
        const messages = document.querySelectorAll(".battle-log div, .battle-log p, .battle-log span");
        for (const msg of messages) {
            const text = msg.textContent;
            if (text && (text.includes("won the battle") || text.includes("勝利"))) {
                console.log("Maus Hub: バトル終了を検出:", text);

                // 通知を表示
                const notification = document.createElement("div");
                notification.style.cssText = `
                    position: fixed; top: 20px; right: 20px; 
                    background: #27ae60; color: white; padding: 12px; 
                    border-radius: 6px; z-index: 10000;
                `;
                notification.textContent = "バトル終了を検出しました！";
                document.body.appendChild(notification);

                setTimeout(() => document.body.removeChild(notification), 3000);
                break;
            }
        }
    } catch (error) {
        console.error("Maus Hub: エラー:", error);
    }
}

// 3秒ごとにチェック
setInterval(checkBattleEnd, 3000);

console.log("Maus Hub: デバッグ版初期化完了");
