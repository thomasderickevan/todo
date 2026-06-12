import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useVault } from '../hooks/useVault';
import { usePasswordGenerator } from '../hooks/usePasswordGenerator';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import GuestStorageNotice from './GuestStorageNotice';
import guestUserIcon from '../assets/guest-user.svg';
import './PasswordGenerator.css';

const PasswordGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading: authLoading } = useAuth();

  const {
    mode,
    setMode,
    password,
    length,
    setLength,
    wordCount,
    setWordCount,
    options,
    setOptions,
    copied,
    strength,
    generate,
    copyToClipboard
  } = usePasswordGenerator();

  const {
    vaultEntries,
    isSaving,
    isSyncing,
    revealedIds,
    saveToVault,
    revealPassword,
    deleteEntry,
    handleSyncToDrive,
    handleRestoreFromDrive
  } = useVault();

  // Component local states
  const [serviceName, setServiceName] = useState('');
  const [vaultUsername, setVaultUsername] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [showVault, setShowVault] = useState(false);

  useEffect(() => {
    document.title = '✦ endeavor • Shield Gen';
  }, []);

  const handleSaveToVault = async () => {
    const success = await saveToVault(serviceName, vaultUsername, masterPin, password);
    if (success) {
      setServiceName('');
      setVaultUsername('');
    }
  };

  if (authLoading) return <div className="loading-screen">🌀 Arming Shields...</div>;

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme">
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">SHIELDGEN</div>

        <div className="mc-app-container">
          {!user && (
            <GuestStorageNotice
              storageKey="guest_notice_password"
              title="GUEST_MODE_ACTIVE"
              message="You are not signed in. Vault data is stored locally in this browser."
            />
          )}

          <div className="mc-app-card" style={{ '--app-color': '#FF003C' } as React.CSSProperties}>
            <header className="mc-app-header">
              <div className="mc-header-top">
                <div className="mc-user-badge">
                  <img 
                    src={user?.photoURL || guestUserIcon} 
                    alt="P" 
                    className="mc-mini-avatar" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="mc-user-info">
                    <span className="mc-username">{user?.displayName?.split(' ')[0] || 'GUEST'}</span>
                    <span className="mc-status-indicator" style={{ background: '#FF003C', boxShadow: '0 0 5px #FF003C' }}></span>
                  </div>
                </div>
                <div className="mc-header-actions">
                  {user ? (
                    <div className="mc-pill-group">
                      <button 
                        className="mc-status-btn" 
                        onClick={handleRestoreFromDrive} 
                        disabled={isSyncing}
                      >
                        {isSyncing ? 'WAIT...' : 'RESTORE_VAULT'}
                      </button>
                      <button 
                        className="mc-status-btn" 
                        onClick={handleSyncToDrive} 
                        disabled={isSyncing || vaultEntries.length === 0}
                      >
                        {isSyncing ? 'SYNCING...' : 'SYNC_VAULT'}
                      </button>
                      <button className="mc-action-icon" onClick={() => logout()}>🚪</button>
                    </div>
                  ) : (
                    <button className="mc-cta-btn" onClick={() => login()}>AUTHENTICATE</button>
                  )}
                </div>
              </div>

              <div className="mc-app-title-group">
                <span className="mc-app-kicker">IRONCLAD // SECURITY</span>
                <h1 className="mc-app-main-title">SHIELD GEN</h1>
                <button className="mc-text-link-btn" onClick={() => navigate('/shield-extension')}>
                  [VIEW_EXTENSION_GUIDE]
                </button>
              </div>
            </header>

            <div className="mc-pg-mode-selector">
              <button 
                className={mode === 'password' ? 'active' : ''} 
                onClick={() => setMode('password')}
              >
                RANDOM_PASSWORD
              </button>
              <button 
                className={mode === 'passphrase' ? 'active' : ''} 
                onClick={() => setMode('passphrase')}
              >
                MEMORABLE_PASSPHRASE
              </button>
            </div>

            <div className="mc-pg-display">
              <div className="mc-display-row">
                <input 
                  type="text" 
                  value={password} 
                  readOnly 
                  className={password === 'Select at least one option' ? 'error' : ''}
                />
                <button className={`mc-copy-btn ${copied ? 'copied' : ''}`} onClick={() => copyToClipboard(password)}>
                  {copied ? 'CONFIRMED' : 'COPY'}
                </button>
              </div>
              <div className="mc-strength-section">
                <div className={`mc-strength-meter ${strength.toLowerCase().replace(' ', '-')}`}>
                  ENTROPY_LEVEL: <span>{strength.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="mc-pg-controls">
              {mode === 'password' ? (
                <>
                  <div className="mc-control-row">
                    <div className="mc-label-group">
                      <label>LENGTH</label>
                      <span className="mc-value">{length}</span>
                    </div>
                    <input 
                      type="range" 
                      min="8" 
                      max="64" 
                      value={length} 
                      onChange={(e) => setLength(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="mc-options-grid">
                    {(['uppercase', 'lowercase', 'numbers', 'symbols'] as const).map(opt => (
                      <label key={opt} className="mc-checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={options[opt]} 
                          onChange={() => setOptions({ ...options, [opt]: !options[opt] })}
                        />
                        <span className="mc-custom-check"></span>
                        {opt.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mc-control-row">
                    <div className="mc-label-group">
                      <label>WORD_COUNT</label>
                      <span className="mc-value">{wordCount}</span>
                    </div>
                    <input 
                      type="range" 
                      min="3" 
                      max="10" 
                      value={wordCount} 
                      onChange={(e) => setWordCount(parseInt(e.target.value))}
                    />
                  </div>

                  <div className="mc-options-grid">
                    <label className="mc-checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={options.capitalize} 
                        onChange={() => setOptions({ ...options, capitalize: !options.capitalize })}
                      />
                      <span className="mc-custom-check"></span>
                      CAPITALIZE
                    </label>
                    <div className="mc-select-group">
                      <label>SEPARATOR</label>
                      <select 
                        value={options.separator} 
                        onChange={(e) => setOptions({ ...options, separator: e.target.value })}
                      >
                        <option value="-">HYPHEN (-)</option>
                        <option value=".">DOT (.)</option>
                        <option value="_">UNDERSCORE (_)</option>
                        <option value=" ">SPACE ( )</option>
                        <option value="">NONE</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button className="mc-regen-btn" onClick={generate}>
                REGENERATE_ENTROPY
              </button>
            </div>

            <section className="mc-vault-section">
              <h3 className="mc-section-divider">SHIELD_VAULT // ENCRYPTED_STORAGE</h3>
              <div className="mc-vault-form">
                <input 
                  type="text" 
                  placeholder="SERVICE_NAME" 
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="IDENTITY_USERNAME" 
                  value={vaultUsername}
                  onChange={(e) => setVaultUsername(e.target.value)}
                />
                <input 
                  type="password" 
                  placeholder="MASTER_PIN" 
                  value={masterPin}
                  onChange={(e) => setMasterPin(e.target.value)}
                />
                <button 
                  className="mc-vault-add" 
                  onClick={handleSaveToVault}
                  disabled={isSaving}
                >
                  {isSaving ? 'ENCRYPTING...' : 'LOCK_IN_VAULT'}
                </button>
              </div>

              {vaultEntries.length > 0 && (
                <button 
                  className="mc-vault-toggle" 
                  onClick={() => setShowVault(!showVault)}
                >
                  {showVault ? 'CLOSE_VAULT_ACCESS' : `ACCESS_VAULT_DATABASE [${vaultEntries.length}]`}
                </button>
              )}
            </section>
          </div>

          {showVault && (
            <div className="mc-vault-list">
              {vaultEntries.map(entry => (
                <div key={entry.id} className="mc-vault-item">
                  <div className="mc-item-meta">
                    <span className="mc-service">{entry.serviceName.toUpperCase()}</span>
                    <span className="mc-user">{entry.username || 'NO_IDENTITY'}</span>
                  </div>
                  <div className="mc-item-actions">
                    {revealedIds[entry.id] ? (
                      <div className="mc-revealed-block">
                        <code>{revealedIds[entry.id]}</code>
                        <button onClick={() => copyToClipboard(revealedIds[entry.id])}>[COPY]</button>
                      </div>
                    ) : (
                      <button className="mc-reveal-btn" onClick={() => revealPassword(entry, masterPin)}>REVEAL_KEY</button>
                    )}
                    <button className="mc-delete-btn" onClick={() => deleteEntry(entry)}>TERMINATE</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <LegalFooter />
      </div>
    </>
  );
};

export default PasswordGenerator;
