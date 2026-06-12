import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { signOut, onAuthStateChanged, type Auth } from 'firebase/auth';

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: {
    credentialFromResult: vi.fn(),
  },
}));

vi.mock('./firebase', () => ({
  auth: {} as Auth,
  googleProvider: {},
}));

const TestComponent = () => {
  const { user, logout, loading, googleAccessToken } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user ? 'Logged In' : 'Logged Out'}</div>
      <div data-testid="token">{googleAccessToken || 'No Token'}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides auth status', async () => {
    (onAuthStateChanged as Mock).mockImplementation((_auth: Auth, callback: (user: null) => void) => {
      callback(null);
      return () => {};
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('Logged Out');
  });

  it('handles successful logout', async () => {
    (onAuthStateChanged as Mock).mockImplementation((_auth: Auth, callback: (user: { uid: string }) => void) => {
      callback({ uid: '123' });
      return () => {};
    });

    localStorage.setItem('google_access_token', 'fake-token');
    (signOut as Mock).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('token')).toHaveTextContent('fake-token');

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem('google_access_token')).toBeNull();
    expect(screen.getByTestId('token')).toHaveTextContent('No Token');
  });

  it('handles logout failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (onAuthStateChanged as Mock).mockImplementation((_auth: Auth, callback: (user: { uid: string }) => void) => {
      callback({ uid: '123' });
      return () => {};
    });

    const error = new Error('Sign out failed');
    (signOut as Mock).mockRejectedValue(error);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    expect(signOut).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Logout failed", error);

    consoleSpy.mockRestore();
  });
});
