/**
 * Utility functions for generating WhatsApp and Email URLs from form data
 */

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  tableColumns?: { id: string; label: string; type: string; options?: string[] }[];
}

interface FormTemplate {
  id: string;
  formId: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
  whatsappConfig?: {
    enabled: boolean;
    phoneNumber: string;
    messageTemplate: string;
  };
  emailConfig?: {
    enabled: boolean;
    recipientEmail: string;
    subject: string;
    bodyTemplate: string;
  };
}

/**
 * Format form data value for display in messages
 */
function formatFormValue(value: any, question: FormQuestion): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle file uploads - Support both new format (URL string) and old format (object)
  if (question.type === 'file') {
    // New format: just a URL string
    if (typeof value === 'string' && (value.startsWith('https://') || value.startsWith('http://'))) {
      return value;
    }
    
    // Old format: file object
    if (typeof value === 'object' && value.type === 'file') {
      if (value.url) {
        return value.url;
      }
      
      if (value.driveFileId) {
        return `https://drive.google.com/file/d/${value.driveFileId}/view`;
      }
      
      return value.originalName || 'File';
    }
  }

  // Handle checkbox arrays
  if (Array.isArray(value)) {
    if (question.type === 'table') {
      // Format table data as a list
      return value.map((row, index) => {
        const rowData = Object.entries(row)
          .filter(([key]) => !key.startsWith('_'))
          .map(([key, val]) => {
            const column = question.tableColumns?.find(col => col.id === key);
            return `${column?.label || key}: ${val}`;
          })
          .join(', ');
        return `${index + 1}. ${rowData}`;
      }).join('\n');
    } else {
      // Checkbox values
      return value.join(', ');
    }
  }

  // Handle dates
  if (question.type === 'date' && value) {
    try {
      const date = new Date(value);
      return date.toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  return String(value);
}

/**
 * Replace placeholders in template with actual form data
 * Placeholders format: {{FieldLabel}}
 */
function replacePlaceholders(
  template: string,
  formData: Record<string, any>,
  questions: FormQuestion[]
): string {
  let result = template;

  questions.forEach((question) => {
    const placeholder = `{{${question.label}}}`;
    const value = formData[question.id];
    const formattedValue = formatFormValue(value, question);
    
    // Replace all occurrences of the placeholder
    result = result.split(placeholder).join(formattedValue);
  });

  return result;
}

/**
 * Generate WhatsApp URL from form data
 * Format: https://api.whatsapp.com/send?phone=91<PHONE>&text=<ENCODED_MESSAGE>
 */
export function generateWhatsAppURL(
  template: FormTemplate,
  formData: Record<string, any>
): string | null {
  if (!template.whatsappConfig?.enabled) {
    return null;
  }

  const { phoneNumber, messageTemplate } = template.whatsappConfig;

  if (!phoneNumber || !messageTemplate) {
    return null;
  }

  // Replace placeholders in phone number with actual form data
  const resolvedPhoneNumber = replacePlaceholders(phoneNumber, formData, template.questions);

  // Replace placeholders with actual form data in message
  const message = replacePlaceholders(messageTemplate, formData, template.questions);

  // URL encode the message
  const encodedMessage = encodeURIComponent(message);

  // Clean phone number (remove any non-digits)
  let cleanPhone = resolvedPhoneNumber.replace(/\D/g, '');

  // If phone number length is exactly 10 digits, add +91 prefix (India)
  // If length is more than 10, take as it is
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
}

/**
 * Generate Gmail compose URL from form data
 * Format: https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&to=<EMAIL>&su=<SUBJECT>&body=<BODY>
 */
export function generateEmailURL(
  template: FormTemplate,
  formData: Record<string, any>
): string | null {
  if (!template.emailConfig?.enabled) {
    return null;
  }

  const { recipientEmail, subject, bodyTemplate } = template.emailConfig;

  if (!recipientEmail || !subject || !bodyTemplate) {
    return null;
  }

  // Replace placeholders in recipient email with actual form data
  const resolvedEmail = replacePlaceholders(recipientEmail, formData, template.questions);

  // Replace placeholders with actual form data
  const replacedSubject = replacePlaceholders(subject, formData, template.questions);
  const replacedBody = replacePlaceholders(bodyTemplate, formData, template.questions);

  // URL encode the subject and body
  const encodedSubject = encodeURIComponent(replacedSubject);
  const encodedBody = encodeURIComponent(replacedBody);
  const encodedEmail = encodeURIComponent(resolvedEmail);

  return `https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&to=${encodedEmail}&su=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Check if WhatsApp is configured and enabled for a template
 */
export function isWhatsAppEnabled(template: FormTemplate): boolean {
  return !!(
    template.whatsappConfig?.enabled &&
    template.whatsappConfig?.phoneNumber &&
    template.whatsappConfig?.messageTemplate
  );
}

/**
 * Check if Email is configured and enabled for a template
 */
export function isEmailEnabled(template: FormTemplate): boolean {
  return !!(
    template.emailConfig?.enabled &&
    template.emailConfig?.recipientEmail &&
    template.emailConfig?.subject &&
    template.emailConfig?.bodyTemplate
  );
}
