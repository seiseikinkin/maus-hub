import { collection, getDocs, query, orderBy, limit, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "./config";

// PokePasteデータの型定義
export interface PokePasteData {
    id: string;
    url: string;
    title: string;
    timestamp: number;
    userId: string;
    author?: string;
    pokemonNames?: string[];
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
            },
            {
                id: "dummy-2",
                url: "https://pokepast.es/example2",
                title: "Sample Team 2",
                timestamp: Date.now() - 172800000, // 2日前
                userId: userId,
                author: "TrainerBob",
                pokemonNames: ["Venusaur", "Alakazam", "Machamp"],
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
}

export const pokePasteService = new PokePasteService();
