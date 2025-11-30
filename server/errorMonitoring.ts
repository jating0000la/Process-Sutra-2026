/**
 * Error Monitoring Integration
 * 
 * This file provides hooks for integrating with error monitoring services
 * like Sentry, DataDog, or New Relic for production error tracking.
 */

import { Request, Response, NextFunction } from 'express';

// Configuration for error monitoring service
interface ErrorMonitoringConfig {
  enabled: boolean;
  service: 'sentry' | 'datadog' | 'newrelic' | 'custom';
  dsn?: string; // Data Source Name for the monitoring service
  environment: string;
  release?: string;
  sampleRate?: number;
}

const config: ErrorMonitoringConfig = {
  enabled: process.env.ERROR_MONITORING_ENABLED === 'true',
  service: (process.env.ERROR_MONITORING_SERVICE as any) || 'sentry',
  dsn: process.env.ERROR_MONITORING_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: parseFloat(process.env.ERROR_SAMPLE_RATE || '1.0'),
};

/**
 * Initialize error monitoring service
 * 
 * Example for Sentry:
 * ```
 * npm install @sentry/node
 * 
 * import * as Sentry from '@sentry/node';
 * Sentry.init({
 *   dsn: config.dsn,
 *   environment: config.environment,
 *   release: config.release,
 *   tracesSampleRate: config.sampleRate,
 * });
 * ```
 */
export function initErrorMonitoring() {
  if (!config.enabled) {
    console.log('[ErrorMonitoring] Disabled - set ERROR_MONITORING_ENABLED=true to enable');
    return;
  }

  console.log(`[ErrorMonitoring] Initializing ${config.service} for ${config.environment}`);

  // TODO: Initialize your chosen error monitoring service here
  // Uncomment and configure based on your service:
  
  // SENTRY EXAMPLE:
  // import * as Sentry from '@sentry/node';
  // Sentry.init({
  //   dsn: config.dsn,
  //   environment: config.environment,
  //   release: config.release,
  //   tracesSampleRate: config.sampleRate,
  //   integrations: [
  //     new Sentry.Integrations.Http({ tracing: true }),
  //     new Sentry.Integrations.Express({ app }),
  //   ],
  // });

  // DATADOG EXAMPLE:
  // import tracer from 'dd-trace';
  // tracer.init({
  //   env: config.environment,
  //   version: config.release,
  //   service: 'processsutra',
  // });
}

/**
 * Capture an exception to error monitoring service
 * 
 * @param error - Error to capture
 * @param context - Additional context about the error
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!config.enabled) {
    console.error('[ERROR]', error.message, context);
    return;
  }

  // Log to console for immediate visibility
  console.error('[ERROR]', error.message, context);

  // TODO: Send to your error monitoring service
  // SENTRY EXAMPLE:
  // import * as Sentry from '@sentry/node';
  // Sentry.captureException(error, { extra: context });

  // DATADOG EXAMPLE:
  // import { logger } from 'dd-trace/log';
  // logger.error(error.message, { error, ...context });
}

/**
 * Capture a message/event to error monitoring service
 * 
 * @param message - Message to log
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string, 
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  if (!config.enabled) {
    return;
  }

  // TODO: Send to your error monitoring service
  // SENTRY EXAMPLE:
  // import * as Sentry from '@sentry/node';
  // Sentry.captureMessage(message, { level, extra: context });
}

/**
 * Express middleware for error tracking
 * Should be added BEFORE route handlers
 * 
 * Usage:
 * ```
 * app.use(requestTrackingMiddleware());
 * ```
 */
export function requestTrackingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.enabled) {
      return next();
    }

    // TODO: Add request tracking based on your service
    // SENTRY EXAMPLE:
    // import * as Sentry from '@sentry/node';
    // Sentry.Handlers.requestHandler();

    next();
  };
}

/**
 * Express error handler middleware
 * Should be added AFTER all routes
 * 
 * Usage:
 * ```
 * app.use(errorHandlerMiddleware());
 * ```
 */
export function errorHandlerMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Capture error with request context
    captureException(err, {
      url: req.url,
      method: req.method,
      userId: (req as any).currentUser?.id,
      organizationId: (req as any).currentUser?.organizationId,
    });

    // Don't expose internal errors to client in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ 
        message: 'Internal server error',
        requestId: (req as any).id // If you're using a request ID middleware
      });
    } else {
      res.status(500).json({ 
        message: err.message,
        stack: err.stack,
      });
    }
  };
}

/**
 * Set user context for error tracking
 * Call this after authentication
 * 
 * @param userId - User ID
 * @param email - User email
 * @param organizationId - Organization ID
 */
export function setUserContext(userId: string, email: string, organizationId?: string) {
  if (!config.enabled) {
    return;
  }

  // TODO: Set user context in your monitoring service
  // SENTRY EXAMPLE:
  // import * as Sentry from '@sentry/node';
  // Sentry.setUser({ id: userId, email, organizationId });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  if (!config.enabled) {
    return;
  }

  // TODO: Clear user context in your monitoring service
  // SENTRY EXAMPLE:
  // import * as Sentry from '@sentry/node';
  // Sentry.setUser(null);
}

export default {
  init: initErrorMonitoring,
  captureException,
  captureMessage,
  requestTrackingMiddleware,
  errorHandlerMiddleware,
  setUserContext,
  clearUserContext,
};
