export const WORD_LIST = [
  'apple', 'bridge', 'candle', 'desert', 'eagle', 'forest', 'galaxy', 'honey', 'island', 'jungle',
  'knight', 'lemon', 'mountain', 'nebula', 'ocean', 'planet', 'quartz', 'river', 'shadow', 'tiger',
  'umbrella', 'valley', 'winter', 'xray', 'yellow', 'zebra', 'autumn', 'blossom', 'canyon', 'dawn',
  'echo', 'falcon', 'glacier', 'harvest', 'iceberg', 'jade', 'kite', 'lagoon', 'meadow', 'night',
  'oasis', 'pebble', 'quiver', 'reef', 'storm', 'thunder', 'umbra', 'vortex', 'willow', 'xenon',
  'yacht', 'zenith', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'iota', 'kappa',
  'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'
];

export interface PasswordOptions {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  capitalize: boolean;
  separator: string;
}

export const generateRandomPassword = (length: number, options: Partial<PasswordOptions>) => {
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
  };

  let characters = '';
  if (options.uppercase) characters += charset.uppercase;
  if (options.lowercase) characters += charset.lowercase;
  if (options.numbers) characters += charset.numbers;
  if (options.symbols) characters += charset.symbols;

  if (!characters) {
    return 'Select at least one option';
  }

  let generated = '';
  for (let i = 0; i < length; i++) {
    generated += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return generated;
};

export const generatePassphrase = (wordCount: number, options: Partial<PasswordOptions>) => {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    let styledWord = word;
    if (options.capitalize) {
      styledWord = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(styledWord);
  }
  return words.join(options.separator || '');
};

export const calculateStrength = (password: string, mode: 'password' | 'passphrase', wordCount: number, options: Partial<PasswordOptions>) => {
  let score = 0;
  if (mode === 'password') {
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
  } else {
    if (wordCount >= 3) score++;
    if (wordCount >= 4) score++;
    if (wordCount >= 5) score++;
    if (options.capitalize) score++;
    if (options.separator !== '') score++;
  }

  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Medium';
  if (score <= 5) return 'Strong';
  return 'Very Strong';
};
