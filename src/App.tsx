import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import AIAssistant from './components/AIAssistant'
import './App.css'

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type Filter = 'All' | 'Active' | 'Completed';

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
  const [inputValue, setInputValue] = useState('');

  const playYay = () => {
    const audio = new Audio('https://www.myinstants.com/media/sounds/children-yay-sound-effect.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.error("Audio play failed", e));
  };

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const newTask: Todo = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setInputValue('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const nextCompleted = !task.completed;
        if (nextCompleted) {
          playYay();
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

  const addTaskVoice = (taskName: string) => {
    const newTask: Todo = {
      id: crypto.randomUUID(),
      text: taskName,
      completed: false,
    };
    setTasks(prev => [...prev, newTask]);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'Active') return !task.completed;
    if (filter === 'Completed') return task.completed;
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="container">
      <div className="todo-card">
        <header>
          <h1>Tasks</h1>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
            <span className="progress-text">{progressPercent}% Completed</span>
          </div>
        </header>

        <form onSubmit={addTask} className="input-group">
          <input
            type="text"
            placeholder="Add a new task..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="add-btn">Add</button>
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
              <div className="task-content" onClick={() => toggleTask(task.id)}>
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
              <svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" className="celebration-svg">
                <g transform="translate(60, 80)">
                  <circle cx="0" cy="-30" r="20" fill="#FFDBAC" /> <path d="M -15 0 Q 0 10 15 0 L 10 30 L -10 30 Z" fill="#3498db" /> <g>
                    <path d="M 15 5 L 35 -5" stroke="#FFDBAC" strokeWidth="8" strokeLinecap="round" /> <circle cx="35" cy="-5" r="5" fill="#FFDBAC" /> <path d="M 35 -5 L 35 -15" stroke="#FFDBAC" strokeWidth="4" strokeLinecap="round"> <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 35 -5" 
                        to="-20 35 -5" 
                        dur="0.5s" 
                        repeatCount="indefinite" 
                        additive="sum" 
                        calcMode="spline" 
                        keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" 
                        values="0;-20;0" />
                    </path>
                  </g>
                </g>

                <g transform="translate(140, 80)">
                  <circle cx="0" cy="-30" r="20" fill="#F1C27D" /> <path d="M -15 0 Q 0 10 15 0 L 10 30 L -10 30 Z" fill="#e74c3c" /> <g>
                    <path d="M -15 5 L -35 -5" stroke="#F1C27D" strokeWidth="8" strokeLinecap="round" /> <circle cx="-35" cy="-5" r="5" fill="#F1C27D" /> <path d="M -35 -5 L -35 -15" stroke="#F1C27D" strokeWidth="4" strokeLinecap="round"> <animateTransform 
                        attributeName="transform" 
                        type="rotate" 
                        from="0 -35 -5" 
                        to="20 -35 -5" 
                        dur="0.6s" 
                        repeatCount="indefinite" 
                        additive="sum" 
                        calcMode="spline" 
                        keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" 
                        values="0;20;0" />
                    </path>
                  </g>
                </g>
              </svg>
              <p>All caught up!</p>
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
    </div>
  )
}

export default App
