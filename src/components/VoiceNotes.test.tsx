import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import VoiceNotes from './VoiceNotes'
import { useAuth } from '../AuthContext'
import { addDoc } from 'firebase/firestore'

// Mock Auth
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

// Mock useDriveSync
vi.mock('../hooks/useDriveSync', () => ({
  useDriveSync: () => ({
    saveToDrive: vi.fn(),
    isSyncing: false,
  }),
}));

// Mock Audio
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  volume = 1;
}
window.Audio = MockAudio as unknown as typeof Audio;

interface MockSpeechRecognitionInstance {
  onstart: (() => void) | null;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

let mockRecognitionInstance: MockSpeechRecognitionInstance | null = null;

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    mockRecognitionInstance = this as unknown as MockSpeechRecognitionInstance;
  }

  start = vi.fn(() => {
    if (mockRecognitionInstance?.onstart) {
      mockRecognitionInstance.onstart();
    }
  });
  stop = vi.fn(() => {
    if (mockRecognitionInstance?.onend) {
      mockRecognitionInstance.onend();
    }
  });
}

const SpeechRecognitionMock = MockSpeechRecognition as unknown as { new(): MockSpeechRecognition };
(window as unknown as Record<string, unknown>).SpeechRecognition = SpeechRecognitionMock;
(window as unknown as Record<string, unknown>).webkitSpeechRecognition = SpeechRecognitionMock;

describe('VoiceNotes Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      user: { uid: 'test-user', displayName: 'Test User', photoURL: '' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      googleAccessToken: 'test-token',
    });
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('shows alert when saving to Firestore fails', async () => {
    const error = new Error('Firestore Error');
    (addDoc as Mock).mockRejectedValueOnce(error);

    render(
      <MemoryRouter>
        <VoiceNotes />
      </MemoryRouter>
    );

    const recordHint = screen.getByText('INITIALIZE_VOICE_CAPTURE');
    expect(recordHint).toBeInTheDocument();

    const recordButton = recordHint.previousElementSibling;
    expect(recordButton).toHaveClass('mc-record-btn');

    // Start recording
    fireEvent.click(recordButton!);

    // Check if it's recording
    expect(screen.getByText('LISTENING... TAP_TO_SAVE')).toBeInTheDocument();

    // Simulate speech recognition result
    if (mockRecognitionInstance && mockRecognitionInstance.onresult) {
      mockRecognitionInstance.onresult({
        results: [
          [{ transcript: 'This is a test transcript' }]
        ]
      });
    }

    // Wait for transcript to be rendered
    expect(await screen.findByText('This is a test transcript')).toBeInTheDocument();

    // Stop recording to trigger save
    const stopButton = screen.getByText('LISTENING... TAP_TO_SAVE').previousElementSibling;
    fireEvent.click(stopButton!);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to save note.');
    });
  });
});
