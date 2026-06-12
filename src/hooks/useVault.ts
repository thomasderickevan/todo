import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { useDriveSync } from './useDriveSync';
import { encryptPassword, decryptPassword } from '../utils/cryptoUtils';

export interface VaultEntry {
  id: string;
  serviceName: string;
  username: string;
  encryptedPassword: string;
  createdAt: number;
  userId: string;
}

const getLocalVaultKey = (userId?: string) =>
  userId ? `local_vault_passwords_${userId}` : 'local_vault_passwords_guest';

const loadLocalVaultEntries = (userId?: string): VaultEntry[] => {
  try {
    const raw = localStorage.getItem(getLocalVaultKey(userId));
    return raw ? JSON.parse(raw) as VaultEntry[] : [];
  } catch (error) {
    console.error('Failed to read local vault cache:', error);
    return [];
  }
};

const saveLocalVaultEntries = (entries: VaultEntry[], userId?: string) => {
  localStorage.setItem(getLocalVaultKey(userId), JSON.stringify(entries));
};

export const DRIVE_VAULT_BACKUP_FILE = 'endeavor_vault_backup.json';

export const useVault = () => {
  const { user, googleAccessToken } = useAuth();
  const { saveToDrive, getFromDrive, isSyncing } = useDriveSync();
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      setVaultEntries(loadLocalVaultEntries());
      return;
    }

    const q = query(
      collection(db, "vault_passwords"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VaultEntry[];
      entries.sort((a, b) => b.createdAt - a.createdAt);
      setVaultEntries(entries);
      saveLocalVaultEntries(entries, user.uid);
    }, (error) => {
      console.error("Vault listener error:", error);
      setVaultEntries(loadLocalVaultEntries(user.uid));
    });

    return () => unsubscribe();
  }, [user]);

  const syncVaultBackupToDrive = useCallback(async (entries: VaultEntry[]) => {
    if (!user || !googleAccessToken) {
      return;
    }

    await saveToDrive(
      DRIVE_VAULT_BACKUP_FILE,
      JSON.stringify(entries, null, 2),
      {
        convertToGoogleDoc: false,
        mimeType: 'application/json',
      }
    );
  }, [user, googleAccessToken, saveToDrive]);

  const saveToVault = async (serviceName: string, vaultUsername: string, masterPin: string, password: string) => {
    if (!user) {
      alert("Please sign in to use the Shield Vault.");
      return false;
    }
    if (!serviceName.trim()) {
      alert("Please provide a Service Name (e.g., Netflix).");
      return false;
    }
    if (!masterPin.trim()) {
      alert("Please set a Master PIN to encrypt your password.");
      return false;
    }

    setIsSaving(true);
    const entryData = {
      serviceName: serviceName.trim(),
      username: vaultUsername.trim(),
      encryptedPassword: encryptPassword(password, masterPin),
      createdAt: Date.now(),
      userId: user.uid
    };

    try {
      await addDoc(collection(db, "vault_passwords"), entryData);
      const updatedEntries = [
        {
          id: `pending-${entryData.createdAt}`,
          ...entryData,
        },
        ...vaultEntries,
      ].sort((a, b) => b.createdAt - a.createdAt);

      await syncVaultBackupToDrive(updatedEntries);
      alert(`Successfully locked credentials for ${serviceName} in your vault!`);
      return true;
    } catch (error) {
      console.error("Vault Save Error:", error);
      const fallbackEntry: VaultEntry = {
        id: `local-${entryData.createdAt}`,
        ...entryData
      };
      const updatedEntries = [fallbackEntry, ...vaultEntries].sort((a, b) => b.createdAt - a.createdAt);
      setVaultEntries(updatedEntries);
      saveLocalVaultEntries(updatedEntries, user.uid);
      await syncVaultBackupToDrive(updatedEntries);
      alert(`Saved ${entryData.serviceName} locally because cloud vault save failed.`);
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  const revealPassword = (entry: VaultEntry, masterPin: string) => {
    if (!masterPin.trim()) {
      alert("Please enter your Master PIN to reveal passwords.");
      return;
    }
    const originalText = decryptPassword(entry.encryptedPassword, masterPin);
    if (originalText) {
      setRevealedIds(prev => ({ ...prev, [entry.id]: originalText }));
    } else {
      alert("Incorrect Master PIN. Decryption failed.");
    }
  };

  const deleteEntry = async (entry: VaultEntry) => {
    if (window.confirm("Are you sure you want to delete this vault entry?")) {
      try {
        if (user && !entry.id.startsWith('local-')) {
          await deleteDoc(doc(db, "vault_passwords", entry.id));
          const updatedEntries = vaultEntries.filter((item) => item.id !== entry.id);
          await syncVaultBackupToDrive(updatedEntries);
        } else {
          const updatedEntries = vaultEntries.filter((item) => item.id !== entry.id);
          setVaultEntries(updatedEntries);
          saveLocalVaultEntries(updatedEntries, user?.uid);
          await syncVaultBackupToDrive(updatedEntries);
        }
      } catch (error) {
        console.error("Error deleting vault entry:", error);
        alert("Failed to delete entry.");
      }
    }
  };

  const handleSyncToDrive = async () => {
    if (!googleAccessToken) {
      alert("Please re-authorize Google Drive access by signing out and in again.");
      return;
    }

    await syncVaultBackupToDrive(vaultEntries);
  };

  const handleRestoreFromDrive = async () => {
    if (!user || !googleAccessToken) {
      alert("Please sign in with Google to restore your vault.");
      return;
    }

    if (window.confirm("This will merge your Drive backup into your current vault. Continue?")) {
      const content = await getFromDrive(DRIVE_VAULT_BACKUP_FILE);
      if (!content) return;

      try {
        const restoredEntries = JSON.parse(content) as VaultEntry[];
        console.log(`Found ${restoredEntries.length} entries in backup.`);

        for (const entry of restoredEntries) {
          const exists = vaultEntries.some(e =>
            e.serviceName === entry.serviceName &&
            e.encryptedPassword === entry.encryptedPassword
          );

          if (!exists) {
            const cleanEntry = { ...entry } as Partial<VaultEntry>;
            delete cleanEntry.id;
            await addDoc(collection(db, "vault_passwords"), {
              ...cleanEntry,
              userId: user.uid,
              createdAt: entry.createdAt || Date.now()
            });
          }
        }
      } catch (error) {
        console.error("Restore parsing error:", error);
        alert("Failed to parse backup file. It may be corrupted.");
      }
    }
  };

  return {
    vaultEntries,
    isSaving,
    isSyncing,
    revealedIds,
    saveToVault,
    revealPassword,
    deleteEntry,
    handleSyncToDrive,
    handleRestoreFromDrive
  };
};
