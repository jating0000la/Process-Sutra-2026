/**
 * Production-Safe Logging Utility
 * Automatically disables detailed logs in production to prevent information leakage
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Safe console.log - only works in development
 */
export const devLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Safe console.warn - only works in development
 */
export const devWarn = (...args: any[]) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * Safe console.error - sanitized in production
 * In production: logs generic message without details
 * In development: logs full error details
 */
export const devError = (message: string, error?: any) => {
  if (isDevelopment) {
    console.error(message, error);
  } else {
    // In production, only log that an error occurred without details
    console.error('An error occurred. Please contact support if the issue persists.');
  }
};

/**
 * Safe console.info - only works in development
 */
export const devInfo = (...args: any[]) => {
  if (isDevelopment) {
    console.info(...args);
  }
};

/**
 * Safe console.debug - only works in development
 */
export const devDebug = (...args: any[]) => {
  if (isDevelopment) {
    console.debug(...args);
  }
};

/**
 * Production-safe error logging
 * Use this for errors that should always be logged (e.g., for error tracking services)
 * but without exposing sensitive details
 */
export const logError = (errorCode: string, context?: string) => {
  if (isDevelopment) {
    console.error(`[${errorCode}]`, context);
  } else {
    // In production, log sanitized error code only
    console.error(`Error: ${errorCode}`);
  }
};

/**
 * Auth-safe logger - NEVER logs sensitive auth data in production
 */
export const authLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(`🔐 [Auth] ${message}`, data);
  }
  // In production: complete silence for auth operations
};

/**
 * API call logger - sanitized in production
 */
export const apiLog = (method: string, endpoint: string, status?: number) => {
  if (isDevelopment) {
    console.log(`📡 [API] ${method} ${endpoint}`, status ? `(${status})` : '');
  }
  // In production: no API logging to prevent endpoint mapping
};

export default {
  log: devLog,
  warn: devWarn,
  error: devError,
  info: devInfo,
  debug: devDebug,
  logError,
  authLog,
  apiLog,
};
