import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDriveSync } from './useDriveSync';
import { useAuth } from '../AuthContext';

// Mock useAuth
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useDriveSync', () => {
  const mockGoogleAccessToken = 'mock-token';
  const mockUser = { uid: '123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      googleAccessToken: mockGoogleAccessToken,
    });

    // Mock global fetch
    global.fetch = vi.fn();

    // Mock window.alert
    window.alert = vi.fn();

    // Mock console.error to keep the test output clean
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should handle search Drive failure and show alert with error message', async () => {
    const errorMessage = 'Custom search error';
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: errorMessage } }),
    });

    const { result } = renderHook(() => useDriveSync());

    await act(async () => {
      await result.current.saveToDrive('test.txt', 'hello world');
    });

    expect(window.alert).toHaveBeenCalledWith(`Failed to sync to Drive: ${errorMessage}`);
  });
});
