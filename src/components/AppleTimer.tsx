import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './AppleTimer.css';

const AppleTimer: React.FC = () => {
  const [durations, setDurations] = useState({
    focus: Number(localStorage.getItem('at_focus')) || 25,
    short: Number(localStorage.getItem('at_short')) || 5,
    long: Number(localStorage.getItem('at_long')) || 15,
  });
  const [selectedSound, setSelectedSound] = useState(localStorage.getItem('at_sound') || 'chime');
  
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timeLeft, setTimeLeft] = useState(durations[mode] * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playSound = useCallback((soundTypeOverride?: string) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sound = soundTypeOverride || selectedSound;

    const playNote = (freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    switch (sound) {
      case 'digital':
        [0, 0.15, 0.3].forEach(t => playNote(1000, audioCtx.currentTime + t, 0.1, 'square', 0.15));
        break;
      case 'bell':
        playNote(440, audioCtx.currentTime, 2, 'sine', 0.3);
        playNote(660, audioCtx.currentTime + 0.1, 2, 'sine', 0.2);
        break;
      case 'wood':
        playNote(150, audioCtx.currentTime, 0.1, 'triangle', 0.4);
        break;
      case 'chime':
      default:
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
        break;
    }
  }, [selectedSound]);

  const switchMode = useCallback((newMode: 'focus' | 'short' | 'long') => {
    setMode(newMode);
    setTimeLeft(durations[newMode] * 60);
    setIsActive(false);
    setIsModalOpen(false);
  }, [durations]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(durations[mode] * 60);
    setIsModalOpen(false);
  };

  const updateDuration = (m: 'focus' | 'short' | 'long', val: number) => {
    const newDurations = { ...durations, [m]: val };
    setDurations(newDurations);
    localStorage.setItem(`at_${m}`, val.toString());
    
    if (mode === m && !isActive) {
      setTimeLeft(val * 60);
    }
  };

  const updateSound = (sound: string) => {
    setSelectedSound(sound);
    localStorage.setItem('at_sound', sound);
    // Play a quick preview of the selected sound
    setTimeout(() => playSound(sound), 50);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      playSound();
      
      if (mode === 'focus') {
        setSessions((prev) => prev + 1);
        setModalMessage('Focus session complete! Take a well-deserved break.');
      } else {
        setModalMessage('Break over! Time to get back into the flow.');
      }
      setIsModalOpen(true);
      
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, playSound]);

  useEffect(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.title = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} | Apple Timer`;
    return () => { document.title = 'endeavor portal'; };
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = ((durations[mode] * 60 - timeLeft) / (durations[mode] * 60)) * 100;

  const renderAppleLifecycle = () => {
    return (
      <svg width="160" height="160" viewBox="0 0 200 200" className="apple-lifecycle-svg">
        {/* Seed: 0-12.5% */}
        <g style={{ opacity: progress <= 12.5 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M100,152 C103,152 105,156 105,158 C105,160 95,160 95,158 C95,156 97,152 100,152 Z" fill="#5D4037"/>
        </g>
        
        {/* Sprout: 12.5-25% */}
        <g style={{ opacity: progress > 12.5 && progress <= 25 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M100,152 C103,152 105,156 105,158 C105,160 95,160 95,158 C95,156 97,152 100,152 Z" fill="#5D4037"/>
          <path d="M100,152 Q105,147 100,142" fill="none" stroke="#81C784" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="98" cy="142" r="2" fill="#4CAF50"/>
        </g>

        {/* Sapling: 25-37.5% */}
        <g style={{ opacity: progress > 25 && progress <= 37.5 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M100,160 Q100,145 98,140" fill="none" stroke="#795548" strokeWidth="3" strokeLinecap="round"/>
          <path d="M98,140 Q108,135 108,142 Q103,145 98,140 Z" fill="#81C784"/>
          <path d="M99,148 Q88,145 90,152 Q95,153 99,148 Z" fill="#4CAF50"/>
        </g>

        {/* Flowering Tree: 37.5-50% */}
        <g style={{ opacity: progress > 37.5 && progress <= 50 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <rect x="92" y="90" width="16" height="70" fill="#795548" rx="2"/>
          <circle cx="100" cy="70" r="35" fill="#4CAF50"/>
          <circle cx="75" cy="95" r="25" fill="#388E3C"/>
          <circle cx="125" cy="95" r="25" fill="#388E3C"/>
          <circle cx="100" cy="50" r="25" fill="#81C784"/>
          <circle cx="90" cy="65" r="4" fill="#F8BBD0"/>
          <circle cx="110" cy="75" r="4" fill="#F8BBD0"/>
          <circle cx="75" cy="90" r="4" fill="#F8BBD0"/>
          <circle cx="120" cy="85" r="4" fill="#F8BBD0"/>
          <circle cx="100" cy="55" r="4" fill="#F8BBD0"/>
        </g>

        {/* Apple Tree: 50-62.5% */}
        <g style={{ opacity: progress > 50 && progress <= 62.5 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <rect x="92" y="90" width="16" height="70" fill="#795548" rx="2"/>
          <circle cx="100" cy="70" r="35" fill="#4CAF50"/>
          <circle cx="75" cy="95" r="25" fill="#388E3C"/>
          <circle cx="125" cy="95" r="25" fill="#388E3C"/>
          <circle cx="100" cy="50" r="25" fill="#81C784"/>
          <circle cx="90" cy="65" r="5" fill="#E53935"/>
          <circle cx="110" cy="75" r="5" fill="#E53935"/>
          <circle cx="75" cy="90" r="5" fill="#E53935"/>
          <circle cx="120" cy="85" r="5" fill="#E53935"/>
          <circle cx="100" cy="55" r="5" fill="#E53935"/>
        </g>

        {/* Big Apple: 62.5-75% */}
        <g style={{ opacity: progress > 62.5 && progress <= 75 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M100,110 C140,100 140,160 100,160 C60,160 60,100 100,110 Z" fill="#E53935"/>
          <path d="M100,110 Q100,95 110,90" fill="none" stroke="#5D4037" strokeWidth="4" strokeLinecap="round"/>
          <path d="M110,90 Q120,90 125,100 Q110,105 110,90" fill="#4CAF50"/>
        </g>

        {/* Bitten Apple: 75-87.5% */}
        <g style={{ opacity: progress > 75 && progress <= 87.5 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M100,110 C140,100 140,160 100,160 C60,160 60,100 100,110 Z" fill="#E53935"/>
          <path d="M100,110 Q100,95 110,90" fill="none" stroke="#5D4037" strokeWidth="4" strokeLinecap="round"/>
          <path d="M110,90 Q120,90 125,100 Q110,105 110,90" fill="#4CAF50"/>
          <circle cx="132" cy="125" r="16" fill="white"/>
          <circle cx="122" cy="142" r="14" fill="white"/>
        </g>

        {/* Apple Core: 87.5-100% */}
        <g style={{ opacity: progress > 87.5 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M85,120 Q100,135 85,150 L115,150 Q100,135 115,120 Z" fill="#FFE0B2"/>
          <path d="M85,120 C95,115 105,115 115,120 C110,105 105,110 100,110 C95,110 90,105 85,120 Z" fill="#E53935"/>
          <path d="M85,150 C95,155 105,155 115,150 C115,160 105,160 100,160 C95,160 85,160 85,150 Z" fill="#E53935"/>
          <path d="M100,110 Q100,95 110,90" fill="none" stroke="#5D4037" strokeWidth="4" strokeLinecap="round"/>
          <path d="M110,90 Q120,90 125,100 Q110,105 110,90" fill="#4CAF50"/>
          <ellipse cx="97" cy="135" rx="2" ry="4" fill="#5D4037"/>
          <ellipse cx="103" cy="135" rx="2" ry="4" fill="#5D4037"/>
        </g>
      </svg>
    );
  };

  return (
    <>
      <Navbar />
      <div className="at-container">
        <div className="at-card">
          <header className="at-header">
            <div className="at-title-row">
              <h1>Apple <span className="brand-name">Timer</span></h1>
            </div>
            <p>Focus deeply, rest purposefully.</p>
          </header>

          <div className="mode-selector">
            <button 
              className={mode === 'focus' ? 'active' : ''} 
              onClick={() => switchMode('focus')}
            >
              Focus
            </button>
            <button 
              className={mode === 'short' ? 'active' : ''} 
              onClick={() => switchMode('short')}
            >
              Short Break
            </button>
            <button 
              className={mode === 'long' ? 'active' : ''} 
              onClick={() => switchMode('long')}
            >
              Long Break
            </button>
          </div>

          <div className="timer-display-section">
            <div className="progress-ring">
              <svg width="240" height="240" className="progress-ring-svg">
                <circle
                  className="progress-ring-bg"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="transparent"
                  r="110"
                  cx="120"
                  cy="120"
                />
                <circle
                  className="progress-ring-bar"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 110}`}
                  strokeDashoffset={`${2 * Math.PI * 110 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                  r="110"
                  cx="120"
                  cy="120"
                />
              </svg>
              <div className="timer-content-overlay">
                {renderAppleLifecycle()}
                <div className="timer-text">{formatTime(timeLeft)}</div>
              </div>
            </div>
          </div>

          <div className="at-controls">
            <button className={`start-btn ${isActive ? 'pause' : ''}`} onClick={toggleTimer}>
              {isActive ? 'Pause' : 'Start Focus'}
            </button>
            <button className={`settings-toggle-btn ${isSettingsOpen ? 'active' : ''}`} onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              {isSettingsOpen ? '✕' : '⚙️'}
            </button>
            <button className="reset-btn" onClick={resetTimer}>
              Reset
            </button>
          </div>

          {isSettingsOpen && (
            <div className="at-settings">
              <div className="settings-section">
                <h3>Durations (min)</h3>
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Focus</label>
                    <input 
                      type="number" 
                      value={durations.focus} 
                      onChange={(e) => updateDuration('focus', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className="setting-item">
                    <label>Short</label>
                    <input 
                      type="number" 
                      value={durations.short} 
                      onChange={(e) => updateDuration('short', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className="setting-item">
                    <label>Long</label>
                    <input 
                      type="number" 
                      value={durations.long} 
                      onChange={(e) => updateDuration('long', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-section sound-settings">
                <h3>Alarm Sound</h3>
                <div className="sound-selector-row">
                  <select 
                    className="pg-select" 
                    value={selectedSound} 
                    onChange={(e) => updateSound(e.target.value)}
                  >
                    <option value="chime">Apple Chime</option>
                    <option value="digital">Digital Beep</option>
                    <option value="bell">Zen Bell</option>
                    <option value="wood">Wood Block</option>
                  </select>
                  <button className="preview-btn" onClick={() => playSound()}>Test</button>
                </div>
              </div>
            </div>
          )}

          <div className="session-counter">
            Sessions completed: <span>{sessions}</span>
          </div>
        </div>

        {isModalOpen && (
          <div className="at-modal-overlay">
            <div className="at-modal">
              <div className="modal-icon">{mode === 'focus' ? '🍏' : '☕'}</div>
              <h2>Timer Finished!</h2>
              <p>{modalMessage}</p>
              <button onClick={() => setIsModalOpen(false)}>Continue</button>
            </div>
          </div>
        )}

        <LegalFooter />
      </div>
    </>
  );
};

export default AppleTimer;
