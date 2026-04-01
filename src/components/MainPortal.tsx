import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDriveSync } from '../hooks/useDriveSync';
import guestUserIcon from '../assets/guest-user.svg';
import brandLogo from '../assets/logo-only.png';
import './MainPortal.css';

const MainPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();

  React.useEffect(() => {
    document.title = 'endeavor portal';
  }, []);

  const handleSyncAll = async () => {
    // In a full implementation, you'd fetch all Firestore data 
    // and package it into a file for Google Drive.
    await saveToDrive('endeavor_backup.json', JSON.stringify({ date: new Date().toISOString() }, null, 2));
    alert("endeavor portal data backup completed in Google Drive!");
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <div className="user-nav">
          {!loading && (
            user ? (
              <div className="user-menu">
                <button className="sync-btn-nav" onClick={handleSyncAll} disabled={isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Sync to Drive'}
                </button>
                <img 
                  src={user.photoURL || guestUserIcon} 
                  alt="Profile" 
                  className="nav-avatar" 
                  referrerPolicy="no-referrer"
                />
                <span className="user-name">{user.displayName?.split(' ')[0] || 'User'}</span>
                <button className="logout-btn-nav" onClick={() => logout()}>Sign Out</button>
              </div>
            ) : (
              <button className="login-btn-nav" onClick={() => login()}>Sign In</button>
            )
          )}
        </div>

        <div className="portal-brand">
          <img src={brandLogo} alt="endeavor logo" className="portal-logo" />
          <h1>Apps by <span className="brand-name">endeavor</span></h1>
        </div>
        <p>Choose an application to get started.</p>
      </header>

      <main className="portal-grid">
        <div className="app-card" onClick={() => navigate('/todo')}>
          <div className="app-icon">✅</div>
          <h2>TaskMaster</h2>
          <p>Organize your life, one task at a time. Secure, synced, and simple.</p>
          <div className="app-badge">Popular</div>
        </div>

        <div className="app-card" onClick={() => navigate('/voicenotes')}>
          <div className="app-icon">🎙️</div>
          <h2>VoiceNotes</h2>
          <p>Capture your thoughts with your voice. Transcription and AI analysis included.</p>
          <div className="app-badge">New</div>
        </div>

        <div className="app-card" onClick={() => navigate('/password')}>
          <div className="app-icon">🔐</div>
          <h2>Shield Gen</h2>
          <p>Generate unbreakable passwords instantly. Customizable and secure.</p>
          <div className="app-badge">Security</div>
        </div>

        <div className="app-card" onClick={() => navigate('/timer')}>
          <div className="app-icon">🍏</div>
          <h2>Apple Timer</h2>
          <p>Boost productivity with the focus technique. Focus and rest.</p>
          <div className="app-badge">Productivity</div>
        </div>

        <div className="app-card disabled">
          <div className="app-icon">📊</div>
          <h2>FinanceTracker (Coming Soon)</h2>
          <p>Keep track of your expenses and savings. Smart insights for your wallet.</p>
          <div className="app-badge coming-soon">WIP</div>
        </div>
      </main>

      <footer className="portal-footer">
        <p>&copy; 2026 endeavor. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainPortal;
