// コンテンツスクリプト - PokePastページから情報を抽出
(function () {
    "use strict";

    // 各ポケモンの詳細情報をパースする関数
    function parsePokemonData(articleText) {
        const pokemon = {
            nickname: null,
            species: null,
            gender: null,
            item: null,
            ability: null,
            level: 100,
            shiny: false,
            happiness: 255,
            nature: null,
            teraType: null,
            evs: {},
            ivs: {},
            moves: [],
            rawText: articleText,
        };

        const lines = articleText.split("\n").filter((line) => line.trim());

        if (lines.length === 0) return null;

        // 1行目: ニックネーム、種族名、性別、アイテムを解析
        const firstLine = lines[0];

        // アイテムの抽出
        const itemMatch = firstLine.match(/@\s*(.+?)$/);
        if (itemMatch) {
            pokemon.item = itemMatch[1].trim();
        }

        // アイテムを除いた部分
        const beforeItem = firstLine.split("@")[0].trim();

        // 性別の抽出
        const genderMatch = beforeItem.match(/\(([MF])\)\s*$/);
        if (genderMatch) {
            pokemon.gender = genderMatch[1];
        }

        // 性別を除いた部分
        const beforeGender = beforeItem.replace(/\s*\([MF]\)\s*$/, "").trim();

        // ニックネームと種族名の抽出
        const nicknameMatch = beforeGender.match(/^(.+?)\s*\((.+?)\)$/);
        if (nicknameMatch) {
            pokemon.nickname = nicknameMatch[1].trim();
            pokemon.species = nicknameMatch[2].trim();
        } else {
            pokemon.species = beforeGender;
        }

        // 2行目以降: 各種ステータスと技を解析
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            // 能力
            if (line.startsWith("Ability:")) {
                pokemon.ability = line.substring(8).trim();
            }
            // レベル
            else if (line.startsWith("Level:")) {
                pokemon.level = parseInt(line.substring(6).trim());
            }
            // テラタイプ
            else if (line.startsWith("Tera Type:")) {
                pokemon.teraType = line.substring(10).trim();
            }
            // 色違い
            else if (line.startsWith("Shiny:")) {
                pokemon.shiny = line.substring(6).trim().toLowerCase() === "yes";
            }
            // なつき度
            else if (line.startsWith("Happiness:")) {
                pokemon.happiness = parseInt(line.substring(10).trim());
            }
            // 性格
            else if (line.match(/Nature\s*$/i)) {
                pokemon.nature = line.replace(/\s*Nature\s*$/i, "").trim();
            }
            // 努力値
            else if (line.startsWith("EVs:")) {
                const evString = line.substring(4).trim();
                pokemon.evs = parseStats(evString);
            }
            // 個体値
            else if (line.startsWith("IVs:")) {
                const ivString = line.substring(4).trim();
                pokemon.ivs = parseStats(ivString);
            }
            // 技
            else if (line.match(/^[-\u2022]\s*/)) {
                const move = line.replace(/^[-\u2022]\s*/, "").trim();
                if (move && pokemon.moves.length < 4) {
                    pokemon.moves.push(move);
                }
            }
        }

        return pokemon;
    }

    // EVs/IVsの文字列をパースする関数
    function parseStats(statsString) {
        const stats = {};
        const statMap = {
            HP: "hp",
            Atk: "atk",
            Def: "def",
            SpA: "spa",
            SpD: "spd",
            Spe: "spe",
        };

        const parts = statsString.split("/");
        parts.forEach((part) => {
            const match = part.trim().match(/(\d+)\s+(\w+)/);
            if (match) {
                const value = parseInt(match[1]);
                const statName = match[2];
                const key = statMap[statName];
                if (key) {
                    stats[key] = value;
                }
            }
        });

        return stats;
    }

    // PokePastページから詳細情報を抽出する関数
    function extractPokePasteInfo() {
        const info = {
            author: null,
            title: null,
            pokemonNames: [],
            pokemonTeam: [],
        };

        try {
            // タイトルを抽出 (aside > h1)
            const titleElement = document.querySelector("aside h1");
            if (titleElement && titleElement.textContent) {
                info.title = titleElement.textContent.trim();
            }

            // 作者を抽出 (aside > h2 から "by 作者名" を取得)
            const authorElement = document.querySelector("aside h2");
            if (authorElement && authorElement.textContent) {
                const match = authorElement.textContent.match(/by\s+(.+)/i);
                if (match) {
                    info.author = match[1].trim();
                }
            }

            // 各ポケモンの詳細情報を抽出
            const articles = document.querySelectorAll("article");
            const pokemonNames = [];
            const pokemonTeam = [];

            articles.forEach((article, index) => {
                const preElement = article.querySelector("pre");
                if (preElement && preElement.textContent) {
                    const articleText = preElement.textContent;
                    const pokemonData = parsePokemonData(articleText);

                    if (pokemonData && pokemonData.species) {
                        // 種族名をリストに追加（後方互換性のため）
                        if (!pokemonNames.includes(pokemonData.species)) {
                            pokemonNames.push(pokemonData.species);
                        }

                        // 詳細情報を追加
                        pokemonTeam.push(pokemonData);
                        console.log(`Found Pokemon ${index + 1}:`, pokemonData.species, pokemonData);
                    }
                }
            });

            info.pokemonNames = pokemonNames;
            info.pokemonTeam = pokemonTeam;

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
