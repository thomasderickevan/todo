import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { Analytics } from '@vercel/analytics/react'
import confetti from 'canvas-confetti'
import AIAssistant from './AIAssistant'
import LegalFooter from './LegalFooter'
import Navbar from './Navbar'
import GuestStorageNotice from './GuestStorageNotice'
import guestUserIcon from '../assets/guest-user.svg'
import { db } from '../firebase'
import { 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  collection,
  query,
  where,
  addDoc
} from 'firebase/firestore'
import '../App.css'

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  userId: string;
}

type Filter = 'All' | 'Active' | 'Completed';
type Theme = 'light' | 'dark';

const TodoApp = () => {
  const { user, login, logout, loading: authLoading } = useAuth();
  
  useEffect(() => {
    document.title = 'TaskMaster • endeavor';
  }, []);

  const [isGuest, setIsGuest] = useState(() => {
    const storedGuest = sessionStorage.getItem('isGuest');
    return storedGuest === null ? true : storedGuest === 'true';
  });
  const [tasks, setTasks] = useState<Todo[]>(() => {
    const savedTasks = localStorage.getItem('local_tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  const [filter, setFilter] = useState<Filter>('All');
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Sync isGuest to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('isGuest', isGuest.toString());
  }, [isGuest]);

  // Firestore Tasks Listener
  useEffect(() => {
    if (!user) {
      // Load from local storage when no user
      const savedTasks = localStorage.getItem('local_tasks');
      const initialTasks = savedTasks ? JSON.parse(savedTasks) : [];
      setTasks(initialTasks);
      return;
    }

    const q = query(
      collection(db, "todos"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      // Sort client-side to avoid the need for a composite index (userId + createdAt)
      taskList.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(taskList);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      if (error.code === 'failed-precondition') {
        console.warn("Firestore query failed: Missing index. Sorting in memory instead.");
      }
      const savedTasks = localStorage.getItem('local_tasks');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync to local storage whenever tasks change, but only if NOT signed in
  useEffect(() => {
    if (!user) {
      localStorage.setItem('local_tasks', JSON.stringify(tasks));
    }
  }, [tasks, user]);

  const handleLogin = async () => {
    await login();
  };

  const handleLogout = () => {
    logout();
    setIsGuest(true);
    sessionStorage.setItem('isGuest', 'true');
    localStorage.removeItem('local_tasks');
    setTasks([]);
  };

  const addTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim() === '') return;

    const newTaskData = {
      text: inputValue.trim(),
      completed: false,
      createdAt: Date.now(),
      userId: user?.uid || 'local-user'
    };

    if (user) {
      try {
        await addDoc(collection(db, "todos"), newTaskData);
        setInputValue('');
      } catch (err) {
        console.error("Error adding task to Firestore:", err);
        const newTask = { id: Date.now().toString(), ...newTaskData };
        setTasks(prev => [newTask, ...prev]);
        setInputValue('');
      }
    } else {
      const newTask = { id: Date.now().toString(), ...newTaskData };
      setTasks(prev => [newTask, ...prev]);
      setInputValue('');
    }
  };

  const addTaskVoice = async (taskName: string) => {
    const newTaskData = {
      text: taskName,
      completed: false,
      createdAt: Date.now(),
      userId: user?.uid || 'local-user'
    };

    if (user) {
      try {
        await addDoc(collection(db, "todos"), newTaskData);
      } catch (e) {
        console.error("Error adding voice task to Firestore:", e);
        const newTask = { id: Date.now().toString(), ...newTaskData };
        setTasks(prev => [newTask, ...prev]);
      }
    } else {
      const newTask = { id: Date.now().toString(), ...newTaskData };
      setTasks(prev => [newTask, ...prev]);
    }
  };

  const toggleTask = async (task: Todo) => {
    const nextCompleted = !task.completed;
    
    if (nextCompleted) {
      const audio = new Audio('https://www.myinstants.com/media/sounds/children-yay-sound-effect.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#22c55e', '#ffffff']
      });
    }

    if (user && !task.id.includes('local')) {
      try {
        await setDoc(doc(db, "todos", task.id), { ...task, completed: nextCompleted });
      } catch (e) {
        console.error("Error toggling Firestore task:", e);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t));
      }
    } else {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t));
    }
  };

  const deleteTask = async (id: string) => {
    if (user && isNaN(Number(id))) {
      try {
        await deleteDoc(doc(db, "todos", id));
      } catch (e) {
        console.error("Error deleting Firestore task:", e);
        setTasks(prev => prev.filter(t => t.id !== id));
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const clearCompleted = () => {
    tasks.forEach(async (task) => {
      if (task.completed) {
        await deleteTask(task.id);
      }
    });
  };

  const clearAllVoice = () => {
    tasks.forEach(async (task) => {
      await deleteTask(task.id);
    });
  };

  const filteredTasks = tasks
    .filter(task => {
      const matchesFilter = filter === 'Active' ? !task.completed : (filter === 'Completed' ? task.completed : true);
      const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  if (authLoading) return <div className="loading-screen">🌀 Initializing Cyber-Link...</div>;

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme">
        {/* Visual Layer: Background Texture & Noise */}
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">TASKMASTER</div>
        
        <div className="mc-app-container">
          {!user && (
            <GuestStorageNotice
              storageKey="guest_notice_todo"
              title="GUEST_MODE_ACTIVE"
              message="You are currently using TaskMaster without signing in. Your tasks and assistant activity will stay only on this device for now."
            />
          )}

          <div className="mc-app-card" id="tasks-section" style={{ '--app-color': '#00FF41' } as React.CSSProperties}>
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
                    <span className="mc-username">{user?.displayName?.split(' ')[0] || (user ? 'USER' : 'GUEST')}</span>
                    <span className="mc-status-indicator"></span>
                  </div>
                </div>
                <div className="mc-header-actions">
                  <button className="mc-action-icon" onClick={toggleTheme} aria-label="Toggle Theme">
                    {theme === 'light' ? '🌙' : '☀️'}
                  </button>
                  {user ? (
                    <button className="mc-action-icon" onClick={handleLogout} title="Logout">
                      🚪
                    </button>
                  ) : (
                    <button className="mc-action-icon" onClick={handleLogin} title="Login with Google">
                      🔑
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mc-app-title-group">
                <span className="mc-app-kicker">MOMENTUM // CLARITY</span>
                <h1 className="mc-app-main-title">TASKMASTER</h1>
              </div>

              <div className="mc-progress-section">
                <div className="mc-progress-track">
                  <div className="mc-progress-fill" style={{ width: `${progressPercent}%`, backgroundColor: '#00FF41' }}></div>
                </div>
                <span className="mc-progress-label">{progressPercent}%_COMPLETE</span>
              </div>
            </header>

            <div className="mc-search-bar">
              <input
                type="text"
                placeholder="SEARCH_TASKS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <form onSubmit={addTask} className="mc-input-form">
              <input
                type="text"
                placeholder="ADD_NEW_TASK..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="mc-main-input"
              />
              <button type="submit" className="mc-add-btn">ADD [←]</button>
            </form>

            <div className="mc-filter-bar">
              {(['All', 'Active', 'Completed'] as Filter[]).map(f => (
                <button
                  key={f}
                  className={filter === f ? 'active' : ''}
                  onClick={() => setFilter(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            <ul className="mc-task-list">
              {filteredTasks.map(task => (
                <li key={task.id} className={`mc-task-item ${task.completed ? 'completed' : ''}`}>
                  <div className="mc-task-inner" onClick={() => toggleTask(task)}>
                    <span className="mc-checkbox"></span>
                    <span className="mc-task-text">{task.text}</span>
                  </div>
                  <button className="mc-delete-task" onClick={() => deleteTask(task.id)}>
                    &times;
                  </button>
                </li>
              ))}
              {filteredTasks.length === 0 && (
                <li className="mc-empty-state">
                  <p>{searchQuery ? 'NO_MATCHING_TASKS_FOUND' : 'ALL_CAUGHT_UP'}</p>
                </li>
              )}
            </ul>

            <footer className="mc-app-footer">
              {tasks.length > 0 ? (
                <>
                  <span>{tasks.length - completedCount} ITEMS_REMAINING</span>
                  {completedCount > 0 && (
                    <button className="mc-clear-btn" onClick={clearCompleted}>
                      CLEAR_COMPLETED
                    </button>
                  )}
                </>
              ) : (
                <span className="mc-sync-status">
                  {user ? '✨ SYNC_ACTIVE' : '📍 LOCAL_SAVE'}
                </span>
              )}
            </footer>
          </div>
          
          <AIAssistant onAddTask={addTaskVoice} onClearList={clearAllVoice} />
        </div>
        <LegalFooter />
        <Analytics />
      </div>
    </>
  )
}

export default TodoApp
