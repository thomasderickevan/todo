import React, { useState, useCallback, useEffect } from 'react';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
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

const PasswordGenerator: React.FC = () => {
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

  const copyToClipboard = () => {
    if (password && password !== 'Select at least one option') {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Navbar />
      <div className="pg-container">
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
              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyToClipboard}>
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
        </div>
        <LegalFooter />
      </div>
    </>
  );
};

export default PasswordGenerator;
