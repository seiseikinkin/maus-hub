import { collection, getDocs, query, orderBy, limit, where, doc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "./config";

// リプレイデータの型定義
export interface ReplayData {
    id: string;
    url: string;
    players: string[];
    rating?: number;
    battleDate?: string;
    format: string;
    teams: Record<string, string[]>;
    selectedPokemon: Record<string, string[]>; // 選出されたポケモン（プレイヤー名 -> ポケモン名の配列）
    battleLog: string;
    timestamp: number;
    userId: string;
    createdAt: number;
    totalTurns?: number;
    battleStartTime?: string;
}

// Firestore リプレイサービス
export class ReplayService {
    // リプレイの日付でソートするヘルパー関数
    private sortByBattleDate(replays: ReplayData[]): ReplayData[] {
        return replays.sort((a, b) => {
            // 優先順位: battleStartTime > battleDate > timestamp
            let dateA: number;
            let dateB: number;

            if (a.battleStartTime) {
                dateA = new Date(a.battleStartTime).getTime();
            } else if (a.battleDate) {
                dateA = new Date(a.battleDate).getTime();
            } else {
                dateA = a.timestamp;
            }

            if (b.battleStartTime) {
                dateB = new Date(b.battleStartTime).getTime();
            } else if (b.battleDate) {
                dateB = new Date(b.battleDate).getTime();
            } else {
                dateB = b.timestamp;
            }

            // 昇順（古い日付が上）
            return dateA - dateB;
        });
    }

    // バトルログから選出されたポケモンを抽出する関数
    private extractSelectedPokemon(battleLog: string, players: string[]): Record<string, string[]> {
        const selectedPokemon: Record<string, string[]> = {};

        // プレイヤー名で初期化
        players.forEach((player) => {
            selectedPokemon[player] = [];
        });

        if (!battleLog) return selectedPokemon;

        const logLines = battleLog.split("\n");
        const switchedPokemon: Record<string, Set<string>> = {
            p1: new Set(),
            p2: new Set(),
        };

        // |switch|エントリを探して選出ポケモンを抽出
        for (const line of logLines) {
            if (line.startsWith("|switch|")) {
                const parts = line.split("|");
                if (parts.length >= 3) {
                    const playerSlot = parts[2]; // p1a: Torkoal など
                    const pokemonInfo = parts[3]; // Torkoal, L50, M など

                    if (playerSlot && pokemonInfo) {
                        // プレイヤー側を判定 (p1a, p1b -> p1, p2a, p2b -> p2)
                        const side = playerSlot.startsWith("p1") ? "p1" : "p2";

                        // ポケモン名を抽出（カンマより前の部分）
                        const pokemonName = pokemonInfo.split(",")[0].trim();

                        if (pokemonName) {
                            switchedPokemon[side].add(pokemonName);
                        }
                    }
                }
            }
        }

        // プレイヤー名と選出ポケモンをマッピング
        if (players.length >= 2) {
            selectedPokemon[players[0]] = Array.from(switchedPokemon.p1);
            selectedPokemon[players[1]] = Array.from(switchedPokemon.p2);
        }

        return selectedPokemon;
    }

    // テスト用のダミーデータを生成
    private generateDummyData(userId: string): ReplayData[] {
        return [
            {
                id: "dummy-replay-1",
                url: "https://replay.pokemonshowdown.com/gen9vgc2025reghbo3-2442767103-e5pdknmpdlje4kedj54lwm619nl63i9pw",
                players: ["TrainerAlice", "TrainerBob"],
                rating: 1200,
                battleDate: "Tue Oct 15 2024",
                format: "[Gen 9] VGC 2025 Reg H (Bo3)",
                teams: {
                    TrainerAlice: ["Rillaboom", "Incineroar", "Dragapult", "Grimmsnarl", "Urshifu", "Regieleki"],
                    TrainerBob: ["Charizard", "Venusaur", "Blastoise", "Pikachu", "Snorlax", "Gengar"],
                },
                selectedPokemon: {
                    TrainerAlice: ["Rillaboom", "Incineroar", "Dragapult", "Grimmsnarl"],
                    TrainerBob: ["Charizard", "Venusaur", "Blastoise", "Pikachu"],
                },
                battleLog: "Sample battle log for replay 1...",
                timestamp: Date.now() - 86400000, // 1日前
                userId: userId,
                createdAt: Date.now() - 86400000,
            },
            {
                id: "dummy-replay-2",
                url: "https://replay.pokemonshowdown.com/gen9vgc2025reghbo3-2442764745-ve2iefu910kkx5bno4s69s0eiqbs9d6pw",
                players: ["TrainerCharlie", "TrainerDave"],
                rating: 1350,
                battleDate: "Mon Oct 14 2024",
                format: "[Gen 9] VGC 2025 Reg H (Bo3)",
                teams: {
                    TrainerCharlie: ["Landorus-Therian", "Tornadus", "Thundurus", "Enamorus", "Urshifu-Rapid-Strike", "Calyrex-Shadow"],
                    TrainerDave: ["Dialga", "Palkia", "Giratina", "Arceus", "Mewtwo", "Rayquaza"],
                },
                selectedPokemon: {
                    TrainerCharlie: ["Landorus-Therian", "Tornadus", "Thundurus", "Enamorus"],
                    TrainerDave: ["Dialga", "Palkia", "Giratina", "Arceus"],
                },
                battleLog: "Sample battle log for replay 2...",
                timestamp: Date.now() - 172800000, // 2日前
                userId: userId,
                createdAt: Date.now() - 172800000,
            },
        ];
    }

    // 全てのリプレイを取得（最新順）
    async getAllReplays(limitCount = 50): Promise<ReplayData[]> {
        try {
            const q = query(collection(db, "replays"), orderBy("timestamp", "desc"), limit(limitCount));

            const querySnapshot = await getDocs(q);
            const replays: ReplayData[] = [];

            querySnapshot.forEach((doc) => {
                replays.push({
                    ...(doc.data() as ReplayData),
                    id: doc.id,
                });
            });

            return replays;
        } catch (error) {
            console.error("Error fetching replays:", error);
            throw new Error("Failed to fetch replays");
        }
    }

    // 特定のユーザーのリプレイを取得
    async getReplaysByUser(userId: string, limitCount = 50): Promise<ReplayData[]> {
        try {
            const q = query(collection(db, "replays"), where("userId", "==", userId), limit(limitCount));

            const querySnapshot = await getDocs(q);
            const replays: ReplayData[] = [];

            querySnapshot.forEach((doc) => {
                replays.push({
                    ...(doc.data() as ReplayData),
                    id: doc.id,
                });
            });

            // クライアントサイドでバトル日付順にソート
            const sortedReplays = this.sortByBattleDate(replays);

            // データが空の場合、開発環境ではダミーデータを返す
            if (sortedReplays.length === 0 && import.meta.env.DEV) {
                console.log("No user replays found, returning dummy data for development");
                return this.generateDummyData(userId);
            }

            return sortedReplays;
        } catch (error) {
            console.error("Error fetching user replays:", error);
            throw new Error("Failed to fetch user replays");
        }
    }

    // プレイヤー名でフィルタリング
    async getReplaysByPlayer(playerName: string, limitCount = 50): Promise<ReplayData[]> {
        try {
            const q = query(collection(db, "replays"), limit(limitCount));
            const querySnapshot = await getDocs(q);
            const replays: ReplayData[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data() as ReplayData;
                // プレイヤー名でフィルタリング
                if (data.players && data.players.some((player) => player.toLowerCase().includes(playerName.toLowerCase()))) {
                    replays.push({
                        ...data,
                        id: doc.id,
                    });
                }
            });

            // クライアントサイドでバトル日付順にソート
            const sortedReplays = this.sortByBattleDate(replays);

            return sortedReplays;
        } catch (error) {
            console.error("Error fetching replays by player:", error);
            throw new Error("Failed to fetch replays by player");
        }
    }

    // フォーマットでフィルタリング
    async getReplaysByFormat(format: string, limitCount = 50): Promise<ReplayData[]> {
        try {
            const q = query(collection(db, "replays"), where("format", "==", format), limit(limitCount));

            const querySnapshot = await getDocs(q);
            const replays: ReplayData[] = [];

            querySnapshot.forEach((doc) => {
                replays.push({
                    ...(doc.data() as ReplayData),
                    id: doc.id,
                });
            });

            // クライアントサイドでバトル日付順にソート
            const sortedReplays = this.sortByBattleDate(replays);

            return sortedReplays;
        } catch (error) {
            console.error("Error fetching replays by format:", error);
            throw new Error("Failed to fetch replays by format");
        }
    }

    // 日付でフィルタリング
    async getReplaysByDateRange(userId: string, startTimestamp: number, endTimestamp: number): Promise<ReplayData[]> {
        try {
            const q = query(collection(db, "replays"), where("userId", "==", userId));

            const querySnapshot = await getDocs(q);
            const replays: ReplayData[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data() as ReplayData;
                // 日付範囲でフィルタリング
                if (data.timestamp >= startTimestamp && data.timestamp <= endTimestamp) {
                    replays.push({
                        ...data,
                        id: doc.id,
                    });
                }
            });

            // クライアントサイドでタイムスタンプ順にソート
            replays.sort((a, b) => b.timestamp - a.timestamp);

            return replays;
        } catch (error) {
            console.error("Error fetching replays by date range:", error);
            throw new Error("Failed to fetch replays by date range");
        }
    }

    // リプレイを追加
    async addReplay(replayData: Omit<ReplayData, "id" | "userId">, userId: string): Promise<string> {
        try {
            // バトルログから選出ポケモンを抽出
            const selectedPokemon = this.extractSelectedPokemon(replayData.battleLog, replayData.players);

            const replayWithUser = {
                ...replayData,
                selectedPokemon, // 選出ポケモンを追加
                userId,
                timestamp: Date.now(),
                createdAt: Date.now(),
            };

            const docRef = await addDoc(collection(db, "replays"), replayWithUser);
            console.log("Replay successfully added:", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error adding replay:", error);
            throw new Error("Failed to add replay");
        }
    }

    // リプレイを削除
    async deleteReplay(id: string): Promise<void> {
        try {
            const docRef = doc(db, "replays", id);
            await deleteDoc(docRef);
            console.log("Replay successfully deleted:", id);
        } catch (error) {
            console.error("Error deleting replay:", error);
            throw new Error("Failed to delete replay");
        }
    }
}

export const replayService = new ReplayService();
