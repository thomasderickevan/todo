import { useState, useCallback, useEffect } from 'react';
import {
  generateRandomPassword,
  generatePassphrase,
  calculateStrength,
  type PasswordOptions
} from '../utils/passwordUtils';

export const usePasswordGenerator = () => {
  const [mode, setMode] = useState<'password' | 'passphrase'>('password');
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [wordCount, setWordCount] = useState(4);
  const [options, setOptions] = useState<PasswordOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    capitalize: true,
    separator: '-'
  });
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState('');

  const generate = useCallback(() => {
    if (mode === 'password') {
      setPassword(generateRandomPassword(length, options));
    } else {
      setPassword(generatePassphrase(wordCount, options));
    }
    setCopied(false);
  }, [mode, length, wordCount, options]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => {
    setStrength(calculateStrength(password, mode, wordCount, options));
  }, [password, mode, wordCount, options]);

  const copyToClipboard = (text: string) => {
    if (text && text !== 'Select at least one option') {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return {
    mode,
    setMode,
    password,
    length,
    setLength,
    wordCount,
    setWordCount,
    options,
    setOptions,
    copied,
    strength,
    generate,
    copyToClipboard
  };
};
