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
        <div className="header-content-single-row">
          <div className="header-logo">
            <img src={mausIcon} alt="Maus Hub" className="header-icon" />
            <h1>Maus Hub</h1>
          </div>
          
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
          
          <div className="header-controls">
            <ThemeToggle />
            <UserProfile />
          </div>
        </div>
      </header>

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

    </div>
  )
}

export default App
