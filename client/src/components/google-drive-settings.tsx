import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Upload, HardDrive, XCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DriveStatus {
  connected: boolean;
  hasToken: boolean;
  tokenExpiry: string | null;
}

export function GoogleDriveSettings() {
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  // Check for OAuth callback success/error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveConnected = params.get('drive_connected');
    const error = params.get('error');

    if (driveConnected === 'true') {
      toast({
        title: "Success",
        description: "Google Drive connected successfully! You can now upload files.",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Immediately refresh status after successful connection
      checkDriveStatus();
    } else if (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect Google Drive: ${error}`,
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      checkDriveStatus();
    } else {
      // Normal load - check status
      checkDriveStatus();
    }
  }, []);

  const checkDriveStatus = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/oauth/google/status");
      const data = await response.json() as DriveStatus;
      setDriveStatus(data);
    } catch (err) {
      console.error('Failed to check Drive status:', err);
      toast({
        title: "Error",
        description: "Failed to load Google Drive status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectDrive = async () => {
    try {
      setConnecting(true);
      const response = await apiRequest("GET", "/api/oauth/google/authorize");
      const data = await response.json() as { authUrl: string };
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('Failed to initiate Drive connection:', err);
      toast({
        title: "Error",
        description: "Failed to initiate Google Drive connection",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const disconnectDrive = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to disconnect Google Drive? You will not be able to upload or access files until you reconnect.'
    );

    if (!confirmed) return;

    try {
      setDisconnecting(true);
      await apiRequest("POST", "/api/oauth/google/disconnect");
      
      toast({
        title: "Disconnected",
        description: "Google Drive has been disconnected successfully",
      });
      
      await checkDriveStatus();
    } catch (err) {
      console.error('Failed to disconnect Drive:', err);
      toast({
        title: "Error",
        description: "Failed to disconnect Google Drive",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Google Drive Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Drive to upload and store files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isTokenExpiringSoon = driveStatus?.tokenExpiry 
    ? new Date(driveStatus.tokenExpiry).getTime() < Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Google Drive Integration
            </CardTitle>
            <CardDescription>
              Connect your Google Drive to upload and store files (max 10MB per file)
            </CardDescription>
          </div>
          
          {driveStatus?.connected ? (
            <Badge variant="default" className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {driveStatus?.connected ? (
          <>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your Google Drive is connected. Files will be stored in the <strong>"ProcessSutra Files"</strong> folder in your Google Drive.
                {driveStatus.tokenExpiry && (
                  <div className="text-xs text-green-700 mt-2">
                    Token expires: {new Date(driveStatus.tokenExpiry).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {isTokenExpiringSoon && (
              <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Your Google Drive token is expiring soon. You may need to reconnect after it expires.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">What you can do:</h4>
              <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                <li>Upload files up to 10MB in forms</li>
                <li>Files are stored securely in your personal Google Drive</li>
                <li>Access files from Google Drive's "ProcessSutra Files" folder</li>
                <li>Files are automatically organized by form</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button 
                variant="outline" 
                onClick={disconnectDrive}
                disabled={disconnecting}
                className="w-full sm:w-auto"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Disconnect Google Drive
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Connect your Google Drive to enable file uploads in forms. You'll be redirected to Google to grant permission.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Required permissions:</h4>
              <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                <li>Create and manage files in your Google Drive</li>
                <li>Read and write files created by this application</li>
                <li>No access to your existing Drive files</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button 
                onClick={connectDrive}
                disabled={connecting}
                className="w-full sm:w-auto"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Connect Google Drive
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        <Alert className="bg-gray-50 border-gray-200">
          <AlertCircle className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-700">
            <strong>Note:</strong> This integration only accesses files created by ProcessSutra. Your existing Google Drive files remain private.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
