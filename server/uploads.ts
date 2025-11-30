import { Router } from 'express';
import multer from 'multer';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import fileType from 'file-type';
import sanitizeFilename from 'sanitize-filename';
import { isAuthenticated } from './firebaseAuth';
import { storage } from './storage';
import { getStorageStats } from './usageQueries';
import { uploadFileToDrive, downloadFileFromDrive } from './services/googleDriveService';
import { getOAuth2Client } from './services/googleOAuth';
import { ensureValidToken } from './utils/tokenRefresh';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const STORAGE_LIMIT_GB = 5; // 5GB per organization

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

// Rate limiting: 50 uploads per 15 minutes per user
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: 'Too many upload requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    // Use user ID if authenticated, otherwise use IPv6-safe IP key generator
    return req.session?.user?.id || ipKeyGenerator(req);
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many upload requests. Please try again later.',
      retryAfter: 15 * 60 // seconds
    });
  }
});

export const uploadsRouter = Router();

// Upload a single file to Google Drive. Returns descriptor for embedding into formData
uploadsRouter.post('/', uploadLimiter, isAuthenticated, upload.single('file'), async (req: any, res) => {
  try {
    const sessionUser = (req as any).session?.user;
    if (!sessionUser?.id) return res.status(401).json({ message: 'Unauthorized' });

    let dbUser = await ensureValidToken(sessionUser.id);
    if (!dbUser) return res.status(401).json({ message: 'Unauthorized' });
    
    // Check if user has enabled Google Drive and has valid tokens
    if (!dbUser.googleDriveEnabled || !dbUser.googleAccessToken) {
      return res.status(403).json({ 
        message: 'Google Drive access not enabled. Please authorize Google Drive access in your settings.',
        requiresAuth: true
      });
    }

    const orgId = (dbUser as any).organizationId;
    const { formId, taskId, fieldId } = req.body as { formId: string; taskId?: string; fieldId: string };
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'file is required' });

    // Server-side MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ 
        message: 'Invalid file type. Only images, PDFs, Office documents, and text files are allowed.',
        allowedTypes: ALLOWED_MIME_TYPES
      });
    }

    // Magic number verification (verify actual file content)
    try {
      const detectedType = await fileType.fromBuffer(file.buffer);
      if (detectedType && !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
        return res.status(400).json({ 
          message: 'File content does not match declared type. File rejected for security.',
          declaredType: file.mimetype,
          detectedType: detectedType.mime
        });
      }
      // For text files that fileType can't detect, verify it's actually text
      if (!detectedType && (file.mimetype === 'text/plain' || file.mimetype === 'text/csv')) {
        // Additional validation: check if file is valid UTF-8
        try {
          file.buffer.toString('utf-8');
        } catch (e) {
          return res.status(400).json({ 
            message: 'Invalid text file encoding. File must be valid UTF-8.',
          });
        }
      }
    } catch (error) {
      console.error('File type detection error:', error);
      return res.status(400).json({ 
        message: 'Unable to verify file type. Upload rejected for security.',
      });
    }

    // Sanitize filename
    const originalName = file.originalname;
    const sanitized = sanitizeFilename(originalName).substring(0, 255);
    if (!sanitized || sanitized.trim() === '') {
      return res.status(400).json({ 
        message: 'Invalid filename. Please rename the file and try again.',
      });
    }
    file.originalname = sanitized;

    // Check storage quota before upload
    const storageStats = await getStorageStats(orgId);
    const currentStorageGB = storageStats.totalBytes / (1024 * 1024 * 1024);
    const newFileSizeGB = file.size / (1024 * 1024 * 1024);
    
    if (currentStorageGB + newFileSizeGB > STORAGE_LIMIT_GB) {
      return res.status(413).json({ 
        message: `Storage limit exceeded. Your organization has used ${currentStorageGB.toFixed(2)} GB of ${STORAGE_LIMIT_GB} GB. This file would exceed the limit.`,
        currentUsage: currentStorageGB,
        limit: STORAGE_LIMIT_GB
      });
    }

    // Create OAuth2 client with user's tokens (already refreshed by ensureValidToken)
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: dbUser.googleAccessToken,
      refresh_token: dbUser.googleRefreshToken,
      expiry_date: dbUser.googleTokenExpiry?.getTime(),
    });

    // Upload file to Google Drive
    const driveFile = await uploadFileToDrive(
      oauth2Client,
      file.buffer,
      file.originalname,
      file.mimetype,
      { orgId, formId, taskId: taskId ?? '', fieldId }
    );

    res.json({
      type: 'file',
      driveFileId: driveFile.fileId,
      originalName: driveFile.fileName,
      mimeType: driveFile.mimeType,
      size: driveFile.size,
      webViewLink: driveFile.webViewLink,
      orgId,
      formId,
      taskId: taskId ?? null,
      fieldId,
    });
  } catch (e: any) {
    console.error('Upload error:', e);
    res.status(500).json({ message: e.message || 'upload failed' });
  }
});

// Download/stream a Google Drive file by id
uploadsRouter.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const sessionUser = (req as any).session?.user;
    if (!sessionUser?.id) return res.status(401).json({ message: 'Unauthorized' });
    
    let dbUser = await ensureValidToken(sessionUser.id);
    if (!dbUser) return res.status(401).json({ message: 'Unauthorized' });
    
    // Check if user has enabled Google Drive and has valid tokens
    if (!dbUser.googleDriveEnabled || !dbUser.googleAccessToken) {
      return res.status(403).json({ 
        message: 'Google Drive access not enabled.',
        requiresAuth: true
      });
    }

    const orgId = (dbUser as any).organizationId;
    const { id } = req.params;

    // Create OAuth2 client with user's tokens (already refreshed by ensureValidToken)
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: dbUser.googleAccessToken,
      refresh_token: dbUser.googleRefreshToken,
      expiry_date: dbUser.googleTokenExpiry?.getTime(),
    });

    // Download file from Google Drive
    const { buffer, metadata } = await downloadFileFromDrive(oauth2Client, id);
    
    // Verify organization access through metadata
    const fileOrgId = metadata.properties?.orgId;
    if (fileOrgId && fileOrgId !== orgId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${metadata.name}"`);
    if (metadata.size) res.setHeader('Content-Length', String(metadata.size));

    res.send(buffer);
  } catch (e: any) {
    console.error('Download error:', e);
    res.status(500).json({ message: e.message || 'download failed' });
  }
});

export default uploadsRouter;
