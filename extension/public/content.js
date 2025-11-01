// Content script for auth.html
console.log("Content script loaded for auth page");

// ページからのメッセージを監視
window.addEventListener("message", (event) => {
    // セキュリティチェック：同じオリジンからのメッセージのみ受け入れ
    if (event.origin !== "https://hayatosum.github.io") {
        return;
    }

    console.log("Content script received message:", event.data);

    if (event.data.type === "AUTH_SUCCESS" && event.data.user) {
        // バックグラウンドスクリプトにメッセージを転送
        chrome.runtime.sendMessage(
            {
                type: "AUTH_SUCCESS",
                user: event.data.user,
            },
            (response) => {
                console.log("Auth message sent to background, response:", response);
                if (chrome.runtime.lastError) {
                    console.error("Error sending auth message:", chrome.runtime.lastError);
                }
            }
        );
    }
});

// ページが読み込まれた時に認証成功をチェック
if (window.location.search.includes("authSuccess=true")) {
    console.log("Auth success detected in URL");

    // 少し待ってからタブを閉じる
    setTimeout(() => {
        window.close();
    }, 2000);
}
