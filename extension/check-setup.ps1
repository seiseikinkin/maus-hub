# Firebase Google Login Setup Check Script

Write-Host "Firebase Google Login Setup Status Check" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Environment Variables Check
Write-Host "`n1. Environment Variables Check" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "your-api-key-here") {
        Write-Host "❌ VITE_FIREBASE_API_KEY is not configured" -ForegroundColor Red
    }
    else {
        Write-Host "✅ VITE_FIREBASE_API_KEY is configured" -ForegroundColor Green
    }
    
    if ($envContent -match "your-project.firebaseapp.com") {
        Write-Host "❌ VITE_FIREBASE_AUTH_DOMAIN is not configured" -ForegroundColor Red
    }
    else {
        Write-Host "✅ VITE_FIREBASE_AUTH_DOMAIN is configured" -ForegroundColor Green
    }
}
else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

# 2. Required Files Check
Write-Host "`n2. Required Files Check" -ForegroundColor Yellow

$files = @(
    "src/firebase/config.ts",
    "src/firebase/authService.ts", 
    "src/config/allowedUsers.ts",
    "src/components/LoginComponent.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    }
    else {
        Write-Host "❌ $file not found" -ForegroundColor Red
    }
}

# 3. Firebase SDK Check
Write-Host "`n3. Firebase SDK Check" -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageContent = Get-Content "package.json" -Raw
    if ($packageContent -match '"firebase"') {
        Write-Host "✅ Firebase SDK is installed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Firebase SDK is not installed" -ForegroundColor Red
        Write-Host "   Run: npm install firebase" -ForegroundColor Yellow
    }
}
else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
}

# 4. Build Status Check
Write-Host "`n4. Build Status Check" -ForegroundColor Yellow
if (Test-Path "dist") {
    Write-Host "✅ dist folder exists (built)" -ForegroundColor Green
}
else {
    Write-Host "❌ dist folder does not exist" -ForegroundColor Red
    Write-Host "   Run: npm run build" -ForegroundColor Yellow
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Next Actions Required:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create Firebase project in Firebase Console" -ForegroundColor Magenta
Write-Host "2. Configure Firebase settings in .env file" -ForegroundColor Magenta  
Write-Host "3. Enable Authentication (Google) in Firebase Console" -ForegroundColor Magenta
Write-Host "4. Create Firestore Database and set security rules" -ForegroundColor Magenta
Write-Host "5. Create allowed users list in Firestore" -ForegroundColor Magenta
Write-Host "6. Build project: npm run build" -ForegroundColor Magenta
Write-Host "7. Load Chrome extension from dist folder" -ForegroundColor Magenta
Write-Host ""
Write-Host "See FIREBASE_GOOGLE_LOGIN_SETUP.md for detailed instructions" -ForegroundColor Green