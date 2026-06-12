import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import VoiceNotes from './VoiceNotes'
import { useAuth } from '../AuthContext'
import { writeBatch } from 'firebase/firestore'

// Mock dependencies
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: { type: 'firestore' },
  auth: {},
  googleProvider: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../hooks/useDriveSync', () => ({
  useDriveSync: () => ({
    saveToDrive: vi.fn(),
    getFromDrive: vi.fn(),
    isSyncing: false,
  }),
}));

vi.mock('./Navbar', () => ({ default: () => <div data-testid="navbar" /> }));
vi.mock('./LegalFooter', () => ({ default: () => <div data-testid="footer" /> }));
vi.mock('./GuestStorageNotice', () => ({ default: () => <div data-testid="guest-notice" /> }));

// Mock assets
vi.mock('../assets/guest-user.svg', () => ({ default: 'guest-user-icon' }));

describe('VoiceNotes Migration', () => {
  const mockUser = { uid: 'test-user-id', displayName: 'Test User', photoURL: null };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock for useAuth
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('should log an error when migration fails', async () => {
    // Setup: User is logged in and has local notes
    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const localNotes = [
      { id: 'local-1', text: 'Local Note 1', createdAt: Date.now(), userId: '' }
    ];
    localStorage.setItem('local_voice_notes', JSON.stringify(localNotes));

    // Mock writeBatch to fail on commit
    const migrationError = new Error('Migration failed');
    const mockBatch = {
      set: vi.fn(),
      commit: vi.fn().mockRejectedValue(migrationError),
    };
    (writeBatch as any).mockReturnValue(mockBatch);

    // Spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <VoiceNotes />
      </MemoryRouter>
    );

    // Verify: migrateNotes().catch(console.error) was hit
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(migrationError);
    });

    consoleSpy.mockRestore();
  });

  it('should successfully migrate local notes and clear localStorage', async () => {
    // Setup: User is logged in and has local notes
    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const localNotes = [
      { id: 'local-1', text: 'Local Note 1', createdAt: Date.now(), userId: '' }
    ];
    localStorage.setItem('local_voice_notes', JSON.stringify(localNotes));

    // Mock writeBatch to succeed
    const mockBatch = {
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (writeBatch as any).mockReturnValue(mockBatch);

    render(
      <MemoryRouter>
        <VoiceNotes />
      </MemoryRouter>
    );

    // Verify: batch.commit was called and localStorage cleared
    await waitFor(() => {
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(localStorage.getItem('local_voice_notes')).toBeNull();
    });
  });
});
