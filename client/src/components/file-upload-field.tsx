import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  File, 
  X,
  Loader2,
  ExternalLink,
  HardDrive
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface FileUploadFieldProps {
  formId: string;
  fieldId: string;
  taskId?: string;
  value?: FileData;
  onChange?: (fileData: FileData | null) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  description?: string;
}

interface FileData {
  type: 'file';
  driveFileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  orgId: string;
  formId: string;
  taskId?: string;
  fieldId: string;
}

export function FileUploadField({
  formId,
  fieldId,
  taskId,
  value,
  onChange,
  disabled = false,
  accept,
  label = "Upload File",
  description = "Maximum file size: 10MB. Files will be stored in your Google Drive."
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkDriveConnection();
  }, []);

  useEffect(() => {
    // Handle both old format (object) and new format (URL string)
    if (value) {
      if (typeof value === 'string') {
        // New format: just a URL string
        setFileData({
          type: 'file',
          driveFileId: '',
          originalName: 'File',
          mimeType: '',
          size: 0,
          webViewLink: value,
          orgId: '',
          formId: question.formId || '',
          taskId: null,
          fieldId: question.id,
        });
      } else {
        // Old format: full object (backward compatibility)
        setFileData(value);
      }
    } else {
      setFileData(null);
    }
  }, [value, question.formId, question.id]);

  const checkDriveConnection = async () => {
    try {
      const response = await apiRequest("GET", "/api/oauth/google/status");
      const data = await response.json() as { connected: boolean };
      setDriveConnected(data.connected);
    } catch (err) {
      console.error('Failed to check Drive status:', err);
      setDriveConnected(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('formId', formId);
    formData.append('fieldId', fieldId);
    if (taskId) {
      formData.append('taskId', taskId);
    }

    return new Promise<FileData>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const controller = new AbortController();
      setAbortController(controller);

      // Track real upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        setAbortController(null);
        
        if (xhr.status === 200) {
          try {
            // Server now returns just the webViewLink as a string
            const webViewLink: string = JSON.parse(xhr.responseText);
            
            // Create a minimal file data object with just the URL
            const result: FileData = {
              type: 'file',
              driveFileId: '', // No longer stored
              originalName: file.name,
              mimeType: file.type,
              size: file.size,
              webViewLink: webViewLink,
              orgId: '',
              formId: question.formId || '',
              taskId: null,
              fieldId: question.id,
            };
            
            setFileData(result);
            
            if (onChange) {
              // Only pass the webViewLink to minimize data storage
              onChange(webViewLink);
            }

            toast({
              title: "Success",
              description: `File "${file.name}" uploaded successfully to Google Drive!`,
            });
            
            resolve(webViewLink);
          } catch (err) {
            reject(new Error('Failed to parse server response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            
            // Check if Drive authorization is required
            if (errorData.requiresAuth) {
              toast({
                title: "Authorization Required",
                description: "Google Drive access required. Please connect your Drive in Profile settings.",
                variant: "destructive",
              });
              setDriveConnected(false);
            } else if (xhr.status === 429) {
              toast({
                title: "Rate Limit Exceeded",
                description: errorData.message || "Too many uploads. Please try again later.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Upload Failed",
                description: errorData.message || `Upload failed with status ${xhr.status}`,
                variant: "destructive",
              });
            }
            
            reject(new Error(errorData.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        setAbortController(null);
        toast({
          title: "Upload Failed",
          description: 'Network error. Please check your connection and try again.',
          variant: "destructive",
        });
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        setAbortController(null);
        toast({
          title: "Upload Cancelled",
          description: "File upload was cancelled.",
        });
        reject(new Error('Upload cancelled'));
      });

      // Handle abort signal
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.open('POST', '/api/uploads');
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const uploadWithRetry = async (file: File, maxRetries = 3) => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await uploadFile(file);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if user cancelled or auth required
        if (lastError.message.includes('cancelled') || 
            lastError.message.includes('Authorization Required')) {
          throw lastError;
        }
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          toast({
            title: "Retrying Upload",
            description: `Attempt ${attempt} failed. Retrying in ${delay/1000} seconds...`,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size exceeds 10MB limit. Please choose a smaller file.",
        variant: "destructive",
      });
      return;
    }

    if (!driveConnected) {
      toast({
        title: "Google Drive Not Connected",
        description: "Please connect your Google Drive in Profile settings before uploading files.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadWithRetry(file);
    } catch (err: any) {
      console.error('Upload error:', err);
      // Error already shown in toast by uploadFile
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    setUploading(false);
    setUploadProgress(0);
    setAbortController(null);
  };

  const handleRemove = () => {
    setFileData(null);
    if (onChange) {
      onChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📎';
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {!driveConnected && driveConnected !== null && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Google Drive not connected.{' '}
            <a href="/profile" className="underline font-medium">
              Connect in Profile settings
            </a>
          </AlertDescription>
        </Alert>
      )}

      {fileData ? (
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="text-2xl flex-shrink-0">
                {getFileIcon(fileData.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileData.originalName}
                  </p>
                  <Badge variant="secondary" className="flex-shrink-0">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Uploaded
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatFileSize(fileData.size)}
                </p>
                {fileData.webViewLink && (
                  <a
                    href={fileData.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    <HardDrive className="w-3 h-3" />
                    View in Google Drive
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading || !driveConnected}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </>
              )}
            </Button>
            {uploading && abortController && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex-shrink-0"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={disabled || uploading || !driveConnected}
              accept={accept}
              className="hidden"
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-gray-500">
                Uploading to Google Drive... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      )}

      {description && !fileData && (
        <p className="text-xs text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default FileUploadField;
