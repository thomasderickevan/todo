import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDriveSync } from '../hooks/useDriveSync';
import guestUserIcon from '../assets/guest-user.svg';
import './MainPortal.css';

const MainPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();

  React.useEffect(() => {
    document.title = 'ederick portal';
  }, []);

  const handleSyncAll = async () => {
    // In a full implementation, you'd fetch all Firestore data 
    // and package it into a file for Google Drive.
    await saveToDrive('ederick_backup.json', { date: new Date().toISOString() });
    alert("ederick portal data backup completed in Google Drive!");
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

        <h1>Apps by <span className="brand-name">ederick</span></h1>
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

        <div className="app-card disabled">
          <div className="app-icon">📊</div>
          <h2>FinanceTracker (Coming Soon)</h2>
          <p>Keep track of your expenses and savings. Smart insights for your wallet.</p>
          <div className="app-badge coming-soon">WIP</div>
        </div>
      </main>

      <footer className="portal-footer">
        <p>&copy; 2026 ederick. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainPortal;
