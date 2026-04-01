import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock Auth
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Firebase
vi.mock('./firebase', () => ({
  db: {},
  auth: {},
  googleProvider: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
}));

// Mock Audio
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  volume = 1;
}
window.Audio = MockAudio as any;

describe('Todo App', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Set guest mode to true to bypass landing page in TodoApp
    sessionStorage.setItem('isGuest', 'true');
  });

  const renderApp = () => {
    render(
      <MemoryRouter initialEntries={['/todo']}>
        <App />
      </MemoryRouter>
    );
  };

  it('renders the Todo App title', () => {
    renderApp();
    // The Navbar has "Tasks" text
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('can add a new task', () => {
    renderApp();
    const input = screen.getByPlaceholderText('What needs to be done?');
    const addButton = screen.getByText('Add Task');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('can toggle task completion', () => {
    renderApp();
    const input = screen.getByPlaceholderText('What needs to be done?');
    const addButton = screen.getByText('Add Task');

    fireEvent.change(input, { target: { value: 'Test task' } });
    fireEvent.click(addButton);

    const taskText = screen.getByText('Test task');
    fireEvent.click(taskText);

    const taskItem = taskText.closest('li');
    expect(taskItem).toHaveClass('completed');
  });

  it('can delete a task', () => {
    renderApp();
    const input = screen.getByPlaceholderText('What needs to be done?');
    const addButton = screen.getByText('Add Task');

    fireEvent.change(input, { target: { value: 'Task to delete' } });
    fireEvent.click(addButton);

    const deleteButton = screen.getByText('×');
    fireEvent.click(deleteButton);

    expect(screen.queryByText('Task to delete')).not.toBeInTheDocument();
  });

  it('filters tasks correctly', () => {
    renderApp();
    const input = screen.getByPlaceholderText('What needs to be done?');
    const addButton = screen.getByText('Add Task');

    // Add active task
    fireEvent.change(input, { target: { value: 'Active task' } });
    fireEvent.click(addButton);

    // Add completed task
    fireEvent.change(input, { target: { value: 'Completed task' } });
    fireEvent.click(addButton);
    fireEvent.click(screen.getByText('Completed task'));

    // Switch to Completed filter
    fireEvent.click(screen.getByText('Completed'));
    expect(screen.getByText('Completed task')).toBeInTheDocument();
    expect(screen.queryByText('Active task')).not.toBeInTheDocument();

    // Switch to Active filter
    fireEvent.click(screen.getByText('Active'));
    expect(screen.queryByText('Completed task')).not.toBeInTheDocument();
    expect(screen.getByText('Active task')).toBeInTheDocument();
  });
});
