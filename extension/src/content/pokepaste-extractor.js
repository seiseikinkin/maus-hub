// コンテンツスクリプト - PokePastページから情報を抽出
(function () {
    "use strict";

    // PokePastページから詳細情報を抽出する関数
    function extractPokePasteInfo() {
        console.log("=== PokePaste Extractor Started ===");
        const info = {
            author: null,
            pokemonNames: [],
        };

        try {
            // 作者を抽出 (h2 タグから "by 作者名" を取得)
            console.log("Extracting author...");
            const authorElement = document.querySelector("h2");
            console.log("Author element:", authorElement);
            if (authorElement && authorElement.textContent) {
                console.log("Author element text:", authorElement.textContent);
                const match = authorElement.textContent.match(/by\s+(.+)/i);
                if (match) {
                    info.author = match[1].trim();
                    console.log("Extracted author:", info.author);
                } else {
                    console.log("No author match found");
                }
            } else {
                console.log("No h2 element found");
            }

            // ポケモン名を抽出 (複数の方法で試行)
            console.log("Extracting Pokemon names...");
            const articles = document.querySelectorAll("article");
            console.log("Found articles:", articles.length);
            const pokemonNames = [];

            articles.forEach((article, index) => {
                console.log(`Processing article ${index + 1}...`);
                let pokemonName = null;

                // 方法1: pre要素の最初の行から抽出（より確実）
                const preElement = article.querySelector("pre");
                console.log(`Article ${index + 1} - pre element:`, preElement);
                if (preElement && preElement.textContent) {
                    const firstLine = preElement.textContent.split("\n")[0];
                    console.log(`Article ${index + 1} - first line:`, firstLine);
                    // "@" より前の部分がポケモン名
                    const match = firstLine.match(/^([^@]+)/);
                    if (match) {
                        const candidate = match[1].trim();
                        console.log(`Article ${index + 1} - candidate:`, candidate);
                        // ポケモン名らしい文字列かチェック（長すぎず、基本的な文字のみ）
                        if (candidate.length > 2 && candidate.length < 30 && /^[A-Za-z0-9\-\s]+$/.test(candidate)) {
                            pokemonName = candidate;
                            console.log(`Article ${index + 1} - valid Pokemon name:`, pokemonName);
                        } else {
                            console.log(`Article ${index + 1} - candidate failed validation`);
                        }
                    } else {
                        console.log(`Article ${index + 1} - no match found`);
                    }
                } else {
                    console.log(`Article ${index + 1} - no pre element or text content`);
                }

                // 方法2: 方法1で取得できない場合、最初のtype-spanから取得
                if (!pokemonName) {
                    const firstSpan = article.querySelector('pre span[class^="type-"]');
                    if (firstSpan && firstSpan.textContent) {
                        const candidate = firstSpan.textContent.trim();
                        // 短すぎる場合（"Water"など）は除外
                        if (candidate.length > 3) {
                            pokemonName = candidate;
                        }
                    }
                }

                // ポケモン名が取得できた場合、リストに追加
                if (pokemonName && !pokemonNames.includes(pokemonName)) {
                    pokemonNames.push(pokemonName);
                    console.log(`Found Pokemon ${index + 1}:`, pokemonName);
                }
            });

            info.pokemonNames = pokemonNames;

            console.log("Extracted PokePaste info:", info);
            return info;
        } catch (error) {
            console.error("Error extracting PokePaste info:", error);
            return info;
        }
    }

    // バックグラウンドスクリプトからのメッセージを監視
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "extractPokePasteInfo") {
            const info = extractPokePasteInfo();
            sendResponse(info);
        }
    });
})();
