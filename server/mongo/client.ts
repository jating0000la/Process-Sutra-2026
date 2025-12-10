import { MongoClient, Collection } from "mongodb";

export interface FormResponseDoc {
  _id?: any;
  orgId: string;
  flowId: string;
  taskId: string;
  taskName: string;
  formId: string;
  submittedBy: string;
  orderNumber?: string | number;
  system?: string;
  flowDescription?: string;
  flowInitiatedBy?: string;
  flowInitiatedAt?: Date;
  formData: Record<string, any>;
  createdAt: Date;
}

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (client) return client;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) throw new Error("MONGODB_URI and MONGODB_DB must be set");
  client = new MongoClient(uri);
  await client.connect();

  // ensure indexes
  const col = client.db(dbName).collection<FormResponseDoc>("formResponses");
  await col.createIndex({ orgId: 1, flowId: 1, taskId: 1, createdAt: -1 });

  return client;
}

export async function getFormResponsesCollection(): Promise<Collection<FormResponseDoc>> {
  const cli = await getClient();
  return cli.db(process.env.MONGODB_DB as string).collection<FormResponseDoc>("formResponses");
}

// Export a shared accessor for the connected MongoClient
export async function getMongoClient(): Promise<MongoClient> {
  return getClient();
}
