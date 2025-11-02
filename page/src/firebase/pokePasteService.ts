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
                const newPokePaste = {
                    url: trimmedUrl,
                    title: `Manual Import - ${new Date().toLocaleString()}`,
                    timestamp: Date.now(),
                    userId: userId,
                    author: undefined,
                    pokemonNames: [],
                    rating: 0,
                };

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
}

export const pokePasteService = new PokePasteService();
