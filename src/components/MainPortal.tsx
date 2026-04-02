import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDriveSync } from '../hooks/useDriveSync';
import guestUserIcon from '../assets/guest-user.svg';
import './MainPortal.css';

const logoE = '/endeavor-e.png';

const MainPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();

  React.useEffect(() => {
    document.title = 'PORTAL // ENDEAVOR';
  }, []);

  const handleSyncAll = async () => {
    await saveToDrive('endeavor_backup.json', JSON.stringify({ date: new Date().toISOString() }, null, 2));
  };

  const apps = [
    { id: 'todo', title: 'TaskMaster', icon: '✅', desc: 'Organize your life, one task at a time. Secure, synced, and simple.', color: '#00FF41', badge: 'MOMENTUM' },
    { id: 'voicenotes', title: 'VoiceNotes', icon: '🎙️', desc: 'Capture your thoughts with your voice. Transcription and AI analysis.', color: '#00E5FF', badge: 'CAPTURE' },
    { id: 'password', title: 'Shield Gen', icon: '🔐', desc: 'Generate unbreakable passwords instantly. Customizable and secure.', color: '#FF003C', badge: 'SECURITY' },
    { id: 'timer', title: 'Apple Timer', icon: '🍏', desc: 'Boost productivity with the focus technique. Focus and rest.', color: '#FFEA00', badge: 'FOCUS' },
    { id: 'assistant', title: 'AI Assistant', icon: '✨', desc: 'Context-aware help embedded directly into your workflow.', color: '#FF00FF', badge: 'INTELLIGENCE' }
  ];

  return (
    <div className="home-showcase modern-critical portal-theme">
      {/* Visual Layer: Background Texture & Noise */}
      <div className="mc-bg-overlay">
        <div className="mc-dot-grid"></div>
        <div className="mc-scanlines"></div>
        <div className="mc-noise"></div>
      </div>

      <div className="mc-bg-deco-text">PORTAL_ACCESS</div>

      <nav className="mc-nav">
        <div className="mc-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={logoE} alt="e" className="mc-logo" />
          <span className="mc-brand-text">ENDEAVOR_</span>
        </div>
        
        <div className="mc-nav-links">
          {!loading && (
            user ? (
              <div className="portal-user-nav">
                <button className="mc-status-btn" onClick={handleSyncAll} disabled={isSyncing}>
                  {isSyncing ? 'SYNCING...' : 'SYNC_TO_DRIVE'}
                </button>
                <div className="user-profile-mini">
                  <img
                    src={user.photoURL || guestUserIcon}
                    alt="Profile"
                    className="mc-mini-avatar"
                    referrerPolicy="no-referrer"
                  />
                  <span className="mc-user-name">{user.displayName?.split(' ')[0] || 'USER'}</span>
                </div>
                <button className="mc-logout-btn" onClick={() => logout()}>SIGNOUT</button>
              </div>
            ) : (
              <button className="mc-cta-btn" onClick={() => login()}>AUTHENTICATE</button>
            )
          )}
        </div>
      </nav>

      <main className="mc-portal-main">
        <header className="mc-portal-header">
          <span className="mc-app-kicker">SYSTEM_PORTAL // V2.0.4</span>
          <h1 className="mc-title">CORE_MODULES</h1>
          <p className="mc-subtitle">Select an interface to initialize your session.</p>
        </header>

        <div className="mc-portal-grid">
          {apps.map((app) => (
            <div 
              key={app.id} 
              className="mc-portal-card" 
              onClick={() => navigate(`/${app.id === 'assistant' ? 'portal' : app.id}`)}
              style={{ '--app-color': app.color } as React.CSSProperties}
            >
              <div className="mc-card-header">
                <span className="mc-card-badge">{app.badge}</span>
                <span className="mc-card-icon">{app.icon}</span>
              </div>
              <h2 className="mc-card-title">{app.title}</h2>
              <p className="mc-card-desc">{app.desc}</p>
              <div className="mc-card-footer">
                <span className="mc-card-action">INITIALIZE_INTERFACE [→]</span>
              </div>
            </div>
          ))}
          
          <div className="mc-portal-card disabled">
            <div className="mc-card-header">
              <span className="mc-card-badge">WIP</span>
              <span className="mc-card-icon">📊</span>
            </div>
            <h2 className="mc-card-title">FINANCE_TRACKER</h2>
            <p className="mc-card-desc">Coming soon: Smart insights for your wallet and global asset tracking.</p>
          </div>
        </div>
      </main>

      <footer className="mc-footer">
        <div className="mc-footer-grid">
          <div className="mc-footer-brand">
            <img src={logoE} alt="e" />
            <p>ENDEAVOR // PORTAL_ACTIVE</p>
          </div>
          <div className="mc-footer-links">
            <Link to="/">HOME</Link>
            <Link to="/privacy">PRIVACY</Link>
            <Link to="/terms">TERMS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainPortal;
