import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { storage } from './storage';
import type { Webhook } from '@shared/schema';

const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;
const MAX_RESPONSE_SIZE = 10 * 1024; // 10KB - prevent large response attacks

/**
 * Safely read response body with size limit
 */
async function safeReadResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  
  const decoder = new TextDecoder();
  let result = '';
  let totalLength = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalLength += value.length;
      
      if (totalLength > MAX_RESPONSE_SIZE) {
        reader.cancel();
        throw new Error(`Response exceeds ${MAX_RESPONSE_SIZE} bytes limit`);
      }
      
      result += decoder.decode(value, { stream: true });
    }
    
    return result;
  } catch (error) {
    reader.cancel();
    throw error;
  }
}

/**
 * Validates if a webhook URL is safe (prevents SSRF attacks)
 */
export function isSafeWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS (or HTTP for localhost in development)
    if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      if (process.env.NODE_ENV === 'production') {
        return false; // Block HTTP in production
      }
    }
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block dangerous hostname patterns (DNS-based SSRF)
    const blockedHostnames = [
      'metadata.google.internal',
      'metadata.goog',
      'metadata',
      'kubernetes.default',
      'consul.service.consul',
      'vault.service.consul',
    ];
    
    for (const blocked of blockedHostnames) {
      if (hostname === blocked || hostname.endsWith('.' + blocked)) {
        return false;
      }
    }
    
    // Block hostnames ending with suspicious TLDs
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return false;
    }
    
    // Block decimal/hex/octal IP notation (e.g., http://2130706433/ = 127.0.0.1)
    if (/^\d+$/.test(hostname)) {
      return false; // Pure decimal IP
    }
    if (/^0x[0-9a-f]+$/i.test(hostname)) {
      return false; // Hex IP (0x7f000001)
    }
    if (/^0[0-7]+$/.test(hostname)) {
      return false; // Octal IP
    }
    
    // Validate IPv4 addresses
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);
    
    if (ipv4Match) {
      const octets = ipv4Match.slice(1).map(Number);
      
      // Validate octet ranges
      if (octets.some(octet => octet > 255)) {
        return false;
      }
      
      const [a, b, c, d] = octets;
      
      // Block loopback (127.0.0.0/8)
      if (a === 127) return false;
      
      // Block private networks (RFC 1918)
      if (a === 10) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      
      // 🔥 CRITICAL: Block link-local addresses (169.254.0.0/16)
      // This blocks AWS/Azure/GCP metadata services!
      if (a === 169 && b === 254) return false;
      
      // Block carrier-grade NAT (100.64.0.0/10)
      if (a === 100 && b >= 64 && b <= 127) return false;
      
      // Block current network (0.0.0.0/8)
      if (a === 0) return false;
      
      // Block broadcast (255.255.255.255)
      if (a === 255 && b === 255 && c === 255 && d === 255) return false;
      
      // Block multicast (224.0.0.0/4)
      if (a >= 224 && a <= 239) return false;
      
      // Block reserved (240.0.0.0/4)
      if (a >= 240) return false;
      
      // Allow localhost in development
      if (process.env.NODE_ENV === 'development' && a === 127) {
        // Already blocked above, but keep for clarity
      }
    }
    
    // Validate IPv6 addresses (basic check - hostname contains colons)
    if (hostname.includes(':') || hostname.startsWith('[')) {
      const ipv6 = hostname.replace(/^\[|\]$/g, ''); // Remove brackets
      
      // Block IPv6 loopback
      if (ipv6 === '::1') return false;
      
      // Block IPv6 private (fc00::/7 - unique local addresses)
      if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return false;
      
      // Block IPv6 link-local (fe80::/10)
      if (ipv6.match(/^fe[89ab]/i)) return false;
      
      // Block IPv4-mapped IPv6 (::ffff:x.x.x.x)
      if (ipv6.includes('::ffff:')) {
        const ipv4Part = ipv6.split('::ffff:')[1];
        // Recursively validate the IPv4 part
        if (ipv4Part) {
          try {
            return isSafeWebhookUrl(`http://${ipv4Part}/`);
          } catch {
            return false;
          }
        }
      }
      
      // Block IPv4-compatible IPv6 (::x.x.x.x)
      const ipv4CompatMatch = ipv6.match(/::(\d+\.\d+\.\d+\.\d+)$/);
      if (ipv4CompatMatch) {
        try {
          return isSafeWebhookUrl(`http://${ipv4CompatMatch[1]}/`);
        } catch {
          return false;
        }
      }
    }
    
    // Special handling for localhost/127.0.0.1 in development
    if (process.env.NODE_ENV === 'development') {
      if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
        return true;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates webhook secret strength
 */
export function validateWebhookSecret(secret: string): { valid: boolean; error?: string } {
  const MIN_SECRET_LENGTH = 32;
  
  if (secret.length < MIN_SECRET_LENGTH) {
    return { 
      valid: false, 
      error: `Secret must be at least ${MIN_SECRET_LENGTH} characters long` 
    };
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /^(password|secret|123|abc|test)/i,
    /^(.)\1{10,}/, // Repeated character
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      return { 
        valid: false, 
        error: 'Secret appears weak. Use a cryptographically random string (e.g., from a password generator)' 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Fires a webhook with proper logging, timeout, and retry queueing
 */
export async function fireWebhook(
  hook: Webhook,
  payload: {
    id: string;
    type: string;
    createdAt: string;
    data: any;
  }
): Promise<{ success: boolean; httpStatus?: number; error?: string }> {
  const startTime = Date.now();
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
  
  // Validate URL safety
  if (!isSafeWebhookUrl(hook.targetUrl)) {
    const error = 'Webhook URL blocked: Internal/private URLs not allowed';
    console.error(`[Webhook] ${error}`, { webhookId: hook.id, url: hook.targetUrl });
    
    await storage.createWebhookDeliveryLog({
      webhookId: hook.id,
      organizationId: hook.organizationId,
      event: hook.event,
      payloadId: payload.id,
      targetUrl: hook.targetUrl,
      httpStatus: 0,
      errorMessage: error,
      latencyMs: 0,
      attemptNumber: 1,
    });
    
    return { success: false, error };
  }
  
  // Setup timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  
  try {
    const response = await fetch(hook.targetUrl, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'manual', // 🔥 CRITICAL: Don't follow redirects (SSRF protection)
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Id': payload.id,
        'X-Webhook-Type': payload.type,
        'X-Webhook-Delivery-Id': randomUUID(),
        'User-Agent': 'ProcessSutra-Webhooks/1.0',
      },
      body,
    });
    
    clearTimeout(timeout);
    
    // Block redirects (SSRF protection)
    if (response.status >= 300 && response.status < 400) {
      const error = `Webhook returned redirect (${response.status}) - not allowed for security`;
      
      await storage.createWebhookDeliveryLog({
        webhookId: hook.id,
        organizationId: hook.organizationId,
        event: hook.event,
        payloadId: payload.id,
        targetUrl: hook.targetUrl,
        httpStatus: response.status,
        errorMessage: error,
        latencyMs: Date.now() - startTime,
        attemptNumber: 1,
      });
      
      console.error(`[Webhook] ${error}`, { webhookId: hook.id });
      return { success: false, error };
    }
    
    const responseBody = await safeReadResponse(response).catch(err => {
      console.warn(`[Webhook] Response read error:`, err.message);
      return '';
    });
    const latencyMs = Date.now() - startTime;
    const success = response.ok; // 2xx status
    
    // Log delivery
    await storage.createWebhookDeliveryLog({
      webhookId: hook.id,
      organizationId: hook.organizationId,
      event: hook.event,
      payloadId: payload.id,
      targetUrl: hook.targetUrl,
      httpStatus: response.status,
      responseBody: responseBody.slice(0, 1000), // Limit to 1KB
      latencyMs,
      attemptNumber: 1,
    });
    
    console.log(`[Webhook] Delivered to ${hook.targetUrl}`, {
      webhookId: hook.id,
      status: response.status,
      latencyMs,
      success,
    });
    
    // If failed, queue for retry
    if (!success) {
      await queueWebhookRetry(hook, payload, `HTTP ${response.status}`);
    }
    
    return { success, httpStatus: response.status };
    
  } catch (error: any) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;
    const errorMessage = error.name === 'AbortError' 
      ? `Request timeout (${WEBHOOK_TIMEOUT_MS}ms)`
      : error.message || 'Network error';
    
    // Log failure
    await storage.createWebhookDeliveryLog({
      webhookId: hook.id,
      organizationId: hook.organizationId,
      event: hook.event,
      payloadId: payload.id,
      targetUrl: hook.targetUrl,
      httpStatus: 0,
      errorMessage,
      latencyMs,
      attemptNumber: 1,
    });
    
    console.error(`[Webhook] Delivery failed to ${hook.targetUrl}`, {
      webhookId: hook.id,
      error: errorMessage,
      latencyMs,
    });
    
    // Queue for retry
    await queueWebhookRetry(hook, payload, errorMessage);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Queue a webhook for retry
 */
async function queueWebhookRetry(
  hook: Webhook,
  payload: any,
  lastError: string
): Promise<void> {
  try {
    // Calculate next retry time (exponential backoff)
    // 1st retry: 1 minute, 2nd: 5 minutes, 3rd: 30 minutes
    const retryDelays = [60000, 300000, 1800000]; // in milliseconds
    const nextRetryDelay = retryDelays[0]; // First retry after 1 minute
    
    await storage.createWebhookRetryQueueItem({
      webhookId: hook.id,
      organizationId: hook.organizationId,
      event: hook.event,
      payload,
      targetUrl: hook.targetUrl,
      secret: hook.secret,
      attemptNumber: 1,
      maxRetries: MAX_RETRIES,
      nextRetryAt: new Date(Date.now() + nextRetryDelay),
      status: 'pending',
      lastError,
    });
    
    console.log(`[Webhook] Queued for retry`, {
      webhookId: hook.id,
      nextRetryAt: new Date(Date.now() + nextRetryDelay).toISOString(),
    });
  } catch (error) {
    console.error(`[Webhook] Failed to queue retry`, { webhookId: hook.id, error });
  }
}

/**
 * Process pending webhook retries (called by background worker)
 */
export async function processWebhookRetries(): Promise<void> {
  const retries = await storage.getPendingRetries(50);
  
  if (retries.length === 0) {
    return;
  }
  
  console.log(`[Webhook Retry Worker] Processing ${retries.length} pending retries`);
  
  for (const retry of retries) {
    try {
      // Reconstruct webhook object
      const hook = await storage.getWebhookById(retry.webhookId);
      if (!hook || !hook.isActive) {
        console.log(`[Webhook Retry] Webhook ${retry.webhookId} is inactive or deleted, removing from queue`);
        await storage.updateRetryQueueItem(retry.id, { status: 'failed', lastError: 'Webhook inactive or deleted' });
        continue;
      }
      
      const startTime = Date.now();
      const payload = retry.payload as any;
      const body = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', retry.secret).update(body).digest('hex');
      
      // Setup timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      
      try {
        const response = await fetch(retry.targetUrl, {
          method: 'POST',
          signal: controller.signal,
          redirect: 'manual', // 🔥 CRITICAL: Don't follow redirects (SSRF protection)
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Id': payload.id,
            'X-Webhook-Type': payload.type,
            'X-Webhook-Retry-Attempt': String(retry.attemptNumber),
            'User-Agent': 'ProcessSutra-Webhooks/1.0',
          },
          body,
        });
        
        clearTimeout(timeout);
        
        // Block redirects (SSRF protection)
        if (response.status >= 300 && response.status < 400) {
          const errorMessage = `Redirect (${response.status}) not allowed`;
          
          await storage.createWebhookDeliveryLog({
            webhookId: hook.id,
            organizationId: hook.organizationId,
            event: retry.event,
            payloadId: payload.id,
            targetUrl: retry.targetUrl,
            httpStatus: response.status,
            errorMessage,
            latencyMs: Date.now() - startTime,
            attemptNumber: retry.attemptNumber,
          });
          
          // Mark as failed - don't retry redirects
          await storage.updateRetryQueueItem(retry.id, {
            status: 'failed',
            lastError: errorMessage,
          });
          
          console.error(`[Webhook Retry] ${errorMessage}`, { webhookId: hook.id });
          continue;
        }
        
        const responseBody = await safeReadResponse(response).catch(err => {
          console.warn(`[Webhook Retry] Response read error:`, err.message);
          return '';
        });
        const latencyMs = Date.now() - startTime;
        const success = response.ok;
        
        // Log retry attempt
        await storage.createWebhookDeliveryLog({
          webhookId: hook.id,
          organizationId: hook.organizationId,
          event: retry.event,
          payloadId: payload.id,
          targetUrl: retry.targetUrl,
          httpStatus: response.status,
          responseBody: responseBody.slice(0, 1000),
          latencyMs,
          attemptNumber: retry.attemptNumber,
        });
        
        if (success) {
          // Success - remove from retry queue
          await storage.updateRetryQueueItem(retry.id, { status: 'success' });
          console.log(`[Webhook Retry] Success on attempt ${retry.attemptNumber}`, {
            webhookId: hook.id,
            retryId: retry.id,
          });
        } else {
          // Failed - schedule next retry or mark as permanently failed
          const nextAttempt = (retry.attemptNumber || 1) + 1;
          const maxRetries = retry.maxRetries || MAX_RETRIES;
          
          if (nextAttempt > maxRetries) {
            await storage.updateRetryQueueItem(retry.id, {
              status: 'failed',
              lastError: `Max retries (${retry.maxRetries}) exceeded. Last status: ${response.status}`,
            });
            console.error(`[Webhook Retry] Max retries exceeded`, {
              webhookId: hook.id,
              retryId: retry.id,
              attempts: maxRetries,
            });
          } else {
            // Calculate next retry delay (exponential backoff)
            const retryDelays = [60000, 300000, 1800000]; // 1min, 5min, 30min
            const nextRetryDelay = retryDelays[nextAttempt - 1] || 1800000;
            
            await storage.updateRetryQueueItem(retry.id, {
              attemptNumber: nextAttempt,
              nextRetryAt: new Date(Date.now() + nextRetryDelay),
              lastError: `HTTP ${response.status}`,
            });
            
            console.log(`[Webhook Retry] Scheduled retry attempt ${nextAttempt}`, {
              webhookId: hook.id,
              retryId: retry.id,
              nextRetryAt: new Date(Date.now() + nextRetryDelay).toISOString(),
            });
          }
        }
      } catch (error: any) {
        clearTimeout(timeout);
        const errorMessage = error.name === 'AbortError'
          ? `Timeout (${WEBHOOK_TIMEOUT_MS}ms)`
          : error.message || 'Network error';
        
        const latencyMs = Date.now() - startTime;
        
        // Log failed retry attempt
        await storage.createWebhookDeliveryLog({
          webhookId: hook.id,
          organizationId: hook.organizationId,
          event: retry.event,
          payloadId: payload.id,
          targetUrl: retry.targetUrl,
          httpStatus: 0,
          errorMessage,
          latencyMs,
          attemptNumber: retry.attemptNumber,
        });
        
        // Schedule next retry or mark as failed
        const nextAttempt = (retry.attemptNumber || 1) + 1;
        const maxRetries = retry.maxRetries || MAX_RETRIES;
        
        if (nextAttempt > maxRetries) {
          await storage.updateRetryQueueItem(retry.id, {
            status: 'failed',
            lastError: `Max retries exceeded. Last error: ${errorMessage}`,
          });
        } else {
          const retryDelays = [60000, 300000, 1800000];
          const nextRetryDelay = retryDelays[nextAttempt - 1] || 1800000;
          
          await storage.updateRetryQueueItem(retry.id, {
            attemptNumber: nextAttempt,
            nextRetryAt: new Date(Date.now() + nextRetryDelay),
            lastError: errorMessage,
          });
        }
      }
    } catch (error) {
      console.error(`[Webhook Retry] Unexpected error processing retry ${retry.id}`, error);
    }
  }
}

/**
 * Fire all webhooks for a specific event in an organization
 */
export async function fireWebhooksForEvent(
  organizationId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    const hooks = await storage.getActiveWebhooksForEvent(organizationId, event);
    
    if (hooks.length === 0) {
      return;
    }
    
    console.log(`[Webhook] Firing ${hooks.length} webhooks for event ${event}`, {
      organizationId,
      event,
    });
    
    // Fire all webhooks in parallel (non-blocking)
    const promises = hooks.map(hook => {
      const payload = {
        id: randomUUID(),
        type: event,
        createdAt: new Date().toISOString(),
        data,
      };
      
      return fireWebhook(hook, payload).catch(error => {
        console.error(`[Webhook] Error firing webhook ${hook.id}`, error);
      });
    });
    
    // Don't await - fire and forget (with logging)
    Promise.all(promises).catch(() => {});
  } catch (error) {
    console.error(`[Webhook] Error fetching webhooks for event ${event}`, error);
  }
}
