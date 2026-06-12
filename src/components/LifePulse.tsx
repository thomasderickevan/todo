import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useDriveSync } from '../hooks/useDriveSync';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import GuestStorageNotice from './GuestStorageNotice';
import guestUserIcon from '../assets/guest-user.svg';
import './LifePulse.css';

// ── Types ─────────────────────────────────────────────────────────
interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
}

interface LifePulseData {
  habits: Habit[];
  logs: Record<string, string[]>; // date (YYYY-MM-DD) -> array of habit IDs
}

const EMOJI_LIST = ['🔥', '💧', '🏃', '📚', '🧘', '🥗', '💻', '🎸', '🎨', '🧹', '😴', '💊'];
const COLOR_LIST = ['#FF6B35', '#00FF41', '#00E5FF', '#FF003C', '#FFEA00', '#FF00FF', '#7C4DFF', '#00FFCC'];

const DEFAULT_DATA: LifePulseData = { habits: [], logs: {} };

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const LifePulse: React.FC = () => {
//   // const navigate = useNavigate();
  const { user, login, logout, loading: authLoading } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();

  const [data, setData] = useState<LifePulseData>(DEFAULT_DATA);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState(EMOJI_LIST[0]);
  const [newHabitColor, setNewHabitColor] = useState(COLOR_LIST[0]);
  
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);

  useEffect(() => {
    document.title = '✦ endeavor • LifePulse';
  }, []);

  // ── Data Loading & Saving ───────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        const local = localStorage.getItem('lifepulse_guest');
        if (local) {
          try {
            setData(JSON.parse(local));
          } catch (e) {
            console.error("Local parse error", e);
          }
        } else {
          setData(DEFAULT_DATA);
        }
        setDataLoaded(true);
        return;
      }

      try {
        const docRef = doc(db, 'lifepulse', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data() as LifePulseData);
        } else {
          setData(DEFAULT_DATA);
        }
      } catch (error) {
        console.error("Firebase read error", error);
        // Fallback to local
        const local = localStorage.getItem(`lifepulse_${user.uid}`);
        if (local) setData(JSON.parse(local));
      }
      setDataLoaded(true);
    };

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  const saveData = useCallback(async (newData: LifePulseData) => {
    setData(newData);
    if (!user) {
      localStorage.setItem('lifepulse_guest', JSON.stringify(newData));
    } else {
      localStorage.setItem(`lifepulse_${user.uid}`, JSON.stringify(newData));
      try {
        await setDoc(doc(db, 'lifepulse', user.uid), newData);
      } catch (error) {
        console.error("Firebase write error", error);
      }
    }
  }, [user]);

  const handleSyncToDrive = async () => {
    await saveToDrive(
      'endeavor_lifepulse_backup.json',
      JSON.stringify(data, null, 2),
      { convertToGoogleDoc: false, mimeType: 'application/json' }
    );
  };

  // ── Actions ─────────────────────────────────────────────────────
  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      name: newHabitName.trim(),
      emoji: newHabitEmoji,
      color: newHabitColor,
      createdAt: Date.now()
    };
    saveData({
      ...data,
      habits: [...data.habits, newHabit]
    });
    setNewHabitName('');
    setIsAddModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    const newHabits = data.habits.filter(h => h.id !== id);
    // Cleanup logs
    const newLogs: Record<string, string[]> = {};
    for (const [date, ids] of Object.entries(data.logs)) {
      const filteredIds = ids.filter(logId => logId !== id);
      if (filteredIds.length > 0) {
        newLogs[date] = filteredIds;
      }
    }
    saveData({ habits: newHabits, logs: newLogs });
    setHabitToDelete(null);
  };

  const toggleHabit = (habitId: string, date: string) => {
    const prevLogsForDate = data.logs[date] || [];
    const isCompleted = prevLogsForDate.includes(habitId);
    
    let newLogsForDate;
    if (isCompleted) {
      newLogsForDate = prevLogsForDate.filter(id => id !== habitId);
    } else {
      newLogsForDate = [...prevLogsForDate, habitId];
      
      // Check if all habits for today are done now
      if (date === getLocalDateString() && newLogsForDate.length === data.habits.length && data.habits.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6B35', '#FFF', '#000']
        });
      }
    }

    const newLogs = { ...data.logs };
    if (newLogsForDate.length === 0) {
      delete newLogs[date];
    } else {
      newLogs[date] = newLogsForDate;
    }

    saveData({ ...data, logs: newLogs });
  };

  // ── Calculations ────────────────────────────────────────────────
  const todayStr = getLocalDateString();
  const todayCompletedCount = data.logs[todayStr]?.length || 0;
  const progressPercent = data.habits.length === 0 ? 0 : Math.round((todayCompletedCount / data.habits.length) * 100);

  // Streak Calculation
  const calculateStreak = useCallback((habitId: string) => {
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    const d = new Date();
    // Start checking from yesterday, unless today is already checked
    const checkedToday = data.logs[todayStr]?.includes(habitId) || false;
    if (checkedToday) {
      tempStreak = 1;
    }
    
    // Check backwards up to 365 days
    for (let i = (checkedToday ? 1 : 1); i <= 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(checkDate);
      
      if (data.logs[dateStr]?.includes(habitId)) {
        tempStreak++;
      } else {
        // If we were checking current streak and missed a day, current streak stops
        if (currentStreak === 0 && (i > 1 || !checkedToday)) {
            currentStreak = tempStreak;
        }
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 0;
      }
    }
    if (currentStreak === 0) currentStreak = tempStreak;
    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

    return { current: currentStreak, max: maxStreak };
  }, [data.logs, todayStr]);

  const globalStats = useMemo(() => {
    let totalCompletions = 0;
    let perfectDays = 0;
    const allDates = Object.keys(data.logs);
    
    for (const date of allDates) {
      totalCompletions += data.logs[date].length;
      if (data.habits.length > 0 && data.logs[date].length >= data.habits.length) {
        perfectDays++;
      }
    }
    return { totalCompletions, perfectDays };
  }, [data]);

  // Heatmap Data (Last 60 days)
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Start date: 60 days ago
    const start = new Date(today);
    start.setDate(today.getDate() - 59);

    // Adjust start date so the first column matches its weekday
    // If we want a 7-row grid, we need the total days to fill columns neatly.
    // Let's just generate the last 60 days.
    
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = getLocalDateString(d);
      
      const count = data.logs[dateStr]?.length || 0;
      let level = 0;
      if (data.habits.length > 0) {
        const ratio = count / data.habits.length;
        if (ratio > 0) level = 1;
        if (ratio >= 0.33) level = 2;
        if (ratio >= 0.66) level = 3;
        if (ratio >= 1) level = 4;
      }
      
      days.push({
        date: dateStr,
        count,
        level,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }, [data.logs, data.habits.length, todayStr]);

  // Split heatmap data into weeks (columns)
  const heatmapColumns = useMemo(() => {
    const cols = [];
    let currentCol = [];
    
    // We want days to flow top-to-bottom (Sunday to Saturday)
    // To simplify for the UI, we'll just chunk them by 7
    for (let i = 0; i < heatmapData.length; i++) {
      currentCol.push(heatmapData[i]);
      if (currentCol.length === 7 || i === heatmapData.length - 1) {
        // Pad the last column if needed (future days)
        while (currentCol.length < 7) {
          currentCol.push({ date: '', count: 0, level: 0, isToday: false, future: true });
        }
        cols.push(currentCol);
        currentCol = [];
      }
    }
    return cols;
  }, [heatmapData]);

  if (authLoading || !dataLoaded) {
    return <div className="loading-screen">🌀 Loading Pulse...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme">
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">LIFEPULSE</div>

        <div className="mc-app-container">
          {!user && (
            <GuestStorageNotice
              storageKey="guest_notice_lifepulse"
              title="GUEST_MODE_ACTIVE"
              message="You are not signed in. Habit data is stored locally in this browser."
            />
          )}

          <div className="mc-app-card" style={{ '--app-color': '#FF6B35' } as React.CSSProperties}>
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
                    <span className="mc-status-indicator" style={{ background: '#FF6B35', boxShadow: '0 0 5px #FF6B35' }}></span>
                  </div>
                </div>
                <div className="mc-header-actions">
                  {user ? (
                    <div className="mc-pill-group">
                      <button 
                        className="mc-status-btn" 
                        onClick={handleSyncToDrive} 
                        disabled={isSyncing}
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
                <span className="mc-app-kicker">MOMENTUM // CONSISTENCY</span>
                <h1 className="mc-app-main-title">LIFE PULSE</h1>
              </div>
            </header>

            {/* Progress Section */}
            <div className="lp-progress-section">
              <div className="lp-progress-ring">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    className="lp-ring-bg"
                    cx="60" cy="60" r="54"
                    fill="none" stroke="#1A1A1A" strokeWidth="8"
                  />
                  <circle
                    className="lp-ring-fill"
                    cx="60" cy="60" r="54"
                    fill="none" stroke="#FF6B35" strokeWidth="8"
                    strokeDasharray={339.29}
                    strokeDashoffset={339.29 - (339.29 * progressPercent) / 100}
                    strokeLinecap="square"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="lp-ring-text">
                  <span className="lp-ring-percent">{progressPercent}%</span>
                  <span className="lp-ring-label">TODAY</span>
                </div>
              </div>
              <div className="lp-progress-stats">
                <div className="lp-stat-line">COMPLETED: <span>{todayCompletedCount} / {data.habits.length}</span></div>
                <div className="lp-stat-line">SYSTEM STATUS: <span>{progressPercent === 100 ? 'OPTIMAL' : 'IN_PROGRESS'}</span></div>
                {progressPercent === 100 && data.habits.length > 0 && (
                  <div className="lp-stat-line"><span className="lp-fire">🔥</span> MOMENTUM ACHIEVED</div>
                )}
              </div>
            </div>

            {/* Habit List */}
            <div className="lp-habits-container">
              <div className="lp-section-divider">
                <span>DAILY_ROUTINE</span>
                <button className="lp-add-btn" onClick={() => setIsAddModalOpen(true)}>+ ADD_HABIT</button>
              </div>

              {data.habits.length === 0 ? (
                <div className="lp-empty-state">
                  <div className="lp-empty-icon">📈</div>
                  <div className="lp-empty-text">NO_HABITS_DETECTED</div>
                  <button className="lp-empty-cta" onClick={() => setIsAddModalOpen(true)}>INITIALIZE_ROUTINE</button>
                </div>
              ) : (
                <div className="lp-habit-list">
                  {data.habits.map(habit => {
                    const isChecked = data.logs[todayStr]?.includes(habit.id);
                    const streak = calculateStreak(habit.id);
                    
                    return (
                      <div 
                        key={habit.id} 
                        className={`lp-habit-item ${isChecked ? 'completed' : ''}`}
                        style={{ '--habit-color': habit.color } as React.CSSProperties}
                        onClick={() => toggleHabit(habit.id, todayStr)}
                      >
                        <div className="lp-habit-left">
                          <div className={`lp-habit-check ${isChecked ? 'checked' : ''}`}></div>
                          <span className="lp-habit-emoji">{habit.emoji}</span>
                          <span className="lp-habit-name">{habit.name}</span>
                        </div>
                        <div className="lp-habit-right">
                          <span className={`lp-streak-badge ${streak.current > 0 ? 'active' : ''}`}>
                            {streak.current} 🔥
                          </span>
                          <button 
                            className="lp-delete-habit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHabitToDelete(habit.id);
                            }}
                          >✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Heatmap Section */}
            <div className="lp-heatmap-section">
              <div className="lp-section-divider">
                <span>60_DAY_ACTIVITY_MATRIX</span>
              </div>
              <div className="lp-heatmap-container">
                <div className="lp-heatmap-wrapper">
                  <div className="lp-heatmap-labels">
                    <div className="lp-heatmap-day-label">M</div>
                    <div className="lp-heatmap-day-label"></div>
                    <div className="lp-heatmap-day-label">W</div>
                    <div className="lp-heatmap-day-label"></div>
                    <div className="lp-heatmap-day-label">F</div>
                    <div className="lp-heatmap-day-label"></div>
                    <div className="lp-heatmap-day-label">S</div>
                  </div>
                  {heatmapColumns.map((col, colIdx) => (
                    <div key={`col-${colIdx}`} className="lp-heatmap-grid">
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      {col.map((day: { date: string; count: number; level: number; isToday: boolean; future?: boolean; }, rowIdx: number) => (
                        <div 
                          key={`cell-${colIdx}-${rowIdx}`}
                          className={`lp-heatmap-cell ${day.future ? 'future' : `level-${day.level}`} ${day.isToday ? 'today' : ''}`}
                          title={day.future ? '' : `${day.date}: ${day.count} completed`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="lp-heatmap-legend">
                  <span className="lp-legend-label">LESS</span>
                  <div className="lp-heatmap-cell level-0 lp-legend-cell"></div>
                  <div className="lp-heatmap-cell level-1 lp-legend-cell"></div>
                  <div className="lp-heatmap-cell level-2 lp-legend-cell"></div>
                  <div className="lp-heatmap-cell level-3 lp-legend-cell"></div>
                  <div className="lp-heatmap-cell level-4 lp-legend-cell"></div>
                  <span className="lp-legend-label">MORE</span>
                </div>
              </div>
            </div>

            {/* Stats Dashboard */}
            <div className="lp-stats-section">
              <div className="lp-section-divider">
                <span>SYSTEM_TELEMETRY</span>
              </div>
              <div className="lp-stats-grid">
                <div className="lp-stat-card">
                  <div className="lp-stat-value">{data.habits.length}</div>
                  <div className="lp-stat-label">TOTAL_TRACKS</div>
                </div>
                <div className="lp-stat-card">
                  <div className="lp-stat-value highlighted">{globalStats.totalCompletions}</div>
                  <div className="lp-stat-label">TOTAL_ACTIONS</div>
                </div>
                <div className="lp-stat-card">
                  <div className="lp-stat-value highlighted">{globalStats.perfectDays}</div>
                  <div className="lp-stat-label">PERFECT_DAYS</div>
                </div>
                <div className="lp-stat-card">
                  <div className="lp-stat-value">
                    {data.habits.length > 0 ? Math.max(...data.habits.map(h => calculateStreak(h.id).max)) : 0}
                  </div>
                  <div className="lp-stat-label">MAX_STREAK</div>
                </div>
              </div>
            </div>

            {progressPercent === 100 && data.habits.length > 0 && (
              <div className="lp-all-done-banner">
                <span className="lp-banner-icon">🔥</span>
                <span className="lp-banner-text">ALL_SYSTEMS_NOMINAL // DAILY_QUOTA_MET</span>
              </div>
            )}

          </div>
        </div>
        <LegalFooter />
      </div>

      {/* Add Habit Modal */}
      {isAddModalOpen && (
        <div className="lp-modal-overlay">
          <div className="lp-modal-box">
            <div className="lp-modal-header">
              <h2 className="lp-modal-title">NEW_HABIT_TRACK</h2>
              <button className="lp-modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            
            <div className="lp-modal-field">
              <label className="lp-modal-label">IDENTIFIER (NAME)</label>
              <input 
                type="text" 
                className="lp-modal-input" 
                placeholder="e.g. Meditate 10m"
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="lp-modal-field">
              <label className="lp-modal-label">ASSIGN_EMOJI</label>
              <div className="lp-picker-grid">
                {EMOJI_LIST.map(emoji => (
                  <div 
                    key={emoji}
                    className={`lp-picker-item ${newHabitEmoji === emoji ? 'selected' : ''}`}
                    onClick={() => setNewHabitEmoji(emoji)}
                  >
                    {emoji}
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-modal-field">
              <label className="lp-modal-label">ASSIGN_COLOR_KEY</label>
              <div className="lp-picker-grid">
                {COLOR_LIST.map(color => (
                  <div 
                    key={color}
                    className={`lp-picker-item ${newHabitColor === color ? 'selected' : ''}`}
                    onClick={() => setNewHabitColor(color)}
                    style={{ borderColor: newHabitColor === color ? color : '' }}
                  >
                    <div className="lp-color-swatch" style={{ background: color }}></div>
                  </div>
                ))}
              </div>
            </div>

            <button 
              className="lp-modal-submit" 
              onClick={addHabit}
              disabled={!newHabitName.trim()}
            >
              INITIALIZE_TRACKER
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {habitToDelete && (
        <div className="lp-modal-overlay">
          <div className="lp-confirm-box">
            <div className="lp-confirm-icon">⚠️</div>
            <h2 className="lp-confirm-title">CONFIRM_TERMINATION</h2>
            <p className="lp-confirm-desc">Are you sure you want to delete this habit? All associated history and streaks will be permanently purged.</p>
            <div className="lp-confirm-actions">
              <button className="lp-confirm-cancel" onClick={() => setHabitToDelete(null)}>ABORT</button>
              <button className="lp-confirm-delete" onClick={() => deleteHabit(habitToDelete)}>PURGE_RECORD</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LifePulse;
