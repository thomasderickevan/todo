import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PasswordGenerator from './PasswordGenerator'
import CryptoJS from 'crypto-js'

// Mock AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
}));

// Mock useDriveSync
vi.mock('../hooks/useDriveSync', () => ({
  useDriveSync: () => ({
    saveToDrive: vi.fn(),
    getFromDrive: vi.fn(),
    isSyncing: false,
  }),
}));

// Mock components that might cause issues or are not relevant
vi.mock('./Navbar', () => ({
  default: () => <div data-testid="navbar" />
}));
vi.mock('./LegalFooter', () => ({
  default: () => <div data-testid="legal-footer" />
}));
vi.mock('./GuestStorageNotice', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>
}));

const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('PasswordGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <PasswordGenerator />
      </MemoryRouter>
    );
  };

  it('shows an alert when decryption fails', async () => {
    // Setup local storage with an entry
    const entry = {
      id: 'local-123',
      serviceName: 'Test Service',
      username: 'testuser',
      encryptedPassword: 'encrypted-stuff',
      createdAt: Date.now(),
      userId: 'guest'
    };
    localStorage.setItem('local_vault_passwords_guest', JSON.stringify([entry]));

    renderComponent();

    // Open vault
    const toggleButton = screen.getByText(/ACCESS_VAULT_DATABASE/);
    fireEvent.click(toggleButton);

    // Enter incorrect PIN
    const pinInput = screen.getByPlaceholderText('MASTER_PIN');
    fireEvent.change(pinInput, { target: { value: 'wrong-pin' } });

    // Mock CryptoJS to fail
    const decryptSpy = vi.spyOn(CryptoJS.AES, 'decrypt').mockReturnValue({
      toString: vi.fn().mockReturnValue('')
    } as any);

    // Click reveal
    const revealButton = screen.getByText('REVEAL_KEY');
    fireEvent.click(revealButton);

    expect(window.alert).toHaveBeenCalledWith('Incorrect Master PIN. Decryption failed.');
    decryptSpy.mockRestore();
  });

  it('reveals the password when decryption succeeds', async () => {
    const entry = {
      id: 'local-123',
      serviceName: 'Test Service',
      username: 'testuser',
      encryptedPassword: 'encrypted-stuff',
      createdAt: Date.now(),
      userId: 'guest'
    };
    localStorage.setItem('local_vault_passwords_guest', JSON.stringify([entry]));

    renderComponent();

    // Open vault
    const toggleButton = screen.getByText(/ACCESS_VAULT_DATABASE/);
    fireEvent.click(toggleButton);

    // Enter correct PIN
    const pinInput = screen.getByPlaceholderText('MASTER_PIN');
    fireEvent.change(pinInput, { target: { value: 'correct-pin' } });

    // Mock CryptoJS to succeed
    const decryptSpy = vi.spyOn(CryptoJS.AES, 'decrypt').mockReturnValue({
      toString: vi.fn().mockReturnValue('decrypted-password')
    } as any);

    // Click reveal
    const revealButton = screen.getByText('REVEAL_KEY');
    fireEvent.click(revealButton);

    expect(screen.getByText('decrypted-password')).toBeInTheDocument();
    decryptSpy.mockRestore();
  });
});
