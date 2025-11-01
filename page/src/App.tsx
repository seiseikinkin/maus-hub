import { useState } from 'react'
import { PokePasteList } from './components/PokePasteList'
import { ThemeToggle } from './components/ThemeToggle'
import { ProtectedRoute } from './components/ProtectedRoute'
import { UserProfile } from './components/UserProfile'
import { useAuth } from './contexts/AuthContext'
import './App.css'

function App() {
  return (
    <ProtectedRoute>
      <AuthenticatedApp />
    </ProtectedRoute>
  )
}

function AuthenticatedApp() {
  const { getUserUID } = useAuth()
  const [showFilters, setShowFilters] = useState(false)
  
  // ログインユーザーのUIDを取得（自分のデータのみ表示）
  const currentUserUID = getUserUID()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>🎮 PokePaste Hub</h1>
            <p>あなたのPokePasteコレクション</p>
          </div>
          <div className="header-controls">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="filters-section">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="toggle-filters-button"
        >
          {showFilters ? '🔽 フィルター を隠す' : '🔼 フィルター を表示'}
        </button>
        
        {showFilters && (
          <div className="filters">
            <div className="filter-info">
              <p>📝 あなたが保存したPokePasteのみが表示されます</p>
            </div>
          </div>
        )}
      </div>

      <main className="app-main">
        <PokePasteList 
          filterUserId={currentUserUID || undefined}
          maxItems={100}
        />
      </main>

      <footer className="app-footer">
        <p>© 2024 PokePaste Hub - Firebaseを使用したPokePasteデータ管理</p>
      </footer>
    </div>
  )
}

export default App
