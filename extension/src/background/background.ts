// Chrome拡張のバックグラウンドスクリプト
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyBv5r-nE0C5yEo9ZTCa2PaS-A5q4x8XXXX",
    authDomain: "sample-9dde3.firebaseapp.com",
    projectId: "sample-9dde3",
    storageBucket: "sample-9dde3.firebasestorage.app",
    messagingSenderId: "434283491779",
    appId: "1:434283491779:web:56a18cfeb70f89e2a2cd76",
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let isInitialized = false;

// 現在のユーザーを取得
async function getCurrentUser() {
    try {
        const result = await chrome.storage.local.get(["currentUser", "isAuthenticated"]);
        if (result.currentUser && result.isAuthenticated) {
            return result.currentUser;
        }
        return null;
    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
}

// 拡張機能の初期化
function initializeExtension() {
    if (isInitialized) return;
    isInitialized = true;
}

// 拡張機能がインストールされたときの処理
chrome.runtime.onInstalled.addListener(() => {
    initializeExtension();
});

// 未処理のPromise拒否をキャッチ
self.addEventListener("unhandledrejection", (event) => {
    console.warn("Unhandled promise rejection:", event.reason);
    event.preventDefault();
});

interface PokePasteItem {
    url: string;
    title: string;
    timestamp: number;
    id: string;
    author?: string;
    pokemonNames?: string[];
}

interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: number;
    lastLoginAt: number;
}

interface ExtensionMessage {
    action?: string;
    type?: string;
    user?: UserProfile;
    error?: string;
    data?: ReplayData;
}

interface ReplayData {
    url: string;
    players: string[];
    rating?: number;
    battleDate?: string;
    format: string;
    teams: Record<string, string[]>;
    selectedPokemon?: Record<string, string[]>;
    battleLog: string;
    timestamp: number;
    totalTurns?: number;
    battleStartTime?: string;
}

// 認証成功時の処理
async function handleAuthSuccess(user: UserProfile, sendResponse: (response?: unknown) => void) {
    console.log("handleAuthSuccess called with user:", user);
    try {
        const userProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
            photoURL: user.photoURL,
            createdAt: user.createdAt || Date.now(),
            lastLoginAt: user.lastLoginAt || Date.now(),
        };

        console.log("Saving user profile to storage:", userProfile);

        // Chrome拡張機能のストレージに保存
        await chrome.storage.local.set({
            currentUser: userProfile,
            isAuthenticated: true,
        });

        // 保存確認
        const result = await chrome.storage.local.get(["currentUser", "isAuthenticated"]);
        console.log("Storage verification:", result);

        // Firebase認証状態を確認・設定
        try {
            if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
                console.log("Firebase auth user mismatch or missing, attempting to set auth state");
                // カスタムトークンまたは適切な認証方法でFirebaseにサインイン
                // 一時的にダミーのFirebase認証をセット（実際の実装では適切なトークンを使用）
            }
        } catch (authError) {
            console.warn("Firebase auth setup failed:", authError);
        }

        console.log("Authentication successful, user profile saved:", userProfile);
        sendResponse({ success: true, user: userProfile });
    } catch (error) {
        console.error("Error handling auth success:", error);
        sendResponse({ success: false, error: "認証の処理中にエラーが発生しました" });
    }
}

