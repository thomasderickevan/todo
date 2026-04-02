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

const PasswordGenerator: React.FC = () => {
  const { user, login, logout, loading: authLoading, googleAccessToken } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();
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
      setVaultEntries([]);
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
    }, (error) => {
      console.error("Vault listener error:", error);
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
    let words = [];
    for (let i = 0; i < wordCount; i++) {
      let word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
      if (options.capitalize) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      words.push(word);
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
    try {
      const encrypted = CryptoJS.AES.encrypt(password, masterPin).toString();
      await addDoc(collection(db, "vault_passwords"), {
        serviceName,
        username: vaultUsername,
        encryptedPassword: encrypted,
        createdAt: Date.now(),
        userId: user.uid
      });
      alert(`Successfully locked credentials for ${serviceName} in your vault!`);
      setServiceName('');
      setVaultUsername('');
    } catch (err) {
      console.error("Vault Save Error:", err);
      alert("Failed to save to vault.");
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
    } catch (err) {
      alert("Incorrect Master PIN. Decryption failed.");
    }
  };

  const deleteEntry = async (entry: VaultEntry) => {
    if (window.confirm("Are you sure you want to delete this vault entry?")) {
      try {
        await deleteDoc(doc(db, "vault_passwords", entry.id));
      } catch (err) {
        console.error("Error deleting vault entry:", err);
        alert("Failed to delete entry.");
      }
    }
  };

  const handleSyncToDrive = async () => {
    if (!googleAccessToken) {
      alert("Please re-authorize Google Drive access by signing out and in again.");
      return;
    }

    const backupData = JSON.stringify(vaultEntries, null, 2);
    await saveToDrive('endeavor_vault_backup.json', backupData);
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

