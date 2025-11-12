/**
 * Input Sanitization Utilities
 * 
 * Protects against XSS attacks by sanitizing user input
 * Strips HTML tags and dangerous characters while preserving valid text
 */

/**
 * Sanitizes a string by removing HTML tags and dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  // Convert to string if not already
  const str = String(input);
  
  // Remove HTML tags
  let sanitized = str.replace(/<[^>]*>/g, '');
  
  // Remove dangerous characters that could be used for XSS
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/&lt;|&gt;/g, ''); // Remove HTML entities for angle brackets
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent extremely long inputs
  const MAX_LENGTH = 500;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized;
}

/**
 * Sanitizes an email address
 * @param email - The email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const str = String(email).toLowerCase().trim();
  
  // Basic email validation pattern
  const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  
  if (emailPattern.test(str)) {
    return str;
  }
  
  return '';
}

/**
 * Sanitizes a system/workflow name
 * Allows alphanumeric, spaces, hyphens, and underscores
 * @param name - The system name to sanitize
 * @returns Sanitized system name
 */
export function sanitizeSystemName(name: string | null | undefined): string {
  if (!name) return '';
  
  const str = String(name);
  
  // Remove HTML and dangerous characters
  let sanitized = sanitizeString(str);
  
  // Only allow alphanumeric, spaces, hyphens, underscores, and parentheses
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_()]/g, '');
  
  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Trim and limit length
  sanitized = sanitized.trim();
  const MAX_SYSTEM_NAME_LENGTH = 100;
  if (sanitized.length > MAX_SYSTEM_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SYSTEM_NAME_LENGTH);
  }
  
  return sanitized;
}

/**
 * Sanitizes a task name
 * Similar to system name but allows more characters
 * @param name - The task name to sanitize
 * @returns Sanitized task name
 */
export function sanitizeTaskName(name: string | null | undefined): string {
  if (!name) return '';
  
  const str = String(name);
  
  // Remove HTML and dangerous characters
  let sanitized = sanitizeString(str);
  
  // Allow alphanumeric, spaces, common punctuation
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_().,!?&]/g, '');
  
  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Trim and limit length
  sanitized = sanitized.trim();
  const MAX_TASK_NAME_LENGTH = 200;
  if (sanitized.length > MAX_TASK_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_TASK_NAME_LENGTH);
  }
  
  return sanitized;
}

/**
 * Sanitizes a flow rule object
 * @param rule - The flow rule to sanitize
 * @returns Sanitized flow rule
 */
export function sanitizeFlowRule(rule: any): any {
  return {
    ...rule,
    system: sanitizeSystemName(rule.system),
    currentTask: sanitizeTaskName(rule.currentTask),
    status: sanitizeString(rule.status),
    nextTask: sanitizeTaskName(rule.nextTask),
    doer: sanitizeString(rule.doer),
    email: sanitizeEmail(rule.email),
    formId: sanitizeString(rule.formId),
    transferToEmails: rule.transferToEmails ? sanitizeString(rule.transferToEmails) : undefined,
  };
}

/**
 * Validates and sanitizes multiple flow rules
 * @param rules - Array of flow rules to sanitize
 * @returns Array of sanitized flow rules
 */
export function sanitizeFlowRules(rules: any[]): any[] {
  if (!Array.isArray(rules)) {
    return [];
  }
  
  return rules.map(rule => sanitizeFlowRule(rule));
}
