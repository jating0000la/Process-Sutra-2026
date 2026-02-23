/**
 * Quick Form MongoDB Client
 * 
 * Stores form templates & responses directly in MongoDB for speed.
 * Uses simple {fieldLabel: value} JSON — no question IDs.
 * Multi-org isolated via orgId on every document + compound indexes.
 */

import { MongoClient, Collection, ObjectId } from "mongodb";

// ─── Document Interfaces ────────────────────────────────────────────

export interface QuickFormField {
  label: string;           // "Customer Name", "Email", etc.
  type: string;            // text | textarea | select | radio | checkbox | date | file | number | table
  required: boolean;
  placeholder?: string;
  options?: string[];      // for select / radio / checkbox
  tableColumns?: {         // for table type
    label: string;
    type: string;          // text | number | date | select
    options?: string[];
  }[];
}

export interface QuickFormTemplateDoc {
  _id?: ObjectId;
  orgId: string;
  formId: string;          // short human-readable ID e.g. "qf001"
  title: string;
  description?: string;
  fields: QuickFormField[];
  /** WhatsApp notification config — opens WhatsApp with pre-filled message after submit */
  whatsappConfig?: {
    enabled: boolean;
    phoneNumber: string;       // e.g. "919876543210" or "{{Phone}}"
    messageTemplate: string;   // e.g. "Hello {{Name}}, thank you..."
  };
  /** Email notification config — opens Gmail compose after submit */
  emailConfig?: {
    enabled: boolean;
    recipientEmail: string;    // e.g. "admin@co.com" or "{{Email}}"
    subject: string;
    bodyTemplate: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuickFormResponseDoc {
  _id?: ObjectId;
  orgId: string;
  formId: string;
  formTitle: string;
  submittedBy: string;
  /** Simple flat JSON: { "Customer Name": "John", "Email": "a@b.com", "File": "https://drive..." } */
  data: Record<string, any>;
  /** Optional flow/task context — set when form is filled from a task */
  flowId?: string;
  taskId?: string;
  taskName?: string;
  createdAt: Date;
}

// ─── Singleton Connection ───────────────────────────────────────────

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (client) return client;
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) throw new Error("MONGODB_URI and MONGODB_DB must be set");
  client = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
  });
  await client.connect();

  const db = client.db(dbName);

  // Templates indexes
  const tpl = db.collection<QuickFormTemplateDoc>("quickFormTemplates");
  await tpl.createIndex({ orgId: 1, formId: 1 }, { unique: true });
  await tpl.createIndex({ orgId: 1, createdAt: -1 });

  // Responses indexes — compound for fast org+form queries
  const resp = db.collection<QuickFormResponseDoc>("quickFormResponses");
  await resp.createIndex({ orgId: 1, formId: 1, createdAt: -1 });
  await resp.createIndex({ orgId: 1, createdAt: -1 });
  // Index for task-based lookups (flow integration)
  await resp.createIndex({ orgId: 1, taskId: 1 }, { sparse: true });

  return client;
}

export function getDb() {
  return getClient().then(c => c.db(process.env.MONGODB_DB as string));
}

// ─── Template Operations ────────────────────────────────────────────

export async function getQuickFormTemplatesCollection(): Promise<Collection<QuickFormTemplateDoc>> {
  const db = await getDb();
  return db.collection<QuickFormTemplateDoc>("quickFormTemplates");
}

export async function getQuickFormResponsesCollection(): Promise<Collection<QuickFormResponseDoc>> {
  const db = await getDb();
  return db.collection<QuickFormResponseDoc>("quickFormResponses");
}

// ── Templates CRUD ──────────────────────────────────────────────────

export async function createQuickFormTemplate(doc: Omit<QuickFormTemplateDoc, "_id" | "createdAt" | "updatedAt">): Promise<QuickFormTemplateDoc> {
  const col = await getQuickFormTemplatesCollection();
  const now = new Date();
  const newDoc: QuickFormTemplateDoc = { ...doc, createdAt: now, updatedAt: now };
  const result = await col.insertOne(newDoc as any);
  return { ...newDoc, _id: result.insertedId };
}

