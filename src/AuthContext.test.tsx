import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'

vi.mock('./firebase', () => ({
  auth: {},
  googleProvider: {},
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  GoogleAuthProvider: {
    credentialFromResult: vi.fn(),
  },
}))

const TestComponent = () => {
  const { user, googleAccessToken, login, logout } = useAuth()
  return (
    <div>
      <div data-testid="user">{user ? 'Logged In' : 'Logged Out'}</div>
      <div data-testid="token">{googleAccessToken || 'No Token'}</div>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('does NOT store token in localStorage on login', async () => {
    const mockToken = 'mock-google-token'
    const mockResult = { user: { uid: '123' } }

    // @ts-expect-error - mocking signInWithPopup
    signInWithPopup.mockResolvedValue(mockResult)
    // @ts-expect-error - mocking credentialFromResult
    GoogleAuthProvider.credentialFromResult.mockReturnValue({ accessToken: mockToken })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    fireEvent.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken)
    })

    expect(localStorage.getItem('google_access_token')).toBeNull()
  })
})
