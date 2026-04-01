import { useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';

export const useDriveSync = () => {
  const { user, googleAccessToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const saveToDrive = useCallback(async (fileName: string, content: string) => {
    if (!user || !googleAccessToken) {
      console.warn("User must be logged in with Google to sync with Drive");
      alert("Please sign in again to re-authorize Google Drive access.");
      return;
    }

    setIsSyncing(true);
    try {
      console.log(`Syncing "${fileName}" to Google Drive...`);
      
      const metadata = {
        name: fileName,
        mimeType: 'application/vnd.google-apps.document', // Convert to Google Doc
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/plain\r\n\r\n' +
        content +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload to Google Drive');
      }

      const result = await response.json();
      console.log('Successfully synced to Drive:', result);
      alert(`Saved to Google Drive as "${fileName}"`);
      
    } catch (error: any) {
      console.error("Drive sync error:", error);
      alert(`Failed to sync to Drive: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user, googleAccessToken]);

  return { saveToDrive, isSyncing };
};
