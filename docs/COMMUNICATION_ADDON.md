# WhatsApp & Email Communication Add-on for Form Builder

## Overview

This add-on enables automatic WhatsApp and Email notifications after form submission. Admins can configure message templates with dynamic placeholders that get replaced with actual form data.

## Features

✅ **WhatsApp Integration** - Send pre-filled WhatsApp messages  
✅ **Email Integration** - Send pre-filled Gmail messages  
✅ **Dynamic Placeholders** - Use `{{FieldLabel}}` to insert form values  
✅ **Easy Configuration** - Simple UI in Form Builder  
✅ **Auto-redirect** - Opens WhatsApp/Gmail in new tab with pre-filled message

## How to Use

### For Admins: Configure Communication Settings

1. **Navigate to Form Builder**
   - Go to Form Builder page
   - Create a new form or edit an existing one

2. **Switch to Communication Settings Tab**
   - Click on the "Communication Settings" tab
   - You'll see two sections: WhatsApp and Email

3. **Configure WhatsApp (Optional)**
   - Toggle the checkbox to enable WhatsApp
   - Enter recipient's phone number (with country code, without +)
     - Example: `919876543210` (for India +91)
     - Or use placeholder: `91{{Phone}}` or just `{{Phone}}` if the form field contains full number
   - Write your message template
   - Use placeholders like `{{Name}}` or `{{Email}}` to insert form field values
   
   **Example Template:**
   ```
   Hello {{Name}},
   
   Thank you for submitting the form!
   
   We received your request for {{Product}}.
   Our team will contact you at {{Email}} shortly.
   
   Best regards,
   Process Sutra Team
   ```

4. **Configure Email (Optional)**
   - Toggle the checkbox to enable Email
   - Enter recipient email address
     - Example: `contact@example.com`
     - Or use placeholder: `{{Email}}` or `{{UserEmail}}` to get it from form field
   - Enter email subject (can use placeholders)
   - Write email body template
   - Use `%0A` for line breaks in email body
   - Use placeholders like `{{Name}}` to insert form values
   
   **Example Subject:**
   ```
   New Form Submission from {{Name}}
   ```
   
   **Example Body:**
   ```
   Dear Team,%0A%0ANew form submission received:%0A%0AName: {{Name}}%0AEmail: {{Email}}%0AProduct: {{Product}}%0A%0APlease follow up promptly.
   ```

5. **Save the Form**
   - Click "Save Form" or "Update Form"
   - Your communication settings are now saved

### For End Users: Submit Form & Send Notifications

1. **Fill out the form** as usual

2. **Click "Submit Form"**

3. **After submission succeeds**, you'll see notification buttons:
   - **Send via WhatsApp** button (if enabled)
   - **Send via Email** button (if enabled)

4. **Click the button** to open:
   - WhatsApp Web/App with pre-filled message
   - Gmail compose window with pre-filled email

5. **Review and send** the message from WhatsApp/Gmail

## Technical Details

### URL Format

**WhatsApp:**
```
https://api.whatsapp.com/send?phone=919876543210&text=Hello%20John...
```

**Email:**
```
https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1&to=test@gmail.com&su=Subject&body=Message
```

### Database Schema

Added to `form_templates` table:

```typescript
whatsappConfig: {
  enabled: boolean;
  phoneNumber: string;
  messageTemplate: string;
}

emailConfig: {
  enabled: boolean;
  recipientEmail: string;
  subject: string;
  bodyTemplate: string;
}
```

### Placeholder System

- Format: `{{FieldLabel}}`
- Case-sensitive
- Matches the exact label of form fields
- Automatically replaced with form data values
- **Works in phone numbers, email addresses, subjects, and message bodies**

### Supported Field Types

All form field types are supported:
- **Text/Textarea** - Direct value
- **Select/Radio** - Selected option
- **Checkbox** - Comma-separated selected options
- **Date** - Formatted date
- **File** - File name
- **Table** - Formatted list of rows

## Migration

Run this SQL migration to add the new columns:

```bash
psql -d your_database -f migrations/add_communication_config_to_form_templates.sql
```

Or if using Drizzle:

```bash
npm run db:push
```

## Example Use Cases

### 1. Dynamic Recipient - Sales Lead Notification
When a user submits a sales inquiry form with their phone number, send WhatsApp to that number:
- Phone: `{{Phone}}` or `91{{Phone}}`
- Message: `Hello {{Name}}, thank you for your inquiry about {{Product}}. Our team will contact you shortly.`

### 2. Email to Form Submitter
Send acknowledgment email to the person who submitted the form:
- Email: `{{Email}}`
- Subject: `Thank you {{Name}} - Form Received`
- Body: `Dear {{Name}},%0AYour submission has been received. Reference ID: {{OrderNumber}}`

### 3. Customer Onboarding
After form submission, send a welcome email with the customer's information for record-keeping.

### 3. Event Registration
Notify event coordinators via WhatsApp when someone registers, including participant details.

### 4. Support Ticket
Create a pre-filled email to the support team with ticket details from the form.

## Best Practices

1. **Keep messages concise** - Long messages may get truncated
2. **Test templates** - Submit a test form to verify placeholder replacement
3. **Use meaningful placeholders** - Match exact field labels
4. **Consider privacy** - Don't include sensitive information in templates
5. **Provide context** - Include form title or purpose in the message

## Troubleshooting

**Placeholders not replaced?**
- Ensure placeholder format is exactly `{{FieldLabel}}`
- Check that field label matches exactly (case-sensitive)
- Verify field has a value in the submitted form

**WhatsApp not opening?**
- Check phone number format (no + or spaces)
- Verify WhatsApp is installed or use WhatsApp Web
- Check browser popup blocker settings

**Email not opening?**
- Ensure Gmail is set as default email client
- Check browser popup blocker settings
- Try using `%0A` for line breaks instead of actual newlines

**Buttons not showing?**
- Verify communication is enabled in form settings
- Check that form was submitted successfully
- Ensure you're not in readonly mode

## Security Considerations

- Phone numbers and email addresses are stored in the database
- Templates are stored as plain text
- No automatic sending - user must click to open WhatsApp/Gmail
- All communication goes through official WhatsApp/Gmail apps
- No data is sent to third-party servers

## Future Enhancements

Potential improvements for future versions:
- Multiple recipients
- Conditional templates based on form values
- SMS integration
- Slack/Teams notifications
- Email templates with HTML formatting
- Scheduled notifications
- Automatic sending without user interaction

## Support

For issues or questions, please refer to the main Process Sutra documentation or contact the development team.
