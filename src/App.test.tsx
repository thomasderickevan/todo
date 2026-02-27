import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
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
  });

  it('renders the Todo App title', () => {
    render(<App />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('can add a new task', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a new task...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('can toggle task completion', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a new task...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Test task' } });
    fireEvent.click(addButton);

    const taskText = screen.getByText('Test task');
    fireEvent.click(taskText);

    const taskItem = taskText.closest('li');
    expect(taskItem).toHaveClass('completed');
  });

  it('can delete a task', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a new task...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Task to delete' } });
    fireEvent.click(addButton);

    const deleteButton = screen.getByText('×');
    fireEvent.click(deleteButton);

    expect(screen.queryByText('Task to delete')).not.toBeInTheDocument();
  });

  it('filters tasks correctly', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Add a new task...');
    const addButton = screen.getByText('Add');

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
