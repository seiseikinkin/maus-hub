import { collection, getDocs, query, orderBy, limit, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "./config";

// 各ポケモンの詳細情報の型定義
export interface PokemonData {
    nickname: string | null;
    species: string;
    gender: string | null;
    item: string | null;
    ability: string | null;
    level: number;
    shiny: boolean;
    happiness: number;
    nature: string | null;
    teraType: string | null;
    evs: Record<string, number>;
    ivs: Record<string, number>;
    moves: string[];
    rawText: string;
}

// PokePasteデータの型定義
export interface PokePasteData {
    id: string;
    url: string;
    title: string;
    timestamp: number;
    userId: string;
    author?: string;
    pokemonNames?: string[];
    pokemonTeam?: PokemonData[];
    rating?: number; // 1-5の評価
}

// Firestore PokePasteサービス
export class PokePasteService {
    // テスト用のダミーデータを生成
    private generateDummyData(userId: string): PokePasteData[] {
        return [
            {
                id: "dummy-1",
                url: "https://pokepast.es/example1",
                title: "Sample Team 1",
                timestamp: Date.now() - 86400000, // 1日前
                userId: userId,
                author: "TrainerAlice",
                pokemonNames: ["Pikachu", "Charizard", "Blastoise"],
                pokemonTeam: [
                    {
                        nickname: null,
                        species: "Pikachu",
                        gender: "M",
                        item: "Light Ball",
                        ability: "Static",
                        level: 100,
                        shiny: false,
                        happiness: 255,
                        nature: "Jolly",
                        teraType: "Electric",
                        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 },
                        ivs: {},
                        moves: ["Volt Tackle", "Iron Tail", "Quick Attack", "Thunder Wave"],
                        rawText:
                            "Pikachu (M) @ Light Ball\nAbility: Static\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Volt Tackle\n- Iron Tail\n- Quick Attack\n- Thunder Wave",
                    },
                    {
                        nickname: null,
                        species: "Charizard",
                        gender: null,
                        item: "Charizardite Y",
                        ability: "Blaze",
                        level: 100,
                        shiny: false,
                        happiness: 255,
                        nature: "Timid",
                        teraType: "Fire",
                        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
                        ivs: {},
                        moves: ["Fire Blast", "Solar Beam", "Roost", "Dragon Pulse"],
                        rawText:
                            "Charizard @ Charizardite Y\nAbility: Blaze\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Fire Blast\n- Solar Beam\n- Roost\n- Dragon Pulse",
                    },
                ],
                rating: 4,
            },
            {
                id: "dummy-2",
                url: "https://pokepast.es/example2",
                title: "Sample Team 2",
                timestamp: Date.now() - 172800000, // 2日前
                userId: userId,
                author: "TrainerBob",
                pokemonNames: ["Venusaur", "Alakazam", "Machamp"],
                pokemonTeam: [
                    {
                        nickname: null,
                        species: "Venusaur",
                        gender: "F",
                        item: "Venusaurite",
                        ability: "Overgrow",
                        level: 100,
                        shiny: false,
                        happiness: 255,
                        nature: "Bold",
                        teraType: "Grass",
                        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
                        ivs: {},
                        moves: ["Giga Drain", "Sludge Bomb", "Synthesis", "Leech Seed"],
                        rawText:
                            "Venusaur (F) @ Venusaurite\nAbility: Overgrow\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Giga Drain\n- Sludge Bomb\n- Synthesis\n- Leech Seed",
                    },
                ],
                rating: 3,
            },
        ];
    }
    // 全てのPokePasteを取得（最新順）
    async getAllPokePastes(limitCount = 50): Promise<PokePasteData[]> {
        try {
            const q = query(collection(db, "pokepastes"), orderBy("timestamp", "desc"), limit(limitCount));

            const querySnapshot = await getDocs(q);
            const pokepastes: PokePasteData[] = [];

            querySnapshot.forEach((doc) => {
                pokepastes.push({
                    ...(doc.data() as PokePasteData),
                    id: doc.id,
                });
            });

            return pokepastes;
        } catch (error) {
            console.error("Error fetching pokepastes:", error);
            throw new Error("Failed to fetch pokepastes");
        }
    }

    // 特定のユーザーのPokePasteを取得
    async getPokePastesByUser(userId: string, limitCount = 50): Promise<PokePasteData[]> {
        try {
            // まずuserIdでフィルタリングのみ行い、クライアントサイドでソート
            const q = query(collection(db, "pokepastes"), where("userId", "==", userId), limit(limitCount));

            const querySnapshot = await getDocs(q);
            const pokepastes: PokePasteData[] = [];

            querySnapshot.forEach((doc) => {
                pokepastes.push({
                    ...(doc.data() as PokePasteData),
                    id: doc.id,
                });
            });

            // クライアントサイドでタイムスタンプ順にソート
            pokepastes.sort((a, b) => b.timestamp - a.timestamp);

            // データが空の場合、開発環境ではダミーデータを返す
            if (pokepastes.length === 0 && import.meta.env.DEV) {
                console.log("No user pokepastes found, returning dummy data for development");
                return this.generateDummyData(userId);
            }

            return pokepastes;
        } catch (error) {
            console.error("Error fetching user pokepastes:", error);
            throw new Error("Failed to fetch user pokepastes");
        }
    }

    // 日付でフィルタリング（今日、今週、今月など） - ユーザー固有
    async getPokePastesByDateRange(userId: string, startTimestamp: number, endTimestamp: number): Promise<PokePasteData[]> {
        try {
            // まずuserIdでフィルタリング、日付範囲は取得後にクライアントサイドで処理
            const q = query(collection(db, "pokepastes"), where("userId", "==", userId));

            const querySnapshot = await getDocs(q);
            const pokepastes: PokePasteData[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data() as PokePasteData;
                // 日付範囲でフィルタリング
                if (data.timestamp >= startTimestamp && data.timestamp <= endTimestamp) {
                    pokepastes.push({
                        ...data,
                        id: doc.id,
                    });
                }
            });

            // クライアントサイドでタイムスタンプ順にソート
            pokepastes.sort((a, b) => b.timestamp - a.timestamp);

            return pokepastes;
        } catch (error) {
            console.error("Error fetching pokepastes by date range:", error);
            throw new Error("Failed to fetch pokepastes by date range");
        }
    }

    // PokePasteの評価を更新
    async updatePokePasteRating(id: string, rating: number): Promise<void> {
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            const docRef = doc(db, "pokepastes", id);
            await updateDoc(docRef, { rating: rating });
            console.log("Rating updated successfully:", id, rating);
        } catch (error) {
            console.error("Error updating rating:", error);
            throw new Error("Failed to update rating");
        }
    }

    // PokePasteを削除
    async deletePokePaste(id: string): Promise<void> {
        try {
            const docRef = doc(db, "pokepastes", id);
            await deleteDoc(docRef);
            console.log("Document successfully deleted:", id);
        } catch (error) {
            console.error("Error deleting document:", error);
            throw new Error("Failed to delete PokePaste");
        }
    }

    // PokePasteを手動でインポート
    async importPokePastes(urls: string[], userId: string): Promise<{ success: number; failed: number; errors: string[] }> {
        const { addDoc, collection } = await import("firebase/firestore");
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const url of urls) {
            try {
                const trimmedUrl = url.trim();
                if (!trimmedUrl) continue;

                // URLの妥当性チェック
                if (!trimmedUrl.includes("pokepast.es")) {
                    errors.push(`無効なURL: ${trimmedUrl} (pokepast.esのURLではありません)`);
                    failed++;
                    continue;
                }

                // 重複チェック
                const duplicateQuery = query(collection(db, "pokepastes"), where("url", "==", trimmedUrl), where("userId", "==", userId));
                const duplicateSnapshot = await getDocs(duplicateQuery);

                if (!duplicateSnapshot.empty) {
                    errors.push(`重複URL: ${trimmedUrl} (既に登録済み)`);
                    failed++;
                    continue;
                }

                // PokePasteデータを作成
                // URLからIDを抽出してタイトルに使用
                const urlMatch = trimmedUrl.match(/pokepast\.es\/([^/]+)/);
                const pasteId = urlMatch ? urlMatch[1] : "unknown";
                let title = `PokePaste ${pasteId}`;
                let author: string | null = null;
                const pokemonNames: string[] = [];
                const pokemonTeam: PokemonData[] = [];

                // CORSプロキシを使用してPokePasteページを取得
                try {
                    console.log("Fetching PokePaste from:", trimmedUrl);
                    // CORSプロキシを使用（allOrigins.win は無料のCORSプロキシサービス）
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmedUrl)}`;
                    const response = await fetch(proxyUrl);
                    console.log("Fetch response status:", response.status, response.ok);

                    if (response.ok) {
                        const html = await response.text();
                        console.log("HTML received, length:", html.length);
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, "text/html");

                        // タイトルを抽出
                        const titleElement = doc.querySelector("aside h1");
                        console.log("Title element:", titleElement);
                        if (titleElement?.textContent) {
                            title = titleElement.textContent.trim();
                            console.log("Extracted title:", title);
                        }

                        // 作者を抽出
                        const authorElement = doc.querySelector("aside h2");
                        console.log("Author element:", authorElement);
                        if (authorElement?.textContent) {
                            const match = authorElement.textContent.match(/by\s+(.+)/i);
                            if (match) {
                                author = match[1].trim();
                                console.log("Extracted author:", author);
                            }
                        }

                        // 各ポケモンの詳細情報を抽出
                        const articles = doc.querySelectorAll("article pre");
                        console.log("Found articles:", articles.length);
                        articles.forEach((article, index) => {
                            if (article.textContent) {
                                const articleText = article.textContent;
                                console.log(`Article ${index + 1} text:`, articleText.substring(0, 100));

                                const pokemonData = this.parsePokemonData(articleText);

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
                        console.log("Final pokemon names:", pokemonNames);
                        console.log("Final pokemon team:", pokemonTeam);
                    } else {
                        console.warn("Fetch failed with status:", response.status);
                    }
                } catch (fetchError) {
                    console.error("Failed to fetch PokePaste details:", fetchError);
                    console.error("Error details:", fetchError instanceof Error ? fetchError.message : fetchError);
                }

                const newPokePaste: Partial<PokePasteData> = {
                    url: trimmedUrl,
                    title: title,
                    timestamp: Date.now(),
                    userId: userId,
                    pokemonNames: pokemonNames,
                    pokemonTeam: pokemonTeam,
                    rating: 0,
                };

                // authorがnullでない場合のみ追加
                if (author) {
                    newPokePaste.author = author;
                }

                // Firestoreに保存
                await addDoc(collection(db, "pokepastes"), newPokePaste);
                success++;
            } catch (error) {
                console.error("Error importing PokePaste:", error);
                errors.push(`エラー: ${url} - ${error instanceof Error ? error.message : "不明なエラー"}`);
                failed++;
            }
        }

        return { success, failed, errors };
    }

    // 各ポケモンの詳細情報をパースする関数（拡張機能と同じロジック）
    private parsePokemonData(articleText: string): PokemonData | null {
        const pokemon: PokemonData = {
            nickname: null,
            species: "",
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
                pokemon.evs = this.parseStats(evString);
            }
            // 個体値
            else if (line.startsWith("IVs:")) {
                const ivString = line.substring(4).trim();
                pokemon.ivs = this.parseStats(ivString);
            }
            // 技
            else if (line.match(/^[-\u2022]\s*/)) {
                const move = line.replace(/^[-\u2022]\s*/, "").trim();
                if (move && pokemon.moves.length < 4) {
                    pokemon.moves.push(move);
                }
            }
        }

        return pokemon.species ? pokemon : null;
    }

    // EVs/IVsの文字列をパースする関数（拡張機能と同じロジック）
    private parseStats(statsString: string): Record<string, number> {
        const stats: Record<string, number> = {};
        const statMap: Record<string, string> = {
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
}

export const pokePasteService = new PokePasteService();
