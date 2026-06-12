import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import React from 'react';

// Mock Firebase
vi.mock('./firebase', () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: {
    credentialFromResult: vi.fn(),
  },
}));

const TestComponent = () => {
  const { login } = useAuth();
  return <button onClick={login}>Login</button>;
};

describe('AuthContext Login Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default implementation for onAuthStateChanged to avoid errors during render
    vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
      if (typeof callback === 'function') {
        callback(null);
      }
      return vi.fn();
    });
  });

  it('handles login failure correctly', async () => {
    const error = new Error('Network error');
    vi.mocked(signInWithPopup).mockRejectedValueOnce(error);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Login failed", error);
      expect(window.alert).toHaveBeenCalledWith("Login failed. Check your internet or firewall.");
    });
  });
});
