import { GridFSBucket } from 'mongodb';
import { getMongoClient } from './client.js';

export async function getUploadsBucket(): Promise<GridFSBucket> {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB as string;
  return new GridFSBucket(client.db(dbName), { bucketName: 'uploads' });
}
