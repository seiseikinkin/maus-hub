import { useState } from 'react'
import { PokePasteList } from './components/PokePasteList'
import { ReplayList } from './components/ReplayList'
import SettingsPage from './components/SettingsPage'
import AnalysisPage from './components/AnalysisPage'
import { ThemeToggle } from './components/ThemeToggle'
import { ProtectedRoute } from './components/ProtectedRoute'
import { UserProfile } from './components/UserProfile'
import { useAuth } from './contexts/AuthContext'
import mausIcon from './assets/icon.png'
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
  const [activeTab, setActiveTab] = useState<'pokepaste' | 'replay' | 'analysis' | 'settings'>('pokepaste')
  
  // ログインユーザーのUIDを取得（自分のデータのみ表示）
  const currentUserUID = getUserUID()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <div className="header-logo">
              <img src={mausIcon} alt="Maus Hub" className="header-icon" />
              <h1>Maus Hub</h1>
            </div>
          </div>
          <div className="header-controls">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>
      </header>

      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'pokepaste' ? 'active' : ''}`}
          onClick={() => setActiveTab('pokepaste')}
        >
          📝 PokePaste
        </button>
        <button 
          className={`tab-button ${activeTab === 'replay' ? 'active' : ''}`}
          onClick={() => setActiveTab('replay')}
        >
          🎬 リプレイ
        </button>
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          📊 分析
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ 設定
        </button>
      </div>

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
              <p>📝 あなたが保存した{
                activeTab === 'pokepaste' ? 'PokePaste' : 
                activeTab === 'replay' ? 'リプレイ' : 
                activeTab === 'analysis' ? 'リプレイの分析データ' : 
                '設定'
              }のみが表示されます</p>
            </div>
          </div>
        )}
      </div>

      <main className="app-main">
        {activeTab === 'pokepaste' ? (
          <PokePasteList 
            filterUserId={currentUserUID || undefined}
            maxItems={100}
          />
        ) : activeTab === 'replay' ? (
          <ReplayList />
        ) : activeTab === 'analysis' ? (
          <AnalysisPage />
        ) : (
          <SettingsPage />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2024 Maus Hub</p>
      </footer>
    </div>
  )
}

export default App
