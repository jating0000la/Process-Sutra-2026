import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

const FOLDER_NAME = 'ProcessSutra Files';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface DriveFileMetadata {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  webContentLink?: string;
  createdTime: string;
}

/**
 * Get or create the ProcessSutra folder in user's Google Drive
 */
async function getOrCreateFolder(oauth2Client: OAuth2Client): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create folder if it doesn't exist
  const folderMetadata = {
    name: FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return folder.data.id!;
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFileToDrive(
  oauth2Client: OAuth2Client,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  metadata: {
    orgId: string;
    formId: string;
    taskId?: string;
    fieldId: string;
  }
): Promise<DriveFileMetadata> {
  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of 10MB`);
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const folderId = await getOrCreateFolder(oauth2Client);

  // Create readable stream from buffer
  const bufferStream = new Readable();
  bufferStream.push(fileBuffer);
  bufferStream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    description: JSON.stringify(metadata),
    properties: {
      orgId: metadata.orgId,
      formId: metadata.formId,
      taskId: metadata.taskId || '',
      fieldId: metadata.fieldId,
    },
  };

  const media = {
    mimeType: mimeType,
    body: bufferStream,
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime',
  });

  return {
    fileId: file.data.id!,
    fileName: file.data.name!,
    mimeType: file.data.mimeType!,
    size: parseInt(file.data.size || '0'),
    webViewLink: file.data.webViewLink || undefined,
    webContentLink: file.data.webContentLink || undefined,
    createdTime: file.data.createdTime!,
  };
}

/**
 * Download a file from Google Drive
 */
export async function downloadFileFromDrive(
  oauth2Client: OAuth2Client,
  fileId: string
): Promise<{ buffer: Buffer; metadata: any }> {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Get file metadata
  const fileMeta = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size, description, properties',
  });

  // Download file content
  const response = await drive.files.get(
    {
      fileId: fileId,
      alt: 'media',
    },
    { responseType: 'arraybuffer' }
  );

  return {
    buffer: Buffer.from(response.data as ArrayBuffer),
    metadata: {
      name: fileMeta.data.name,
      mimeType: fileMeta.data.mimeType,
      size: fileMeta.data.size,
      description: fileMeta.data.description,
      properties: fileMeta.data.properties,
    },
  };
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFileFromDrive(
  oauth2Client: OAuth2Client,
  fileId: string
): Promise<void> {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  await drive.files.delete({ fileId });
}

/**
 * List files in the ProcessSutra folder
 */
export async function listDriveFiles(
  oauth2Client: OAuth2Client,
  filters?: {
    orgId?: string;
    formId?: string;
    taskId?: string;
  }
): Promise<DriveFileMetadata[]> {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const folderId = await getOrCreateFolder(oauth2Client);

  // Build query
  let query = `'${folderId}' in parents and trashed=false`;
  
  if (filters?.orgId) {
    query += ` and properties has { key='orgId' and value='${filters.orgId}' }`;
  }
  if (filters?.formId) {
    query += ` and properties has { key='formId' and value='${filters.formId}' }`;
  }
  if (filters?.taskId) {
    query += ` and properties has { key='taskId' and value='${filters.taskId}' }`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, createdTime)',
    spaces: 'drive',
    pageSize: 1000,
  });

  return (response.data.files || []).map((file) => ({
    fileId: file.id!,
    fileName: file.name!,
    mimeType: file.mimeType!,
    size: parseInt(file.size || '0'),
    webViewLink: file.webViewLink || undefined,
    webContentLink: file.webContentLink || undefined,
    createdTime: file.createdTime!,
  }));
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(
  oauth2Client: OAuth2Client,
  orgId?: string
): Promise<{
  totalFiles: number;
  totalBytes: number;
  byFileType: Record<string, number>;
  avgFileSize: number;
}> {
  const files = await listDriveFiles(oauth2Client, orgId ? { orgId } : undefined);

  const totalFiles = files.length;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const byFileType: Record<string, number> = {};

  files.forEach((file) => {
    const type = file.mimeType?.split('/')[0] || 'other';
    byFileType[type] = (byFileType[type] || 0) + 1;
  });

  return {
    totalFiles,
    totalBytes,
    byFileType,
    avgFileSize: totalFiles > 0 ? totalBytes / totalFiles : 0,
  };
}

/**
 * Check if user has granted Drive access
 */
export async function checkDriveAccess(oauth2Client: OAuth2Client): Promise<boolean> {
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    await drive.about.get({ fields: 'user' });
    return true;
  } catch (error) {
    console.error('Drive access check failed:', error);
    return false;
  }
}

/**
 * Delete multiple files by organization and form
 */
export async function deleteFilesByFilters(
  oauth2Client: OAuth2Client,
  filters: {
    orgId?: string;
    formId?: string;
    taskId?: string;
  }
): Promise<number> {
  const files = await listDriveFiles(oauth2Client, filters);
  
  let deletedCount = 0;
  for (const file of files) {
    try {
      await deleteFileFromDrive(oauth2Client, file.fileId);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete file ${file.fileId}:`, error);
    }
  }
  
  return deletedCount;
}