export async function getQuickFormTemplatesByOrg(orgId: string): Promise<QuickFormTemplateDoc[]> {
  const col = await getQuickFormTemplatesCollection();
  return col.find({ orgId }).sort({ createdAt: -1 }).toArray();
}

export async function getQuickFormTemplate(orgId: string, formId: string): Promise<QuickFormTemplateDoc | null> {
  const col = await getQuickFormTemplatesCollection();
  return col.findOne({ orgId, formId });
}

export async function getQuickFormTemplateById(orgId: string, id: string): Promise<QuickFormTemplateDoc | null> {
  const col = await getQuickFormTemplatesCollection();
  return col.findOne({ orgId, _id: new ObjectId(id) });
}

export async function updateQuickFormTemplate(
  orgId: string,
  id: string,
  updates: Partial<Pick<QuickFormTemplateDoc, "title" | "description" | "fields" | "formId" | "whatsappConfig" | "emailConfig">>
): Promise<QuickFormTemplateDoc | null> {
  const col = await getQuickFormTemplatesCollection();
  const result = await col.findOneAndUpdate(
    { orgId, _id: new ObjectId(id) },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function deleteQuickFormTemplate(orgId: string, id: string): Promise<boolean> {
  const col = await getQuickFormTemplatesCollection();
  const result = await col.deleteOne({ orgId, _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

// ── Responses CRUD ──────────────────────────────────────────────────

export async function createQuickFormResponse(doc: Omit<QuickFormResponseDoc, "_id" | "createdAt">): Promise<QuickFormResponseDoc> {
  const col = await getQuickFormResponsesCollection();
  const newDoc: QuickFormResponseDoc = { ...doc, createdAt: new Date() };
  const result = await col.insertOne(newDoc as any);
  return { ...newDoc, _id: result.insertedId };
}

export async function getQuickFormResponses(params: {
  orgId: string;
  formId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: QuickFormResponseDoc[]; total: number; page: number; pageSize: number }> {
  const { orgId, formId, startDate, endDate, search, page = 1, pageSize = 50 } = params;
  const col = await getQuickFormResponsesCollection();

  const filter: any = { orgId };
  if (formId) filter.formId = formId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (search) {
    // Text search across submittedBy and stringified data
    filter.$or = [
      { submittedBy: { $regex: search, $options: "i" } },
      { formTitle: { $regex: search, $options: "i" } },
    ];
  }

  const total = await col.countDocuments(filter);
  const data = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return { data, total, page, pageSize };
}

export async function getQuickFormResponseById(orgId: string, id: string): Promise<QuickFormResponseDoc | null> {
  const col = await getQuickFormResponsesCollection();
  return col.findOne({ orgId, _id: new ObjectId(id) });
}

export async function deleteQuickFormResponse(orgId: string, id: string): Promise<boolean> {
  const col = await getQuickFormResponsesCollection();
  const result = await col.deleteOne({ orgId, _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function deleteQuickFormResponsesByFormId(orgId: string, formId: string): Promise<number> {
  const col = await getQuickFormResponsesCollection();
  const result = await col.deleteMany({ orgId, formId });
  return result.deletedCount;
}

/** Check if a quick form response exists for a given task (used by tasks page) */
export async function getQuickFormResponseByTaskId(orgId: string, taskId: string): Promise<QuickFormResponseDoc | null> {
  const col = await getQuickFormResponsesCollection();
  return col.findOne({ orgId, taskId });
}

/** Get all quick form responses for a specific flow (used by tasks page for batch check) */
export async function getQuickFormResponsesByFlowTasks(orgId: string, taskIds: string[]): Promise<QuickFormResponseDoc[]> {
  if (!taskIds.length) return [];
  const col = await getQuickFormResponsesCollection();
  return col.find({ orgId, taskId: { $in: taskIds } }).toArray();
}

/** Get all quick form responses for a given flowId (used by flow data dialog) */
export async function getQuickFormResponsesByFlowId(orgId: string, flowId: string): Promise<QuickFormResponseDoc[]> {
  const col = await getQuickFormResponsesCollection();
  return col.find({ orgId, flowId }).sort({ createdAt: 1 }).toArray();
}