// メッセージを受信したときの処理
chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    console.log("Background received message:", request, "from:", sender);

    // 初期化されていない場合は初期化を実行
    if (!isInitialized) {
        initializeExtension();
    }

    try {
        // 認証メッセージの場合
        if (request && request.type === "AUTH_SUCCESS" && request.user) {
            console.log("Processing AUTH_SUCCESS message:", request.user);
            handleAuthSuccess(request.user, sendResponse);
            return true;
        }

        if (request && request.type === "AUTH_ERROR") {
            console.error("Authentication error:", request.error);
            sendResponse({ success: false, error: request.error });
            return true;
        }

        if (!request || typeof request.action !== "string") {
            sendResponse({
                success: false,
                error: "不正なリクエスト形式です",
            });
            return false;
        }

        if (request.action === "addPokePaste") {
            handleAddPokePaste(sendResponse);
            return true; // 非同期レスポンスを示す
        }

        if (request.action === "getPokePasteList") {
            handleGetPokePasteList(sendResponse);
            return true; // 非同期レスポンスを示す
        }

        if (request.action === "saveReplay" && request.data) {
            handleSaveReplay(request as { data: ReplayData }, sendResponse);
            return true; // 非同期レスポンスを示す
        }

        if (request.action === "ping") {
            sendResponse({
                success: true,
                message: "pong",
                initialized: isInitialized,
                timestamp: new Date().toISOString(),
            });
            return false;
        }

        // その他のアクション
        sendResponse({
            success: false,
            error: `未知のアクション: ${request.action}`,
        });
        return false;
    } catch (error) {
        sendResponse({
            success: false,
            error: `メッセージリスナーエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        });
        return false;
    }
}); // PokePaste URL追加の処理
async function handleAddPokePaste(sendResponse: (response?: unknown) => void) {
    try {
        // アクティブなタブの情報を取得
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        const activeTab = tabs[0];

        if (!activeTab || !activeTab.url) {
            sendResponse({
                success: false,
                error: "Could not access the current tab",
            });
            return;
        }

        if (!activeTab.url.includes("pokepast.es")) {
            sendResponse({
                success: false,
                error: "This extension only works on pokepast.es URLs",
                currentUrl: activeTab.url,
            });
            return;
        }

        // Firebase Authenticationからユーザーを取得
        if (!auth.currentUser) {
            // Chrome拡張機能のストレージからユーザー情報を取得してFirebase Authに復元
            const storedUser = await getCurrentUser();
            if (!storedUser) {
                sendResponse({
                    success: false,
                    error: "User not authenticated. Please login first.",
                });
                return;
            }

            // カスタムトークンを使用してFirebase Authにサインイン
            // 注意: 本番環境では、サーバーサイドでカスタムトークンを生成する必要があります
            try {
                // ここでは、ユーザーIDをそのまま使用（開発用）
                // 本番環境では適切なカスタムトークン認証を実装してください
                console.log("Firebase Auth user not found, using stored user:", storedUser.uid);
            } catch (error) {
                console.error("Firebase Auth error:", error);
                sendResponse({
                    success: false,
                    error: "Authentication error. Please login again.",
                });
                return;
            }
        }

        const currentUser = await getCurrentUser();
        if (!currentUser) {
            sendResponse({
                success: false,
                error: "User not authenticated. Please login first.",
            });
            return;
        }

        // コンテンツスクリプトからPokePaste情報を取得
        let pokePasteInfo = { author: null, pokemonNames: [] };
        try {
            console.log("Sending message to content script...");
            const response = await chrome.tabs.sendMessage(activeTab.id!, { action: "extractPokePasteInfo" });
            console.log("Content script response:", response);

            if (response) {
                pokePasteInfo = response;
                console.log("Extracted PokePaste info:", pokePasteInfo);
                console.log("Author:", pokePasteInfo.author);
                console.log("Pokemon count:", pokePasteInfo.pokemonNames?.length || 0);

                // ハイフンを含むポケモン名のデバッグ情報
                if (pokePasteInfo.pokemonNames && pokePasteInfo.pokemonNames.length > 0) {
                    pokePasteInfo.pokemonNames.forEach((name: string, index: number) => {
                        console.log(`Pokemon ${index + 1}: "${name}" (contains hyphen: ${name.includes("-")})`);
                    });
                } else {
                    console.warn("No Pokemon names extracted!");
                }
            } else {
                console.warn("No response from content script");
            }
        } catch (error) {
            console.error("Error communicating with content script:", error);
            console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
        }

        // 新しいアイテムを作成
        const newItem = {
            url: activeTab.url,
            title: activeTab.title || "No title",
            timestamp: Date.now(),
            userId: currentUser.uid,
            author: pokePasteInfo.author,
            pokemonNames: pokePasteInfo.pokemonNames,
        };

        try {
            // Firestoreで重複チェック
            const pokepastesRef = collection(db, "pokepastes");
            const duplicateQuery = query(pokepastesRef, where("url", "==", newItem.url), where("userId", "==", currentUser.uid));
            const duplicateSnapshot = await getDocs(duplicateQuery);

            if (!duplicateSnapshot.empty) {
                sendResponse({
                    success: false,
                    error: "This URL is already saved",
                    url: newItem.url,
                });
                return;
            }

            // Firestoreに保存
            const docRef = await addDoc(pokepastesRef, newItem);
            console.log("Document written with ID: ", docRef.id);

            sendResponse({
                success: true,
                url: newItem.url,
                title: newItem.title,
                message: "URLをFirebaseに保存しました",
            });
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            sendResponse({
                success: false,
                error: "Failed to save URL to database",
            });
        }
    } catch (error) {
        sendResponse({
            success: false,
            error: `処理エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        });
    }
}

