import { useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';

interface SaveToDriveOptions {
  convertToGoogleDoc?: boolean;
  mimeType?: string;
}

export const useDriveSync = () => {
  const { user, googleAccessToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const saveToDrive = useCallback(async (
    fileName: string,
    content: string,
    options: SaveToDriveOptions = {}
  ) => {
    if (!user || !googleAccessToken) {
      console.warn("User must be logged in with Google to sync with Drive");
      alert("Please sign in again to re-authorize Google Drive access.");
      return;
    }

    const {
      convertToGoogleDoc = true,
      mimeType = 'text/plain',
    } = options;

    setIsSyncing(true);
    try {
      console.log(`Syncing "${fileName}" to Google Drive...`);

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id,name)&pageSize=1`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        throw new Error(errorData.error?.message || 'Failed to search Google Drive');
      }

      const searchResult = await searchResponse.json();
      const existingFileId = searchResult.files?.[0]?.id as string | undefined;

      const metadata = {
        name: fileName,
        mimeType: convertToGoogleDoc ? 'application/vnd.google-apps.document' : mimeType,
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        close_delim;

      const endpoint = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const response = await fetch(endpoint, {
        method: existingFileId ? 'PATCH' : 'POST',
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
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Drive sync error:", err);
      alert(`Failed to sync to Drive: ${err.message}`);
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
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}'&fields=files(id, name, mimeType)`,
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
      const driveMimeType = searchResult.files[0].mimeType as string | undefined;

      // 2. Download the file content
      // Note: If the file was saved as a Google Doc, we need to export it as text
      if (driveMimeType?.startsWith('application/vnd.google-apps')) {
        const downloadResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          {
            headers: { Authorization: `Bearer ${googleAccessToken}` },
          }
        );

        if (!downloadResponse.ok) {
          throw new Error("Failed to export file from Drive");
        }

        return await downloadResponse.text();
      }

      const directResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );
      if (!directResponse.ok) throw new Error("Failed to download file from Drive");
      return await directResponse.text();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Drive download error:", err);
      alert(`Failed to restore from Drive: ${err.message}`);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, googleAccessToken]);

  return { saveToDrive, getFromDrive, isSyncing };
};
