// Device fingerprinting utility for user management and security tracking
import { devLog, devError } from './logger';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserName: string;
  browserVersion: string;
  operatingSystem: string;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lng?: number;
  ip?: string;
}

// Generate a unique device fingerprint
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillText('Device fingerprint', 10, 10);
  }
  const canvasFingerprint = canvas.toDataURL();
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    canvasFingerprint.slice(-100), // Last 100 chars of canvas fingerprint
  ].join('|');
  
  // Simple hash function to convert to shorter ID
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

// Get device information
export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  
  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    deviceType = 'mobile';
  }
  
  // Detect browser
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  
  if (userAgent.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Safari') > -1) {
    browserName = 'Safari';
    const match = userAgent.match(/Safari\/([0-9.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.indexOf('Edge') > -1) {
    browserName = 'Edge';
    const match = userAgent.match(/Edge\/([0-9.]+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  
  // Detect operating system
  let operatingSystem = 'Unknown';
  if (userAgent.indexOf('Windows') > -1) operatingSystem = 'Windows';
  else if (userAgent.indexOf('Mac') > -1) operatingSystem = 'macOS';
  else if (userAgent.indexOf('Linux') > -1) operatingSystem = 'Linux';
  else if (userAgent.indexOf('Android') > -1) operatingSystem = 'Android';
  else if (userAgent.indexOf('iOS') > -1) operatingSystem = 'iOS';
  
  // Generate device name
  const deviceName = `${browserName} on ${operatingSystem}`;
  
  return {
    deviceId: generateDeviceFingerprint(),
    deviceName,
    deviceType,
    browserName,
    browserVersion,
    operatingSystem,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    userAgent,
  };
}

// Get location information (requires external service)
export async function getLocationInfo(): Promise<LocationInfo> {
  try {
    // Try to get IP and location from a free service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name,
        region: data.region,
        city: data.city,
        lat: data.latitude,
        lng: data.longitude,
        ip: data.ip,
      };
    }
  } catch (error) {
    // Silently handle location fetch errors - this is not critical functionality
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('Could not fetch location information:', error);
    }
  }
  
  return {};
}

// Track login with device and location info
export async function trackLogin(userId: string) {
  try {
    const deviceInfo = getDeviceInfo();
    // Temporarily disable location fetching to prevent errors
    const locationInfo: LocationInfo = {}; // await getLocationInfo();
    
    // Register/update device
    await fetch('/api/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browserName: deviceInfo.browserName,
        operatingSystem: deviceInfo.operatingSystem,
      }),
    });
    
    // Create login log
    await fetch('/api/login-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browserName: deviceInfo.browserName,
        browserVersion: deviceInfo.browserVersion,
        operatingSystem: deviceInfo.operatingSystem,
        ipAddress: locationInfo.ip || null,
        location: locationInfo.country ? {
          country: locationInfo.country,
          region: locationInfo.region,
          city: locationInfo.city,
          lat: locationInfo.lat,
          lng: locationInfo.lng,
        } : null,
        userAgent: deviceInfo.userAgent,
        loginStatus: 'success',
      }),
    });
    
    devLog('Login tracked successfully');
  } catch (error) {
    devError('Failed to track login', error);
  }
}

// Track logout
export async function trackLogout(loginLogId?: string) {
  if (!loginLogId) return;
  
  try {
    await fetch(`/api/login-logs/${loginLogId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logoutTime: new Date().toISOString(),
        sessionDuration: Math.floor((Date.now() - new Date().getTime()) / (1000 * 60)), // in minutes
      }),
    });
    
    devLog('Logout tracked successfully');
  } catch (error) {
    devError('Failed to track logout', error);
  }
}