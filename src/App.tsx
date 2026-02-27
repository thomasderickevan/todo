import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import confetti from 'canvas-confetti'
import AIAssistant from './components/AIAssistant'
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
  const [tasks, setTasks] = useState<Todo[]>([]);
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

  // Firestore Tasks Listener
  useEffect(() => {
    if (!user) {
      setTasks([]);
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
    }, (error) => {
      console.error("Firestore Listen Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const addTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim() === '' || !user) return;

    try {
      const newTask = {
        text: inputValue.trim(),
        completed: false,
        createdAt: Date.now(),
        userId: user.uid
      };

      console.log("Attempting to add task:", newTask);
      await addDoc(collection(db, "todos"), newTask);
      console.log("Task added successfully!");
      setInputValue('');
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task. Please check your Firestore rules.");
    }
  };

  const addTaskVoice = async (taskName: string) => {
    if (!user) return;
    try {
      const newTask = {
        text: taskName,
        completed: false,
        createdAt: Date.now(),
        userId: user.uid
      };
      await addDoc(collection(db, "todos"), newTask);
    } catch (e) {
      console.error("Error adding voice task:", e);
    }
  };

  const toggleTask = async (task: Todo) => {
    if (!user) return;
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

    try {
      await setDoc(doc(db, "todos", task.id), { ...task, completed: nextCompleted });
    } catch (e) {
      console.error("Error toggling task:", e);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "todos", id));
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  };

  const clearCompleted = () => {
    tasks.forEach(async (task) => {
      if (task.completed) {
        try {
          await deleteDoc(doc(db, "todos", task.id));
        } catch (e) {
          console.error("Error clearing task:", e);
        }
      }
    });
  };

  const clearAllVoice = () => {
    tasks.forEach(async (task) => {
      try {
        await deleteDoc(doc(db, "todos", task.id));
      } catch (e) {
        console.error("Error clearing task voice:", e);
      }
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

  return (
    <div className="container">
      {!user ? (
        <div className="login-card">
          <h1>Student Helper</h1>
          <p>Sign in to sync your study tasks across all devices.</p>
          <button className="google-btn" onClick={handleLogin}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Continue with Google
          </button>
        </div>
      ) : (
        <div className="todo-card">
          <header className="main-header">
            <div className="header-top">
              <div className="user-profile">
                <img src={user.photoURL || 'https://via.placeholder.com/40'} alt="Profile" className="avatar" />
                <div className="user-info">
                  <span className="welcome">Welcome back,</span>
                  <span className="username">{user.displayName?.split(' ')[0]}</span>
                </div>
              </div>
              <div className="header-actions">
                <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <button className="logout-btn" onClick={handleLogout} title="Logout">
                  🚪
                </button>
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

          {tasks.length > 0 && (
            <footer className="todo-footer">
              <span>{tasks.length - completedCount} items left</span>
              {completedCount > 0 && (
                <button className="clear-btn" onClick={clearCompleted}>
                  Clear Completed
                </button>
              )}
            </footer>
          )}
        </div>
      )}
      {user && <AIAssistant onAddTask={addTaskVoice} onClearList={clearAllVoice} />}
      <Analytics />
    </div>
  )
}

export default App
