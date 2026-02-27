import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import confetti from 'canvas-confetti'
import AIAssistant from './components/AIAssistant'
import LandingPage from './components/LandingPage'
import LegalFooter from './components/LegalFooter'
import Navbar from './components/Navbar'
import guestUserIcon from './assets/guest-user.svg'
import { auth, googleProvider, db } from './firebase'
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  collection,
  query,
  where,
  orderBy,
  addDoc
} from 'firebase/firestore'
import './App.css'

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  userId: string;
}

type Filter = 'All' | 'Active' | 'Completed';
type Theme = 'light' | 'dark';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(() => sessionStorage.getItem('isGuest') === 'true');
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
  const [loading, setLoading] = useState(true);

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync isGuest to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('isGuest', isGuest.toString());
  }, [isGuest]);

  // Firestore Tasks Listener
  useEffect(() => {
    if (!user) {
      // Load from local storage when no user
      const savedTasks = localStorage.getItem('local_tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        setTasks([]);
      }
      return;
    }

    const q = query(
      collection(db, "todos"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
      setTasks(taskList);
      // No need to manually set localStorage here, the global tasks listener will handle it
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      // Fallback to local storage on firestore error
      const savedTasks = localStorage.getItem('local_tasks');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync to local storage whenever tasks change (provides immediate offline cache)
  useEffect(() => {
    localStorage.setItem('local_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Check your internet or firewall.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsGuest(false);
    sessionStorage.removeItem('isGuest');
    localStorage.removeItem('local_tasks'); // Clear local cache on logout to avoid mixing profiles
    setTasks([]);
  };

  const handleGuestMode = () => {
    setIsGuest(true);
  };

  const handleHomeClick = () => {
    setIsGuest(false);
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
        // Fallback: add to local state if firestore fails
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

    if (user && !task.id.includes('local')) { // Firestore tasks use alphanumeric IDs, local use numeric string
      try {
        await setDoc(doc(db, "todos", task.id), { ...task, completed: nextCompleted });
      } catch (e) {
        console.error("Error toggling Firestore task:", e);
        // Fallback local update
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

  if (loading) return <div className="loading-screen">🌀 Initializing Cyber-Link...</div>;

  if (!user && !isGuest) {
    return (
      <>
        <Navbar onHomeClick={handleHomeClick} showLinks={false} />
        <LandingPage onLogin={handleLogin} onGuest={handleGuestMode} />
      </>
    );
  }

  return (
    <>
      <Navbar onHomeClick={handleHomeClick} />
      <div className="container">
      <div className="todo-card" id="tasks-section">
        <header className="main-header">
          <div className="header-top">
            <div className="user-profile">
              <img src={user?.photoURL || guestUserIcon} alt="Profile" className="avatar" />
              <div className="user-info">
                <span className="welcome">{user ? 'Welcome back,' : 'Guest Mode'}</span>
                <span className="username">{user?.displayName?.split(' ')[0] || 'User'}</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              {user ? (
                <button className="logout-btn" onClick={handleLogout} title="Logout">
                  🚪
                </button>
              ) : (
                <button className="login-btn-small" onClick={handleLogin} title="Login with Google">
                  🔑
                </button>
              )}
            </div>
          </div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
            <span className="progress-text">{progressPercent}% Completed</span>
          </div>
        </header>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <form onSubmit={addTask} className="input-group-vertical">
          <div className="input-row">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          <button type="submit" className="add-btn-large">Add Task</button>
        </form>

        <div className="filters">
          {(['All', 'Active', 'Completed'] as Filter[]).map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <ul className="task-list">
          {filteredTasks.map(task => (
            <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <div className="task-content" onClick={() => toggleTask(task)}>
                <span className="checkbox"></span>
                <span className="task-text">{task.text}</span>
              </div>
              <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                &times;
              </button>
            </li>
          ))}
          {filteredTasks.length === 0 && (
            <li className="empty-state">
              <p>{searchQuery ? 'No matching tasks found.' : 'All caught up!'}</p>
            </li>
          )}
        </ul>

        <footer className="todo-footer">
          {tasks.length > 0 ? (
            <>
              <span>{tasks.length - completedCount} items left</span>
              {completedCount > 0 && (
                <button className="clear-btn" onClick={clearCompleted}>
                  Clear Completed
                </button>
              )}
            </>
          ) : (
            <span className="sync-status">
              {user ? '✨ Synced with Cloud' : '📍 Saving Locally'}
            </span>
          )}
        </footer>
      </div>
      <AIAssistant onAddTask={addTaskVoice} onClearList={clearAllVoice} />
      <LegalFooter />
      <Analytics />
    </div>
    </>
  )
}

export default App
