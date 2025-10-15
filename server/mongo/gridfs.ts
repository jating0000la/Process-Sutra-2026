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
