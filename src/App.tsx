import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import confetti from 'canvas-confetti'
import AIAssistant from './components/AIAssistant'
import './App.css'

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: number;
}

type Filter = 'All' | 'Active' | 'Completed';
type Theme = 'light' | 'dark';

function App() {
  const [tasks, setTasks] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse todos from localStorage", e);
        return [];
      }
    }
    return [];
  });

  const [filter, setFilter] = useState<Filter>('All');
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('Medium');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim() === '') return;

    const newTask: Todo = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
    };

    setTasks([...tasks, newTask]);
    setInputValue('');
  };

  const addTaskVoice = (taskName: string) => {
    const newTask: Todo = {
      id: crypto.randomUUID(),
      text: taskName,
      completed: false,
      priority: 'Medium',
      createdAt: Date.now(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
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
        return { ...task, completed: nextCompleted };
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(task => !task.completed));
  };

  const filteredTasks = tasks
    .filter(task => {
      const matchesFilter = filter === 'Active' ? !task.completed : (filter === 'Completed' ? task.completed : true);
      const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      const priorityMap = { High: 0, Medium: 1, Low: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority] || b.createdAt - a.createdAt;
    });

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className="container">
      <div className="todo-card">
        <header className="main-header">
          <div className="header-top">
            <h1>Tasks</h1>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
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
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as Todo['priority'])}
              className={`priority-select ${priority.toLowerCase()}`}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
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
            <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''} prio-${task.priority.toLowerCase()}`}>
              <div className="task-content" onClick={() => toggleTask(task.id)}>
                <span className={`checkbox prio-${task.priority.toLowerCase()}`}></span>
                <div className="text-wrapper">
                  <span className="task-text">{task.text}</span>
                  <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                </div>
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
      <AIAssistant onAddTask={addTaskVoice} onClearList={() => setTasks([])} />
      <Analytics />
    </div>
  )
}

export default App
