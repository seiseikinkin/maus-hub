# Firebase Google ログイン設定チェックスクリプト (PowerShell)

Write-Host "🔍 Firebase Google ログイン設定状況チェック" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1. 環境変数チェック
Write-Host "`n📝 1. 環境変数設定チェック" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env ファイルが存在します" -ForegroundColor Green
    
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "VITE_FIREBASE_API_KEY=your-api-key-here") {
        Write-Host "❌ VITE_FIREBASE_API_KEY が未設定です" -ForegroundColor Red
    }
    else {
        Write-Host "✅ VITE_FIREBASE_API_KEY が設定されています" -ForegroundColor Green
    }
    
    if ($envContent -match "VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com") {
        Write-Host "❌ VITE_FIREBASE_AUTH_DOMAIN が未設定です" -ForegroundColor Red
    }
    else {
        Write-Host "✅ VITE_FIREBASE_AUTH_DOMAIN が設定されています" -ForegroundColor Green
    }
    
    if ($envContent -match "VITE_FIREBASE_PROJECT_ID=your-project-id") {
        Write-Host "❌ VITE_FIREBASE_PROJECT_ID が未設定です" -ForegroundColor Red
    }
    else {
        Write-Host "✅ VITE_FIREBASE_PROJECT_ID が設定されています" -ForegroundColor Green
    }
}
else {
    Write-Host "❌ .env ファイルが見つかりません" -ForegroundColor Red
}

# 2. 必要なファイルチェック
Write-Host "`n📂 2. 必要なファイル構成チェック" -ForegroundColor Yellow

$files = @(
    "src/firebase/config.ts",
    "src/firebase/authService.ts",
    "src/config/allowedUsers.ts",
    "src/components/LoginComponent.tsx",
    "src/firebase/firestore.rules"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file が存在します" -ForegroundColor Green
    }
    else {
        Write-Host "❌ $file が見つかりません" -ForegroundColor Red
    }
}

# 3. package.json の dependencies チェック
Write-Host "`n📦 3. Firebase SDK 依存関係チェック" -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageContent = Get-Content "package.json" -Raw
    if ($packageContent -match '"firebase":') {
        Write-Host "✅ Firebase SDK がインストールされています" -ForegroundColor Green
        $version = ($packageContent | Select-String '"firebase":\s*"([^"]+)"').Matches[0].Groups[1].Value
        Write-Host "   バージョン: $version" -ForegroundColor Gray
    }
    else {
        Write-Host "❌ Firebase SDK がインストールされていません" -ForegroundColor Red
        Write-Host "   実行してください: npm install firebase" -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ package.json が見つかりません" -ForegroundColor Red
}

# 4. manifest.json チェック
Write-Host "`n🔧 4. Chrome拡張 manifest.json チェック" -ForegroundColor Yellow
if (Test-Path "public/manifest.json") {
    Write-Host "✅ manifest.json が存在します" -ForegroundColor Green
    
    $manifestContent = Get-Content "public/manifest.json" -Raw
    
    if ($manifestContent -match '"identity"') {
        Write-Host "✅ identity 権限が設定されています" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  identity 権限が設定されていません（Google認証に必要）" -ForegroundColor Yellow
    }
    
    if ($manifestContent -match 'firebaseapp\.com') {
        Write-Host "✅ Firebase 関連の host_permissions が設定されています" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Firebase 関連の host_permissions が不足している可能性があります" -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ public/manifest.json が見つかりません" -ForegroundColor Red
}

# 5. ビルド状況チェック
Write-Host "`n🔨 5. ビルド状況チェック" -ForegroundColor Yellow
if (Test-Path "dist") {
    Write-Host "✅ dist フォルダが存在します（ビルド済み）" -ForegroundColor Green
    
    if (Test-Path "dist/popup.js") {
        Write-Host "✅ popup.js がビルドされています" -ForegroundColor Green
    }
    else {
        Write-Host "❌ popup.js がビルドされていません" -ForegroundColor Red
    }
    
    if (Test-Path "dist/background.js") {
        Write-Host "✅ background.js がビルドされています" -ForegroundColor Green
    }
    else {
        Write-Host "❌ background.js がビルドされていません" -ForegroundColor Red
    }
}
else {
    Write-Host "❌ dist フォルダが存在しません" -ForegroundColor Red
    Write-Host "   実行してください: npm run build" -ForegroundColor Yellow
}

Write-Host "`n===============================================" -ForegroundColor Cyan

# 未設定項目の要約
Write-Host "📋 次に必要なアクション:" -ForegroundColor Cyan
Write-Host ""

if ((Test-Path ".env") -and ((Get-Content ".env" -Raw) -match "your-api-key-here")) {
    Write-Host "1. ✋ Firebase Console でプロジェクトを作成" -ForegroundColor Magenta
    Write-Host "2. ✋ Firebase 設定値を .env ファイルに設定" -ForegroundColor Magenta
}

Write-Host "3. ✋ Firebase Console で Authentication (Google) を有効化" -ForegroundColor Magenta
Write-Host "4. ✋ Firestore Database を作成してセキュリティルールを設定" -ForegroundColor Magenta
Write-Host "5. ✋ Firestore に許可ユーザーリスト (config/allowedUsers) を作成" -ForegroundColor Magenta

if (-not (Test-Path "dist")) {
    Write-Host "6. ✋ プロジェクトをビルド: npm run build" -ForegroundColor Magenta
}

Write-Host "7. ✋ Chrome拡張として dist フォルダを読み込み" -ForegroundColor Magenta
Write-Host ""
Write-Host "詳細手順: FIREBASE_GOOGLE_LOGIN_SETUP.md を参照してください" -ForegroundColor Green