import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDriveSync } from '../hooks/useDriveSync';
import { useLifePulseData } from '../hooks/useLifePulseData';
import { useLifePulseStats } from '../hooks/useLifePulseStats';
import type { HeatmapDay } from '../types/lifepulse';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import GuestStorageNotice from './GuestStorageNotice';
import guestUserIcon from '../assets/guest-user.svg';
import './LifePulse.css';

const EMOJI_LIST = ['🔥', '💧', '🏃', '📚', '🧘', '🥗', '💻', '🎸', '🎨', '🧹', '😴', '💊'];
const COLOR_LIST = ['#FF6B35', '#00FF41', '#00E5FF', '#FF003C', '#FFEA00', '#FF00FF', '#7C4DFF', '#00FFCC'];

const LifePulse: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading: authLoading } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();

  const {
    data,
    dataLoaded,
    addHabit,
    deleteHabit,
    toggleHabit,
  } = useLifePulseData();

  const {
    calculateStreak,
    globalStats,
    heatmapColumns,
    todayStr
  } = useLifePulseStats(data);

  // Modals (UI State)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState(EMOJI_LIST[0]);
  const [newHabitColor, setNewHabitColor] = useState(COLOR_LIST[0]);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);

  useEffect(() => {
    document.title = '✦ endeavor • LifePulse';
  }, []);

  const handleSyncToDrive = async () => {
    await saveToDrive(
      'endeavor_lifepulse_backup.json',
      JSON.stringify(data, null, 2),
      { convertToGoogleDoc: false, mimeType: 'application/json' }
    );
  };

  const handleAddHabit = () => {
    addHabit(newHabitName, newHabitEmoji, newHabitColor);
    setNewHabitName('');
    setIsAddModalOpen(false);
  };

  const handleDeleteHabit = (id: string) => {
    deleteHabit(id);
    setHabitToDelete(null);
  };

  // ── Calculations for UI ─────────────────────────────────────────
  const todayCompletedCount = data.logs[todayStr]?.length || 0;
  const progressPercent = data.habits.length === 0 ? 0 : Math.round((todayCompletedCount / data.habits.length) * 100);

  if (authLoading || !dataLoaded) {
    return (
      <div className="lp-loading-screen">
        <div className="lp-loading-spinner"></div>
        <div className="lp-loading-text">SYNCHRONIZING_CORE...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="lp-page-container">
        <div className="lp-main-content">
          <div className="lp-glass-card">

            {/* Header Section */}
            <div className="lp-header">
              <div className="lp-header-left">
                <h1 className="lp-title">LIFE_PULSE <span className="lp-version">v2.4.0</span></h1>
                <p className="lp-subtitle">QUANTIFIED_SELF // BIOMETRIC_ROUTINE_TRACKER</p>
              </div>
              <div className="lp-header-right">
                {user ? (
                  <div className="lp-user-profile">
                    <img src={user.photoURL || guestUserIcon} alt="Profile" className="lp-avatar" />
                    <div className="lp-user-info">
                      <span className="lp-username">{user.displayName || 'ANONYMOUS_OPERATOR'}</span>
                      <button className="lp-logout-btn" onClick={logout}>TERMINATE_SESSION</button>
                    </div>
                  </div>
                ) : (
                  <button className="lp-login-btn" onClick={login}>INITIATE_AUTH_LINK</button>
                )}
              </div>
            </div>

            {!user && (
              <GuestStorageNotice
                storageKey="lifepulse_guest_notice"
                message="Your habits are saved locally. Sign in to sync across devices."
              />
            )}

            {/* Top Grid: Actions & Today Summary */}
            <div className="lp-top-grid">
              <div className="lp-action-card">
                <div className="lp-action-title">DATA_OPERATIONS</div>
                <div className="lp-action-buttons">
                  <button className="lp-btn primary" onClick={() => setIsAddModalOpen(true)}>+ NEW_TRACK</button>
                  <button
                    className="lp-btn secondary"
                    onClick={handleSyncToDrive}
                    disabled={isSyncing || !user}
                  >
                    {isSyncing ? 'SYNCING...' : 'DRIVE_BACKUP'}
                  </button>
                  <button className="lp-btn secondary" onClick={() => navigate('/portal')}>HUB_RETURN</button>
                </div>
              </div>

              <div className="lp-today-card">
                <div className="lp-today-header">
                  <span className="lp-today-label">CURRENT_CYCLE</span>
                  <span className="lp-today-date">{todayStr}</span>
                </div>
                <div className="lp-progress-ring-container">
                  <div className="lp-progress-ring" style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}>
                    <span className="lp-ring-value">{progressPercent}%</span>
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
                      {col.map((day: HeatmapDay, rowIdx: number) => (
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
              onClick={handleAddHabit}
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
              <button className="lp-confirm-delete" onClick={() => handleDeleteHabit(habitToDelete)}>PURGE_RECORD</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LifePulse;
