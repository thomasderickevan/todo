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
  
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [timeLeft, setTimeLeft] = useState(durations[mode] * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playSound = useCallback(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  }, []);

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
    return () => { document.title = 'ederick portal'; };
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = ((durations[mode] * 60 - timeLeft) / (durations[mode] * 60)) * 100;

  const renderAppleLifecycle = () => {
    return (
      <svg width="140" height="120" viewBox="0 0 400 300" className="apple-lifecycle-svg">
        {/* Seed: 0-15% */}
        <g style={{ opacity: progress <= 15 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <ellipse cx="200" cy="220" rx="6" ry="10" fill="#8B5A2B"/>
        </g>
        {/* Sapling: 15-35% */}
        <g style={{ opacity: progress > 15 && progress <= 35 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <rect x="198" y="180" width="4" height="40" fill="#10b981"/>
          <circle cx="200" cy="170" r="10" fill="#34d399"/>
        </g>
        {/* Tree: 35-55% */}
        <g style={{ opacity: progress > 35 && progress <= 55 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <rect x="190" y="140" width="20" height="80" fill="#78350f"/>
          <circle cx="200" cy="120" r="40" fill="#059669"/>
        </g>
        {/* Apple Fruit: 55-75% */}
        <g style={{ opacity: progress > 55 && progress <= 75 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <circle cx="200" cy="150" r="25" fill="#ef4444"/>
          <rect x="198" y="120" width="4" height="10" fill="#78350f"/>
          <ellipse cx="210" cy="120" rx="8" ry="4" fill="#10b981"/>
        </g>
        {/* Bitten Apple: 75-90% */}
        <g style={{ opacity: progress > 75 && progress <= 90 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <circle cx="200" cy="150" r="25" fill="#ef4444"/>
          <circle cx="222" cy="145" r="12" fill="white"/>
          <rect x="198" y="120" width="4" height="10" fill="#78350f"/>
        </g>
        {/* Apple Core: 90-100% */}
        <g style={{ opacity: progress > 90 ? 1 : 0, transition: 'opacity 0.5s' }}>
          <path d="M190 120 Q200 130 210 120 L210 180 Q200 170 190 180 Z" fill="#fef3c7" />
          <rect x="198" y="110" width="4" height="10" fill="#78350f"/>
          <circle cx="197" cy="145" r="2" fill="#4b5563" />
          <circle cx="203" cy="155" r="2" fill="#4b5563" />
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
              <svg width="240" height="240">
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
              <h3>Customize Durations (min)</h3>
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
                  <label>Short Break</label>
                  <input 
                    type="number" 
                    value={durations.short} 
                    onChange={(e) => updateDuration('short', Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div className="setting-item">
                  <label>Long Break</label>
                  <input 
                    type="number" 
                    value={durations.long} 
                    onChange={(e) => updateDuration('long', Math.max(1, parseInt(e.target.value) || 1))}
                  />
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
