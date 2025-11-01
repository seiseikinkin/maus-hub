#!/bin/bash

# Firebase Google ログイン設定チェックスクリプト

echo "🔍 Firebase Google ログイン設定状況チェック"
echo "=============================================="

# 1. 環境変数チェック
echo "📝 1. 環境変数設定チェック"
if [ -f ".env" ]; then
    echo "✅ .env ファイルが存在します"
    
    # 各設定値をチェック
    if grep -q "VITE_FIREBASE_API_KEY=your-api-key-here" .env; then
        echo "❌ VITE_FIREBASE_API_KEY が未設定です"
    else
        echo "✅ VITE_FIREBASE_API_KEY が設定されています"
    fi
    
    if grep -q "VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com" .env; then
        echo "❌ VITE_FIREBASE_AUTH_DOMAIN が未設定です"
    else
        echo "✅ VITE_FIREBASE_AUTH_DOMAIN が設定されています"
    fi
    
    if grep -q "VITE_FIREBASE_PROJECT_ID=your-project-id" .env; then
        echo "❌ VITE_FIREBASE_PROJECT_ID が未設定です"
    else
        echo "✅ VITE_FIREBASE_PROJECT_ID が設定されています"
    fi
    
else
    echo "❌ .env ファイルが見つかりません"
fi

echo ""

# 2. 必要なファイルチェック
echo "📂 2. 必要なファイル構成チェック"

files=(
    "src/firebase/config.ts"
    "src/firebase/authService.ts"
    "src/config/allowedUsers.ts"
    "src/components/LoginComponent.tsx"
    "src/firebase/firestore.rules"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file が存在します"
    else
        echo "❌ $file が見つかりません"
    fi
done

echo ""

# 3. package.json の dependencies チェック
echo "📦 3. Firebase SDK 依存関係チェック"
if [ -f "package.json" ]; then
    if grep -q "\"firebase\":" package.json; then
        echo "✅ Firebase SDK がインストールされています"
        firebase_version=$(grep "\"firebase\":" package.json | cut -d'"' -f4)
        echo "   バージョン: $firebase_version"
    else
        echo "❌ Firebase SDK がインストールされていません"
        echo "   実行してください: npm install firebase"
    fi
else
    echo "❌ package.json が見つかりません"
fi

echo ""

# 4. manifest.json チェック
echo "🔧 4. Chrome拡張 manifest.json チェック"
if [ -f "public/manifest.json" ]; then
    echo "✅ manifest.json が存在します"
    
    if grep -q "identity" public/manifest.json; then
        echo "✅ identity 権限が設定されています"
    else
        echo "⚠️  identity 権限が設定されていません（Google認証に必要）"
    fi
    
    if grep -q "firebaseapp.com" public/manifest.json; then
        echo "✅ Firebase 関連の host_permissions が設定されています"
    else
        echo "⚠️  Firebase 関連の host_permissions が不足している可能性があります"
    fi
else
    echo "❌ public/manifest.json が見つかりません"
fi

echo ""

# 5. ビルド状況チェック
echo "🔨 5. ビルド状況チェック"
if [ -d "dist" ]; then
    echo "✅ dist フォルダが存在します（ビルド済み）"
    
    if [ -f "dist/popup.js" ]; then
        echo "✅ popup.js がビルドされています"
    else
        echo "❌ popup.js がビルドされていません"
    fi
    
    if [ -f "dist/background.js" ]; then
        echo "✅ background.js がビルドされています"
    else
        echo "❌ background.js がビルドされていません"
    fi
else
    echo "❌ dist フォルダが存在しません"
    echo "   実行してください: npm run build"
fi

echo ""
echo "=============================================="

# 未設定項目の要約
echo "📋 次に必要なアクション:"
echo ""

if grep -q "your-api-key-here" .env 2>/dev/null; then
    echo "1. ✋ Firebase Console でプロジェクトを作成"
    echo "2. ✋ Firebase 設定値を .env ファイルに設定"
fi

echo "3. ✋ Firebase Console で Authentication (Google) を有効化"
echo "4. ✋ Firestore Database を作成してセキュリティルールを設定"
echo "5. ✋ Firestore に許可ユーザーリスト (config/allowedUsers) を作成"

if [ ! -d "dist" ]; then
    echo "6. ✋ プロジェクトをビルド: npm run build"
fi

echo "7. ✋ Chrome拡張として dist フォルダを読み込み"
echo ""
echo "詳細手順: FIREBASE_GOOGLE_LOGIN_SETUP.md を参照してください"