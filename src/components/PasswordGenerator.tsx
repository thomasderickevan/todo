import React, { useState, useCallback, useEffect } from 'react';
import CryptoJS from 'crypto-js';
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

  const syncVaultBackupToDrive = useCallback(async (entries: VaultEntry[], silent = true) => {
    if (!user || !googleAccessToken) {
      return;
    }

    await saveToDrive(
      DRIVE_VAULT_BACKUP_FILE,
      JSON.stringify(entries, null, 2),
      {
        convertToGoogleDoc: false,
        mimeType: 'application/json',
        silent,
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

    await syncVaultBackupToDrive(vaultEntries, false);
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

        let restoredCount = 0;
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
            restoredCount++;
          }
        }
        alert(`Successfully restored ${restoredCount} new entries from your Google Drive!`);
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
      <div className="pg-container">
        <div className="pg-auth-header">
          {!authLoading && (
            user ? (
              <div className="user-pill">
                <button 
                  className="restore-pill-btn" 
                  onClick={handleRestoreFromDrive} 
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Wait...' : 'Restore'}
                </button>
                <button 
                  className="sync-pill-btn" 
                  onClick={handleSyncToDrive} 
                  disabled={isSyncing || vaultEntries.length === 0}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Vault'}
                </button>
                <img 
                  src={user.photoURL || guestUserIcon} 
                  alt="Profile" 
                  className="user-pill-avatar" 
                  referrerPolicy="no-referrer"
                />
                <span className="user-pill-name">{user.displayName?.split(' ')[0] || 'User'}</span>
                <button className="logout-pill-btn" onClick={() => logout()}>Sign Out</button>
              </div>
            ) : (
              <button className="login-pill-btn" onClick={() => login()}>Sign In with Google</button>
            )
          )}
        </div>

        <div className="pg-card">
          <header className="pg-header">
            <h1>Shield <span className="brand-name">Gen</span></h1>
            <p>Generate secure, random passwords in an instant.</p>
          </header>

          <div className="mode-switcher">
            <button 
              className={mode === 'password' ? 'active' : ''} 
              onClick={() => setMode('password')}
            >
              Password
            </button>
            <button 
              className={mode === 'passphrase' ? 'active' : ''} 
              onClick={() => setMode('passphrase')}
            >
              Passphrase
            </button>
          </div>

          <div className="pg-display-section">
            <div className="password-display">
              <input 
                type="text" 
                value={password} 
                readOnly 
                className={password === 'Select at least one option' ? 'error' : ''}
              />
              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copyToClipboard(password)}>
                {copied ? '✅' : '📋'}
              </button>
            </div>
            <div className={`strength-meter ${strength.toLowerCase().replace(' ', '-')}`}>
              Strength: <span>{strength}</span>
            </div>
          </div>

          <div className="pg-controls">
            {mode === 'password' ? (
              <>
                <div className="control-group">
                  <div className="control-header">
                    <label>Password Length</label>
                    <span className="length-value">{length}</span>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="64" 
                    value={length} 
                    onChange={(e) => setLength(parseInt(e.target.value))}
                    className="length-slider"
                  />
                </div>

                <div className="options-grid">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={options.uppercase} 
                      onChange={() => setOptions(prev => ({ ...prev, uppercase: !prev.uppercase }))}
                    />
                    <span className="checkmark"></span>
                    Uppercase
                  </label>
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={options.lowercase} 
                      onChange={() => setOptions(prev => ({ ...prev, lowercase: !prev.lowercase }))}
                    />
                    <span className="checkmark"></span>
                    Lowercase
                  </label>
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={options.numbers} 
                      onChange={() => setOptions(prev => ({ ...prev, numbers: !prev.numbers }))}
                    />
                    <span className="checkmark"></span>
                    Numbers
                  </label>
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={options.symbols} 
                      onChange={() => setOptions(prev => ({ ...prev, symbols: !prev.symbols }))}
                    />
                    <span className="checkmark"></span>
                    Symbols
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="control-group">
                  <div className="control-header">
                    <label>Number of Words</label>
                    <span className="length-value">{wordCount}</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="10" 
                    value={wordCount} 
                    onChange={(e) => setWordCount(parseInt(e.target.value))}
                    className="length-slider"
                  />
                </div>

                <div className="options-grid passphrase-options">
                  <div className="pg-option-group">
                    <label className="pg-label">Word Styling</label>
                    <label className="checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={options.capitalize} 
                        onChange={() => setOptions(prev => ({ ...prev, capitalize: !prev.capitalize }))}
                      />
                      <span className="checkmark"></span>
                      Capitalize
                    </label>
                  </div>
                  <div className="pg-option-group">
                    <label className="pg-label">Separator</label>
                    <select 
                      className="pg-select"
                      value={options.separator} 
                      onChange={(e) => setOptions(prev => ({ ...prev, separator: e.target.value }))}
                    >
                      <option value="-">Hyphen (-)</option>
                      <option value=".">Dot (.)</option>
                      <option value="_">Underscore (_)</option>
                      <option value=" ">Space ( )</option>
                      <option value="">None</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <button className="generate-btn" onClick={generate}>
              Regenerate {mode === 'password' ? 'Password' : 'Passphrase'}
            </button>
          </div>

          <div className="vault-action-section">
            <h3>🔐 Shield Vault</h3>
            <div className="vault-inputs">
              <input 
                type="text" 
                placeholder="Service (e.g. Netflix)" 
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="pg-input"
              />
              <input 
                type="text" 
                placeholder="Username (optional)" 
                value={vaultUsername}
                onChange={(e) => setVaultUsername(e.target.value)}
                className="pg-input"
              />
              <input 
                type="password" 
                placeholder="Set Master PIN" 
                value={masterPin}
                onChange={(e) => setMasterPin(e.target.value)}
                className="pg-input"
              />
              <button 
                className="vault-lock-btn" 
                onClick={saveToVault}
                disabled={isSaving}
              >
                {isSaving ? 'Encrypting...' : 'Lock in Vault'}
              </button>
            </div>
            {vaultEntries.length > 0 && (
              <button 
                className="view-vault-toggle" 
                onClick={() => setShowVault(!showVault)}
              >
                {showVault ? 'Hide Vault' : `View Vault (${vaultEntries.length})`}
              </button>
            )}
          </div>
        </div>

        {showVault && (
          <div className="vault-list">
            {vaultEntries.map(entry => (
              <div key={entry.id} className="vault-entry">
                <div className="entry-info">
                  <div className="entry-service">{entry.serviceName}</div>
                  <div className="entry-user">{entry.username || 'No username'}</div>
                </div>
                <div className="entry-actions">
                  {revealedIds[entry.id] ? (
                    <div className="revealed-pw">
                      <code>{revealedIds[entry.id]}</code>
                      <button onClick={() => copyToClipboard(revealedIds[entry.id])}>📋</button>
                    </div>
                  ) : (
                    <button className="reveal-btn" onClick={() => revealPassword(entry)}>Reveal</button>
                  )}
                  <button className="delete-entry-btn" onClick={() => deleteEntry(entry)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <LegalFooter />
      </div>
    </>
  );
};

export default PasswordGenerator;

