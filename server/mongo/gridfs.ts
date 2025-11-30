/**
 * @deprecated This file is deprecated. File uploads now use Google Drive instead of GridFS.
 * See server/services/googleDriveService.ts for the new implementation.
 * This file is kept for backward compatibility only.
 */

import { GridFSBucket } from 'mongodb';
import { getMongoClient } from './client.js';

export async function getUploadsBucket(): Promise<GridFSBucket> {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB as string;
  return new GridFSBucket(client.db(dbName), { bucketName: 'uploads' });
}

export async function getFileCount(organizationId?: string): Promise<number> {
  try {
    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DB as string;
    const db = client.db(dbName);
    const filesCollection = db.collection('uploads.files');
    
    if (organizationId) {
      return await filesCollection.countDocuments({ 'metadata.organizationId': organizationId });
    } else {
      return await filesCollection.countDocuments();
    }
  } catch (error) {
    console.error('Error counting files:', error);
    return 0;
  }
}

export async function getStorageStats(organizationId?: string): Promise<{
  totalFiles: number;
  totalBytes: number;
  byFileType: Record<string, number>;
  avgFileSize: number;
}> {
  try {
    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DB as string;
    const db = client.db(dbName);
    const filesCollection = db.collection('uploads.files');
    
    const query = organizationId ? { 'metadata.organizationId': organizationId } : {};
    const files = await filesCollection.find(query).toArray();
    
    const totalFiles = files.length;
    const totalBytes = files.reduce((sum, file) => sum + (file.length || 0), 0);
    const byFileType: Record<string, number> = {};
    
    files.forEach((file: any) => {
      const type = file.contentType?.split('/')[0] || 'other';
      byFileType[type] = (byFileType[type] || 0) + 1;
    });
    
    return {
      totalFiles,
      totalBytes,
      byFileType,
      avgFileSize: totalFiles > 0 ? totalBytes / totalFiles : 0
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalFiles: 0,
      totalBytes: 0,
      byFileType: {},
      avgFileSize: 0
    };
  }
}
