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
        console.log(`Parsing first line: "${firstLine}"`);

        // アイテムの抽出
        const itemMatch = firstLine.match(/@\s*(.+?)$/);
        if (itemMatch) {
            pokemon.item = itemMatch[1].trim();
            console.log(`Found item: ${pokemon.item}`);
        }

        // アイテムを除いた部分
        const beforeItem = firstLine.split("@")[0].trim();

        // 性別の抽出
        const genderMatch = beforeItem.match(/\(([MF])\)\s*$/);
        if (genderMatch) {
            pokemon.gender = genderMatch[1];
            console.log(`Found gender: ${pokemon.gender}`);
        }

        // 性別を除いた部分
        const beforeGender = beforeItem.replace(/\s*\([MF]\)\s*$/, "").trim();

        // ニックネームと種族名の抽出
        const nicknameMatch = beforeGender.match(/^(.+?)\s*\((.+?)\)$/);
        if (nicknameMatch) {
            pokemon.nickname = nicknameMatch[1].trim();
            pokemon.species = nicknameMatch[2].trim();
            console.log(`Found nickname: ${pokemon.nickname}, species: ${pokemon.species}`);
        } else {
            pokemon.species = beforeGender;
            console.log(`Found species: ${pokemon.species}`);
        }

        // 2行目以降: 各種ステータスと技を解析
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            // 能力
            if (line.startsWith("Ability:")) {
                pokemon.ability = line.substring(8).trim();
                console.log(`Found ability: ${pokemon.ability}`);
            }
            // レベル
            else if (line.startsWith("Level:")) {
                pokemon.level = parseInt(line.substring(6).trim());
                console.log(`Found level: ${pokemon.level}`);
            }
            // テラタイプ
            else if (line.startsWith("Tera Type:")) {
                pokemon.teraType = line.substring(10).trim();
                console.log(`Found tera type: ${pokemon.teraType}`);
            }
            // 色違い
            else if (line.startsWith("Shiny:")) {
                pokemon.shiny = line.substring(6).trim().toLowerCase() === "yes";
                console.log(`Found shiny: ${pokemon.shiny}`);
            }
            // なつき度
            else if (line.startsWith("Happiness:")) {
                pokemon.happiness = parseInt(line.substring(10).trim());
                console.log(`Found happiness: ${pokemon.happiness}`);
            }
            // 性格
            else if (line.match(/Nature\s*$/i)) {
                pokemon.nature = line.replace(/\s*Nature\s*$/i, "").trim();
                console.log(`Found nature: ${pokemon.nature}`);
            }
            // 努力値
            else if (line.startsWith("EVs:")) {
                const evString = line.substring(4).trim();
                pokemon.evs = parseStats(evString);
                console.log(`Found EVs:`, pokemon.evs);
            }
            // 個体値
            else if (line.startsWith("IVs:")) {
                const ivString = line.substring(4).trim();
                pokemon.ivs = parseStats(ivString);
                console.log(`Found IVs:`, pokemon.ivs);
            }
            // 技
            else if (line.match(/^[-\u2022]\s*/)) {
                const move = line.replace(/^[-\u2022]\s*/, "").trim();
                if (move && pokemon.moves.length < 4) {
                    pokemon.moves.push(move);
                    console.log(`Found move: ${move}`);
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
        console.log("=== PokePaste Extractor Started ===");
        const info = {
            author: null,
            title: null,
            pokemonNames: [],
            pokemonTeam: [],
        };

        try {
            // タイトルを抽出 (aside > h1)
            console.log("Extracting title...");
            const titleElement = document.querySelector("aside h1");
            console.log("Title element:", titleElement);
            if (titleElement && titleElement.textContent) {
                info.title = titleElement.textContent.trim();
                console.log("Extracted title:", info.title);
            } else {
                console.log("No title element found");
            }

            // 作者を抽出 (aside > h2 から "by 作者名" を取得)
            console.log("Extracting author...");
            const authorElement = document.querySelector("aside h2");
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
                console.log("No author element found");
            }

            // 各ポケモンの詳細情報を抽出
            console.log("Extracting Pokemon details...");
            const articles = document.querySelectorAll("article");
            console.log("Found articles:", articles.length);
            const pokemonNames = [];
            const pokemonTeam = [];

            articles.forEach((article, index) => {
                console.log(`Processing article ${index + 1}...`);
                const preElement = article.querySelector("pre");
                console.log(`Article ${index + 1} - pre element:`, preElement);
                if (preElement && preElement.textContent) {
                    const articleText = preElement.textContent;
                    console.log(`Article ${index + 1} - text content:`, articleText.substring(0, 100) + "...");
                    const pokemonData = parsePokemonData(articleText);

                    if (pokemonData && pokemonData.species) {
                        // 種族名をリストに追加（後方互換性のため）
                        if (!pokemonNames.includes(pokemonData.species)) {
                            pokemonNames.push(pokemonData.species);
                        }

                        // 詳細情報を追加
                        pokemonTeam.push(pokemonData);
                        console.log(`Found Pokemon ${index + 1}:`, pokemonData.species, pokemonData);
                    } else {
                        console.warn(`Article ${index + 1} - Failed to parse Pokemon data`);
                    }
                } else {
                    console.log(`Article ${index + 1} - no pre element or text content`);
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
