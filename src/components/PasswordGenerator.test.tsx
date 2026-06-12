import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import PasswordGenerator from './PasswordGenerator';
import { useAuth } from '../AuthContext';
import { deleteDoc, onSnapshot, Query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  initializeFirestore: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  db: {},
}));

vi.mock('../firebase', () => ({
  db: {},
  auth: {},
  googleProvider: {
    addScope: vi.fn(),
  },
}));

vi.mock('../hooks/useDriveSync', () => ({
  useDriveSync: () => ({
    saveToDrive: vi.fn(),
    getFromDrive: vi.fn(),
    isSyncing: false,
  }),
}));

// Mock window.confirm
window.confirm = vi.fn(() => true);
// Mock window.alert
window.alert = vi.fn();

describe('PasswordGenerator Deletion Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an alert and logs an error when deleteDoc fails', async () => {
    const mockUser = { uid: 'test-user-id' };
    (useAuth as Mock).mockReturnValue({
      user: mockUser,
      googleAccessToken: 'fake-token',
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Firestore delete failed');
    (deleteDoc as Mock).mockRejectedValue(mockError);

    // Mock onSnapshot to provide one entry
    (onSnapshot as Mock).mockImplementation((_q: Query, callback: (snapshot: QuerySnapshot<DocumentData>) => void) => {
      callback({
        docs: [
          {
            id: 'entry-1',
            data: () => ({
              serviceName: 'Test Service',
              username: 'testuser',
              encryptedPassword: 'encrypted',
              createdAt: Date.now(),
              userId: 'test-user-id',
            }),
          },
        ],
      } as QuerySnapshot<DocumentData>);
      return vi.fn(); // unsubscribe
    });

    render(
      <MemoryRouter>
        <PasswordGenerator />
      </MemoryRouter>
    );

    // Click to expand the vault
    const toggleButton = await screen.findByText(/ACCESS_VAULT_DATABASE/);
    fireEvent.click(toggleButton);

    // Find and click the delete button (TERMINATE)
    const deleteButton = await screen.findByText('TERMINATE');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting vault entry:', mockError);
      expect(window.alert).toHaveBeenCalledWith('Failed to delete entry.');
    });

    consoleErrorSpy.mockRestore();
  });
});
