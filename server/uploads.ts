import { Router } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { getUploadsBucket } from './mongo/gridfs.js';
import { isAuthenticated } from './firebaseAuth';
import { storage } from './storage';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

export const uploadsRouter = Router();

// Upload a single file to GridFS. Returns descriptor for embedding into formData
uploadsRouter.post('/', isAuthenticated, upload.single('file'), async (req: any, res) => {
  try {
    const sessionUser = (req as any).session?.user;
    if (!sessionUser?.id) return res.status(401).json({ message: 'Unauthorized' });

    const dbUser = await storage.getUser(sessionUser.id);
    if (!dbUser) return res.status(401).json({ message: 'Unauthorized' });
    const orgId = (dbUser as any).organizationId;
    const { formId, taskId, fieldId } = req.body as { formId: string; taskId?: string; fieldId: string };
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'file is required' });

    const bucket = await getUploadsBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: { orgId, formId, taskId: taskId ?? null, fieldId },
    });

    uploadStream.end(file.buffer);

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'upload failed' });
    });

    uploadStream.on('finish', () => {
      const id = String(uploadStream.id);
      res.json({
        type: 'file',
        gridFsId: id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        orgId,
        formId,
        taskId: taskId ?? null,
        fieldId,
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'upload failed' });
  }
});

// Download/stream a GridFS file by id
uploadsRouter.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const sessionUser = (req as any).session?.user;
    if (!sessionUser?.id) return res.status(401).json({ message: 'Unauthorized' });
    const dbUser = await storage.getUser(sessionUser.id);
    if (!dbUser) return res.status(401).json({ message: 'Unauthorized' });
    const orgId = (dbUser as any).organizationId;

    const { id } = req.params;
    const bucket = await getUploadsBucket();
    const objectId = new ObjectId(id);

    // Head to read metadata first (optional)
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files.length) return res.status(404).end();
    const file = files[0];

    // Enforce org-based access: only allow if metadata.orgId matches current user's org
    const fileOrgId = (file as any)?.metadata?.orgId;
    if (fileOrgId && fileOrgId !== orgId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    if (file.length) res.setHeader('Content-Length', String(file.length));

    const stream = bucket.openDownloadStream(objectId);
    stream.on('error', (err) => {
      console.error('GridFS download error:', err);
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

export default uploadsRouter;