// 保存されたURL一覧取得の処理
async function handleGetPokePasteList(sendResponse: (response?: unknown) => void) {
    try {
        // 現在のユーザーを取得
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            sendResponse({
                success: false,
                error: "User not authenticated. Please login first.",
            });
            return;
        }

        // Firestoreからユーザーの保存URLを取得
        const pokepastesRef = collection(db, "pokepastes");
        const userQuery = query(pokepastesRef, where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));

        const querySnapshot = await getDocs(userQuery);
        const savedUrls: PokePasteItem[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            savedUrls.push({
                id: doc.id,
                url: data.url as string,
                title: data.title as string,
                timestamp: data.timestamp as number,
                author: (data.author as string) || undefined,
                pokemonNames: (data.pokemonNames as string[]) || undefined,
            });
        });

        sendResponse({
            success: true,
            data: savedUrls,
        });
    } catch (error) {
        console.error("Error getting PokePaste list from Firestore:", error);
        sendResponse({
            success: false,
            error: `取得エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        });
    }
}

// リプレイ保存処理
async function handleSaveReplay(request: { data: ReplayData }, sendResponse: (response?: unknown) => void) {
    try {
        console.log("handleSaveReplay called");

        if (!request.data) {
            console.error("No replay data provided");
            sendResponse({
                success: false,
                error: "リプレイデータが提供されていません",
            });
            return;
        }

        console.log("Replay data received:", request.data);

        // ストレージからユーザー情報を取得（Chrome拡張機能のメイン認証）
        const currentUser = await getCurrentUser();
        console.log("Storage current user:", currentUser);

        // Firebase認証状態も確認（補助的）
        await auth.authStateReady();
        const firebaseUser = auth.currentUser;
        console.log("Firebase current user after authStateReady:", firebaseUser);

        if (!currentUser) {
            console.error("User not authenticated - Storage user:", currentUser);
            sendResponse({
                success: false,
                error: "ユーザーが認証されていません。ログインしてください。",
            });
            return;
        }

        // Firebase認証が無い場合は警告のみ（処理は続行）
        if (!firebaseUser) {
            console.warn("Firebase auth not available, but proceeding with storage auth");
        }

        const replayData = request.data;

        // リプレイ情報を作成
        const newReplay = {
            url: replayData.url,
            players: replayData.players,
            rating: replayData.rating,
            battleDate: replayData.battleDate,
            format: replayData.format,
            teams: replayData.teams,
            selectedPokemon: replayData.selectedPokemon || {},
            battleLog: replayData.battleLog,
            timestamp: replayData.timestamp,
            totalTurns: replayData.totalTurns,
            battleStartTime: replayData.battleStartTime,
            userId: currentUser.uid,
            createdAt: Date.now(),
        };

        try {
            console.log("Attempting to save replay to Firestore:", newReplay);
            console.log("Firebase auth state:", auth.currentUser?.uid, auth.currentUser?.email);

            // Firestoreで重複チェック
            const replaysRef = collection(db, "replays");
            console.log("Created replays collection reference");

            const duplicateQuery = query(replaysRef, where("url", "==", newReplay.url), where("userId", "==", currentUser.uid));
            console.log("Created duplicate query for userId:", currentUser.uid);

            const duplicateSnapshot = await getDocs(duplicateQuery);
            console.log("Duplicate check completed, empty:", duplicateSnapshot.empty);

            if (!duplicateSnapshot.empty) {
                console.log("Duplicate replay found");
                sendResponse({
                    success: false,
                    error: "このリプレイは既に保存されています",
                });
                return;
            }

            // Firestoreに保存
            console.log("Adding replay to Firestore...");
            const docRef = await addDoc(replaysRef, newReplay);
            console.log("Replay saved with ID: ", docRef.id);

            sendResponse({
                success: true,
                message: "リプレイをFirebaseに保存しました",
                replayId: docRef.id,
            });
        } catch (error) {
            console.error("Error saving replay to Firestore:", error);
            console.error("Error details:", error);
            sendResponse({
                success: false,
                error: `リプレイの保存に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
            });
        }
    } catch (error) {
        console.error("Error in handleSaveReplay:", error);
        sendResponse({
            success: false,
            error: `処理エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
        });
    }
}
