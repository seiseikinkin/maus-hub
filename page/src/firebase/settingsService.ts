import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

// ユーザー設定の型定義
export interface UserSettings {
    id: string;
    userId: string;
    playerNames: string[]; // 複数のプレーヤー名を配列で管理
    createdAt: number;
    updatedAt: number;
}

// ユーザー設定サービス
export class SettingsService {
    // ユーザー設定を取得
    async getUserSettings(userId: string): Promise<UserSettings | null> {
        try {
            const docRef = doc(db, "userSettings", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as UserSettings;
            } else {
                console.log("No user settings found");
                return null;
            }
        } catch (error) {
            console.error("Error fetching user settings:", error);
            throw new Error("Failed to fetch user settings");
        }
    }

    // ユーザー設定を保存・更新
    async saveUserSettings(userId: string, playerNames: string[]): Promise<void> {
        try {
            console.log("Attempting to save user settings for userId:", userId);
            const docRef = doc(db, "userSettings", userId);
            const now = Date.now();

            let existingSettings: UserSettings | null = null;
            try {
                existingSettings = await this.getUserSettings(userId);
            } catch (fetchError) {
                console.warn("Could not fetch existing settings, creating new:", fetchError);
            }

            // 空の文字列を除去し、重複を削除
            const cleanedPlayerNames = Array.from(new Set(playerNames.map((name) => name.trim()).filter((name) => name.length > 0)));

            const settings: UserSettings = {
                id: userId,
                userId: userId,
                playerNames: cleanedPlayerNames,
                createdAt: existingSettings?.createdAt || now,
                updatedAt: now,
            };

            console.log("Saving settings:", settings);
            await setDoc(docRef, settings);
            console.log("User settings saved successfully");
        } catch (error) {
            console.error("Error saving user settings:", error);

            if (error instanceof Error) {
                if (error.message.includes("permission-denied")) {
                    throw new Error("権限がありません。ログイン状態を確認してください。");
                } else if (error.message.includes("unavailable")) {
                    throw new Error("サービスが一時的に利用できません。しばらく後でお試しください。");
                } else {
                    throw new Error(`設定の保存に失敗しました: ${error.message}`);
                }
            } else {
                throw new Error("設定の保存に失敗しました: 不明なエラー");
            }
        }
    }

    // 後方互換性のために単一プレーヤー名での保存もサポート
    async saveUserSettingsLegacy(userId: string, playerName: string): Promise<void> {
        return this.saveUserSettings(userId, [playerName]);
    }

    // プレーヤー名を取得（後方互換性）
    getPlayerName(settings: UserSettings | null): string {
        if (!settings) return "";
        // 複数ある場合は最初の名前を返す
        return settings.playerNames?.[0] || "";
    }

    // 全てのプレーヤー名を取得
    getPlayerNames(settings: UserSettings | null): string[] {
        if (!settings) return [];
        return settings.playerNames || [];
    }
}

export const settingsService = new SettingsService();
