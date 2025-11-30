/**
 * Production-safe logging utility
 * Logs to console in development, silent in production unless specified
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  /**
   * Development-only logs (completely silent in production)
   */
  dev: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },

  /**
   * Debug logs (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs (shown in all environments)
   */
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Warning logs (shown in all environments)
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs (shown in all environments)
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Audit logs (security/compliance logging, always shown)
   */
  audit: (...args: any[]) => {
    console.log('[AUDIT]', ...args);
  },

  /**
   * Security logs (authentication/authorization events, always shown)
   */
  security: (...args: any[]) => {
    console.log('[SECURITY]', ...args);
  },

  /**
   * Production-only logs (only shown in production environment)
   */
  prod: (...args: any[]) => {
    if (isProduction) {
      console.log('[PROD]', ...args);
    }
  }
};

/**
 * Format time for consistent logging
 */
export const formatLogTime = () => {
  return new Date().toISOString();
};

/**
 * Sanitize sensitive data before logging
 */
export const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'accessToken', 'refreshToken', 'apiKey'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
};
