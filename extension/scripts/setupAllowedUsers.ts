// Firestore許可ユーザー設定用サンプルスクリプト
// Firebase Admin SDK を使用してサーバーサイドで実行してください

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin SDK の初期化
// サービスアカウントキーが必要です
const serviceAccount = require("./path/to/serviceAccountKey.json");

initializeApp({
    credential: cert(serviceAccount),
    projectId: "your-project-id",
});

const db = getFirestore();

// 許可ユーザーリストを設定する関数
async function setupAllowedUsers() {
    try {
        const allowedUsers = {
            emails: ["admin@yourcompany.com", "manager@yourcompany.com", "developer@yourcompany.com"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            description: "Chrome拡張ログイン許可ユーザーリスト",
        };

        await db.collection("config").doc("allowedUsers").set(allowedUsers);
        console.log("許可ユーザーリストを正常に設定しました");

        // 設定内容を確認
        const doc = await db.collection("config").doc("allowedUsers").get();
        console.log("設定内容:", doc.data());
    } catch (error) {
        console.error("エラー:", error);
    }
}

// ユーザーを追加する関数
async function addAllowedUser(email: string) {
    try {
        const docRef = db.collection("config").doc("allowedUsers");
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            if (data && Array.isArray(data.emails)) {
                if (!data.emails.includes(email.toLowerCase())) {
                    data.emails.push(email.toLowerCase());
                    data.updatedAt = new Date().toISOString();

                    await docRef.update(data);
                    console.log(`ユーザー ${email} を追加しました`);
                } else {
                    console.log(`ユーザー ${email} は既に存在します`);
                }
            }
        }
    } catch (error) {
        console.error("ユーザー追加エラー:", error);
    }
}

// ユーザーを削除する関数
async function removeAllowedUser(email: string) {
    try {
        const docRef = db.collection("config").doc("allowedUsers");
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            if (data && Array.isArray(data.emails)) {
                const index = data.emails.indexOf(email.toLowerCase());
                if (index > -1) {
                    data.emails.splice(index, 1);
                    data.updatedAt = new Date().toISOString();

                    await docRef.update(data);
                    console.log(`ユーザー ${email} を削除しました`);
                } else {
                    console.log(`ユーザー ${email} は見つかりませんでした`);
                }
            }
        }
    } catch (error) {
        console.error("ユーザー削除エラー:", error);
    }
}

// 使用例
// setupAllowedUsers();
// addAllowedUser('newuser@company.com');
// removeAllowedUser('olduser@company.com');
