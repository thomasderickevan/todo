import React, { useState, useCallback, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { useDriveSync } from '../hooks/useDriveSync';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import GuestStorageNotice from './GuestStorageNotice';
import guestUserIcon from '../assets/guest-user.svg';
import './PasswordGenerator.css';

const WORD_LIST = [
  'apple', 'bridge', 'candle', 'desert', 'eagle', 'forest', 'galaxy', 'honey', 'island', 'jungle',
  'knight', 'lemon', 'mountain', 'nebula', 'ocean', 'planet', 'quartz', 'river', 'shadow', 'tiger',
  'umbrella', 'valley', 'winter', 'xray', 'yellow', 'zebra', 'autumn', 'blossom', 'canyon', 'dawn',
  'echo', 'falcon', 'glacier', 'harvest', 'iceberg', 'jade', 'kite', 'lagoon', 'meadow', 'night',
  'oasis', 'pebble', 'quiver', 'reef', 'storm', 'thunder', 'umbra', 'vortex', 'willow', 'xenon',
  'yacht', 'zenith', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'iota', 'kappa',
  'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
];

interface VaultEntry {
  id: string;
  serviceName: string;
  username: string;
  encryptedPassword: string;
  createdAt: number;
  userId: string;
}

const getLocalVaultKey = (userId?: string) =>
  userId ? `local_vault_passwords_${userId}` : 'local_vault_passwords_guest';

const loadLocalVaultEntries = (userId?: string): VaultEntry[] => {
  try {
    const raw = localStorage.getItem(getLocalVaultKey(userId));
    return raw ? JSON.parse(raw) as VaultEntry[] : [];
  } catch (error) {
    console.error('Failed to read local vault cache:', error);
    return [];
  }
};

const saveLocalVaultEntries = (entries: VaultEntry[], userId?: string) => {
  localStorage.setItem(getLocalVaultKey(userId), JSON.stringify(entries));
};

const DRIVE_VAULT_BACKUP_FILE = 'endeavor_vault_backup.json';

const PasswordGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading: authLoading, googleAccessToken } = useAuth();
  const { saveToDrive, getFromDrive, isSyncing } = useDriveSync();
  const [mode, setMode] = useState<'password' | 'passphrase'>('password');
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [wordCount, setWordCount] = useState(4);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    capitalize: true,
    separator: '-'
  });
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState('');

  // Vault States
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [serviceName, setServiceName] = useState('');
  const [vaultUsername, setVaultUsername] = useState('');
  const [masterPin, setMasterPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = '✦ endeavor • Shield Gen';
  }, []);

  // Fetch Vault Entries
  useEffect(() => {
    if (!user) {
      setVaultEntries(loadLocalVaultEntries());
      return;
    }

    const q = query(
      collection(db, "vault_passwords"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VaultEntry[];
      entries.sort((a, b) => b.createdAt - a.createdAt);
      setVaultEntries(entries);
      saveLocalVaultEntries(entries, user.uid);
    }, (error) => {
      console.error("Vault listener error:", error);
      setVaultEntries(loadLocalVaultEntries(user.uid));
    });

    return () => unsubscribe();
  }, [user]);

  const generateRandomPassword = useCallback(() => {
    const charset = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
    };

    let characters = '';
    if (options.uppercase) characters += charset.uppercase;
    if (options.lowercase) characters += charset.lowercase;
    if (options.numbers) characters += charset.numbers;
    if (options.symbols) characters += charset.symbols;

    if (!characters) {
      setPassword('Select at least one option');
      return;
    }

    let generated = '';
    for (let i = 0; i < length; i++) {
      generated += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setPassword(generated);
    setCopied(false);
  }, [length, options]);

  const generatePassphrase = useCallback(() => {
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      let styledWord = word;
      if (options.capitalize) {
        styledWord = word.charAt(0).toUpperCase() + word.slice(1);
      }
      words.push(styledWord);
    }
    setPassword(words.join(options.separator));
    setCopied(false);
  }, [wordCount, options.capitalize, options.separator]);

  const generate = useCallback(() => {
    if (mode === 'password') {
      generateRandomPassword();
    } else {
      generatePassphrase();
    }
  }, [mode, generateRandomPassword, generatePassphrase]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    // Simple strength calculation
    let score = 0;
    if (mode === 'password') {
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (password.length >= 16) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;
    } else {
      if (wordCount >= 3) score++;
      if (wordCount >= 4) score++;
      if (wordCount >= 5) score++;
      if (options.capitalize) score++;
      if (options.separator !== '') score++;
    }

    if (score <= 2) setStrength('Weak');
    else if (score <= 4) setStrength('Medium');
    else if (score <= 5) setStrength('Strong');
    else setStrength('Very Strong');
  }, [password, mode, wordCount, options]);

  const copyToClipboard = (text: string) => {
    if (text && text !== 'Select at least one option') {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const syncVaultBackupToDrive = useCallback(async (entries: VaultEntry[]) => {
    if (!user || !googleAccessToken) {
      return;
    }

    await saveToDrive(
      DRIVE_VAULT_BACKUP_FILE,
      JSON.stringify(entries, null, 2),
      {
        convertToGoogleDoc: false,
        mimeType: 'application/json',
      }
    );
  }, [user, googleAccessToken, saveToDrive]);

  const saveToVault = async () => {
    if (!user) {
      alert("Please sign in to use the Shield Vault.");
      return;
    }
    if (!serviceName.trim()) {
      alert("Please provide a Service Name (e.g., Netflix).");
      return;
    }
    if (!masterPin.trim()) {
      alert("Please set a Master PIN to encrypt your password.");
      return;
    }

    setIsSaving(true);
    const entryData = {
      serviceName: serviceName.trim(),
      username: vaultUsername.trim(),
      encryptedPassword: CryptoJS.AES.encrypt(password, masterPin).toString(),
      createdAt: Date.now(),
      userId: user.uid
    };

    try {
      await addDoc(collection(db, "vault_passwords"), entryData);
      const updatedEntries = [
        {
          id: `pending-${entryData.createdAt}`,
          ...entryData,
        },
        ...vaultEntries,
      ].sort((a, b) => b.createdAt - a.createdAt);

      await syncVaultBackupToDrive(updatedEntries);
      alert(`Successfully locked credentials for ${serviceName} in your vault!`);
      setServiceName('');
      setVaultUsername('');
    } catch (error) {
      console.error("Vault Save Error:", error);
      const fallbackEntry: VaultEntry = {
        id: `local-${entryData.createdAt}`,
        ...entryData
      };
      const updatedEntries = [fallbackEntry, ...vaultEntries].sort((a, b) => b.createdAt - a.createdAt);
      setVaultEntries(updatedEntries);
      saveLocalVaultEntries(updatedEntries, user.uid);
      await syncVaultBackupToDrive(updatedEntries);
      alert(`Saved ${entryData.serviceName} locally because cloud vault save failed.`);
      setServiceName('');
      setVaultUsername('');
    } finally {
      setIsSaving(false);
    }
  };

  const revealPassword = (entry: VaultEntry) => {
    if (!masterPin.trim()) {
      alert("Please enter your Master PIN to reveal passwords.");
      return;
    }
    try {
      const bytes = CryptoJS.AES.decrypt(entry.encryptedPassword, masterPin);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (!originalText) throw new Error("Invalid PIN");
      
      setRevealedIds(prev => ({ ...prev, [entry.id]: originalText }));
    } catch (error) {
      alert("Incorrect Master PIN. Decryption failed.");
    }
  };

  const deleteEntry = async (entry: VaultEntry) => {
    if (window.confirm("Are you sure you want to delete this vault entry?")) {
      try {
        if (user && !entry.id.startsWith('local-')) {
          await deleteDoc(doc(db, "vault_passwords", entry.id));
          const updatedEntries = vaultEntries.filter((item) => item.id !== entry.id);
          await syncVaultBackupToDrive(updatedEntries);
        } else {
          const updatedEntries = vaultEntries.filter((item) => item.id !== entry.id);
          setVaultEntries(updatedEntries);
          saveLocalVaultEntries(updatedEntries, user?.uid);
          await syncVaultBackupToDrive(updatedEntries);
        }
      } catch (error) {
        console.error("Error deleting vault entry:", error);
        alert("Failed to delete entry.");
      }
    }
  };

  const handleSyncToDrive = async () => {
    if (!googleAccessToken) {
      alert("Please re-authorize Google Drive access by signing out and in again.");
      return;
    }

    await syncVaultBackupToDrive(vaultEntries);
  };

  const handleRestoreFromDrive = async () => {
    if (!user || !googleAccessToken) {
      alert("Please sign in with Google to restore your vault.");
      return;
    }

    if (window.confirm("This will merge your Drive backup into your current vault. Continue?")) {
      const content = await getFromDrive(DRIVE_VAULT_BACKUP_FILE);
      if (!content) return;

      try {
        const restoredEntries = JSON.parse(content) as VaultEntry[];
        console.log(`Found ${restoredEntries.length} entries in backup.`);

        for (const entry of restoredEntries) {
          // Check if this service/password combo already exists to avoid duplicates
          const exists = vaultEntries.some(e => 
            e.serviceName === entry.serviceName && 
            e.encryptedPassword === entry.encryptedPassword
          );

          if (!exists) {
            const { id: _unusedId, ...cleanEntry } = entry;
            await addDoc(collection(db, "vault_passwords"), {
              ...cleanEntry,
              userId: user.uid, // Ensure it's for current user
              createdAt: entry.createdAt || Date.now()
            });
          }
        }
      } catch (error) {
        console.error("Restore parsing error:", error);
        alert("Failed to parse backup file. It may be corrupted.");
      }
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
                          onChange={() => setOptions(prev => ({ ...prev, [opt]: !prev[opt] }))}
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
                        onChange={() => setOptions(prev => ({ ...prev, capitalize: !prev.capitalize }))}
                      />
                      <span className="mc-custom-check"></span>
                      CAPITALIZE
                    </label>
                    <div className="mc-select-group">
                      <label>SEPARATOR</label>
                      <select 
                        value={options.separator} 
                        onChange={(e) => setOptions(prev => ({ ...prev, separator: e.target.value }))}
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
                  onClick={saveToVault}
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
                      <button className="mc-reveal-btn" onClick={() => revealPassword(entry)}>REVEAL_KEY</button>
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

