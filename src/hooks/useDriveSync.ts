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

  const getFromDrive = useCallback(async (fileName: string): Promise<string | null> => {
    if (!user || !googleAccessToken) {
      alert("Please sign in again to re-authorize Google Drive access.");
      return null;
    }

    setIsSyncing(true);
    try {
      // 1. Search for the file by name
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}'&fields=files(id, name)`,
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );

      if (!searchResponse.ok) throw new Error("Failed to search Google Drive");
      const searchResult = await searchResponse.json();

      if (!searchResult.files || searchResult.files.length === 0) {
        alert(`No backup file named "${fileName}" found in your Google Drive.`);
        return null;
      }

      const fileId = searchResult.files[0].id;

      // 2. Download the file content
      // Note: If the file was saved as a Google Doc, we need to export it as text
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );

      if (!downloadResponse.ok) {
        // Try direct download if export fails (in case it's not a Google Doc)
        const directResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
          }
        );
        if (!directResponse.ok) throw new Error("Failed to download file from Drive");
        return await directResponse.text();
      }

      return await downloadResponse.text();
    } catch (error: any) {
      console.error("Drive download error:", error);
      alert(`Failed to restore from Drive: ${error.message}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, googleAccessToken]);

  return { saveToDrive, getFromDrive, isSyncing };
};
