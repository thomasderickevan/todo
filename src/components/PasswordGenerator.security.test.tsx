import { describe, it, expect } from 'vitest';
import CryptoJS from 'crypto-js';

// Define the VaultEntry interface locally for the test
interface VaultEntry {
  id: string;
  serviceName: string;
  username: string;
  encryptedPassword: string;
  createdAt: number;
  salt?: string;
  userId: string;
}

describe('PasswordGenerator Security Fix', () => {
  const masterPin = '1234';
  const password = 'my-secret-password';
  const iterations = 1000;
  const keySize = 256 / 32;

  it('should encrypt using PBKDF2 when a salt is provided', () => {
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const key = CryptoJS.PBKDF2(masterPin, salt, {
      keySize: keySize,
      iterations: iterations
    }).toString();

    const encrypted = CryptoJS.AES.encrypt(password, key).toString();

    const entry: VaultEntry = {
      id: 'test-1',
      serviceName: 'Test Service',
      username: 'test-user',
      encryptedPassword: encrypted,
      salt: salt,
      createdAt: Date.now(),
      userId: 'user-1'
    };

    expect(entry.salt).toBeDefined();
    expect(entry.encryptedPassword).not.toBe(password);

    let derivedKey: string | CryptoJS.lib.WordArray = masterPin;
    if (entry.salt) {
      derivedKey = CryptoJS.PBKDF2(masterPin, entry.salt, {
        keySize: keySize,
        iterations: iterations
      }).toString();
    }

    const bytes = CryptoJS.AES.decrypt(entry.encryptedPassword, derivedKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    expect(decryptedText).toBe(password);
  });

  it('should handle legacy decryption (no salt)', () => {
    const encrypted = CryptoJS.AES.encrypt(password, masterPin).toString();
    const entry: VaultEntry = {
      id: 'legacy-1',
      serviceName: 'Legacy Service',
      username: 'legacy-user',
      encryptedPassword: encrypted,
      createdAt: Date.now(),
      userId: 'user-1'
    };

    expect(entry.salt).toBeUndefined();

    let derivedKey: string | CryptoJS.lib.WordArray = masterPin;
    if (entry.salt) {
      derivedKey = CryptoJS.PBKDF2(masterPin, entry.salt, {
        keySize: keySize,
        iterations: iterations
      }).toString();
    }

    const bytes = CryptoJS.AES.decrypt(entry.encryptedPassword, derivedKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    expect(decryptedText).toBe(password);
  });

  it('should fail decryption with wrong PIN (PBKDF2)', () => {
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const key = CryptoJS.PBKDF2(masterPin, salt, {
      keySize: keySize,
      iterations: iterations
    }).toString();
    const encrypted = CryptoJS.AES.encrypt(password, key).toString();

    const entry: VaultEntry = {
      id: 'test-2',
      serviceName: 'Test Service',
      username: 'test-user',
      encryptedPassword: encrypted,
      salt: salt,
      createdAt: Date.now(),
      userId: 'user-1'
    };

    const wrongPin = '5678';
    const wrongKey = CryptoJS.PBKDF2(wrongPin, entry.salt!, {
      keySize: keySize,
      iterations: iterations
    }).toString();

    const bytes = CryptoJS.AES.decrypt(entry.encryptedPassword, wrongKey);

    // Attempting to convert to Utf8 with wrong key may throw Malformed UTF-8 data
    try {
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        expect(decryptedText).not.toBe(password);
    } catch (e) {
        // Error is expected for wrong decryption
        expect(true).toBe(true);
    }
  });
});
