import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

// Firestoreから許可されたメールアドレスのリストを取得
const getAllowedEmailsFromFirestore = async (): Promise<string[]> => {
    try {
        const allowedUsersDoc = await getDoc(doc(db, "config", "allowedUsers"));

        if (allowedUsersDoc.exists()) {
            const data = allowedUsersDoc.data();
            if (data && Array.isArray(data.emails)) {
                return data.emails.map((email: string) => email.toLowerCase());
            }
        }

        console.warn("No allowed users configuration found in Firestore.");
        return [];
    } catch (error) {
        console.error("Error fetching allowed users from Firestore:", error);
        return [];
    }
};

// メールアドレスが許可されているかチェック（非同期）
export const isEmailAllowed = async (email: string): Promise<boolean> => {
    const allowedEmails = await getAllowedEmailsFromFirestore();

    if (allowedEmails.length === 0) {
        console.error("No allowed emails found in Firestore. Please configure allowed users in the Firestore console.");
        return false;
    }

    return allowedEmails.includes(email.toLowerCase());
};
