import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import VoiceNotes from './VoiceNotes'

// Mock dependencies
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    googleAccessToken: null,
  }),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('../hooks/useDriveSync', () => ({
  useDriveSync: () => ({
    saveToDrive: vi.fn(),
    isSyncing: false,
  }),
}));

vi.mock('./Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('./LegalFooter', () => ({
  default: () => <div data-testid="legal-footer" />,
}));

vi.mock('./GuestStorageNotice', () => ({
  default: () => <div data-testid="guest-notice" />,
}));

const mockStart = vi.fn().mockImplementation(function(this: unknown) {
  const recognition = this as { onstart?: () => void };
  if (recognition.onstart) {
    recognition.onstart();
  }
});
const mockStop = vi.fn();

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = mockStart;
  stop = mockStop;
}

// @ts-expect-error - Mocking global SpeechRecognition
window.SpeechRecognition = MockSpeechRecognition;
// @ts-expect-error - Mocking global webkitSpeechRecognition
window.webkitSpeechRecognition = MockSpeechRecognition;

describe('VoiceNotes Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockClear();
    mockStop.mockClear();
    mockStop.mockImplementation(() => {});
  });

  it('gracefully handles error when recognition.stop() fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <VoiceNotes />
      </MemoryRouter>
    );

    // 1. Start recording
    const recordButton = screen.getByText('🎙️').closest('.mc-record-btn')!;

    await act(async () => {
        fireEvent.click(recordButton);
    });

    // Verify it is recording
    expect(screen.getByText('LISTENING... TAP_TO_SAVE')).toBeInTheDocument();

    // 2. Mock stop() to throw error
    const mockStopError = new Error('Stop failed');
    mockStop.mockImplementation(() => {
        throw mockStopError;
    });

    // 3. Stop recording
    await act(async () => {
        fireEvent.click(recordButton);
    });

    // 4. Verify console.warn was called
    expect(consoleWarnSpy).toHaveBeenCalledWith("Recognition stop error:", mockStopError);

    // 5. Verify recording state is reset in UI
    expect(screen.getByText('INITIALIZE_VOICE_CAPTURE')).toBeInTheDocument();

    consoleWarnSpy.mockRestore();
  });
});
