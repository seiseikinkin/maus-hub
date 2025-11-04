import { doc, getDoc } from "firebase/firestore";
import { db } from "./config";

export interface AllowedUsersConfig {
    emails: string[];
    lastUpdated?: number;
}

export class AllowedUsersService {
    private static readonly CONFIG_PATH = "config/allowedUsers";
    private cachedEmails: string[] | null = null;
    private cacheExpiry: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

    /**
     * Firestoreから許可されたメールアドレスリストを取得
     */
    async getAllowedEmails(): Promise<string[]> {
        try {
            // キャッシュが有効な場合はキャッシュを返す
            if (this.cachedEmails && Date.now() < this.cacheExpiry) {
                return this.cachedEmails;
            }

            const configDoc = await getDoc(doc(db, AllowedUsersService.CONFIG_PATH));

            if (!configDoc.exists()) {
                console.warn("Allowed users config not found. Creating default config.");
                // デフォルト設定（空のリスト）を返す
                this.cachedEmails = [];
                this.cacheExpiry = Date.now() + this.CACHE_DURATION;
                return this.cachedEmails;
            }

            const data = configDoc.data() as AllowedUsersConfig;
            const emails = data.emails || [];

            // キャッシュを更新
            this.cachedEmails = emails;
            this.cacheExpiry = Date.now() + this.CACHE_DURATION;

            if (import.meta.env.DEV) {
                console.log(`Loaded ${emails.length} allowed email addresses`);
            }
            return emails;
        } catch (error) {
            console.error("Error fetching allowed emails:", error);
            // エラー時は空のリストを返す（アクセス拒否）
            return [];
        }
    }

    /**
     * 指定されたメールアドレスが許可リストに含まれているかチェック
     */
    async isEmailAllowed(email: string): Promise<boolean> {
        if (!email) {
            console.error("isEmailAllowed: email is empty or null");
            return false;
        }

        try {
            if (import.meta.env.DEV) {
                console.log("Checking if email is allowed");
            }

            const allowedEmails = await this.getAllowedEmails();

            if (import.meta.env.DEV) {
                console.log("Allowed emails count:", allowedEmails.length);
            }

            // 大文字小文字を区別しない比較
            const normalizedEmail = email.toLowerCase().trim();
            const isAllowed = allowedEmails.some((allowedEmail) => allowedEmail.toLowerCase().trim() === normalizedEmail);

            if (import.meta.env.DEV) {
                console.log(`Email is ${isAllowed ? "allowed" : "NOT allowed"}`);
            }

            return isAllowed;
        } catch (error) {
            console.error("Error in isEmailAllowed:", error);
            // エラー時は安全側に倒してfalseを返す
            return false;
        }
    }

    /**
     * キャッシュをクリア（強制的に再読み込みしたい場合）
     */
    clearCache(): void {
        this.cachedEmails = null;
        this.cacheExpiry = 0;
    }

    /**
     * 開発環境用：許可されたメールアドレスのリストを表示
     */
    async debugAllowedEmails(): Promise<void> {
        if (import.meta.env.DEV) {
            const emails = await this.getAllowedEmails();
            console.log("Allowed emails count:", emails.length);
        }
    }
}

export const allowedUsersService = new AllowedUsersService();
