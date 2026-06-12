import CryptoJS from 'crypto-js';

export const encryptPassword = (password: string, masterPin: string): string => {
  return CryptoJS.AES.encrypt(password, masterPin).toString();
};

export const decryptPassword = (encryptedPassword: string, masterPin: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, masterPin);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || null;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};
