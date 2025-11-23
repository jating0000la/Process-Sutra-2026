u Setup Guide - Communication Add-on

## Step 1: Run Database Migration

```powershell
# Connect to your PostgreSQL database and run the migration
psql -U your_username -d your_database_name -f migrations/add_communication_config_to_form_templates.sql
```

Or if using Drizzle ORM:

```powershell
npm run db:push
```

## Step 2: Restart the Application

```powershell
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Step 3: Test the Feature

1. **Login as Admin**
   - Navigate to Form Builder
   
2. **Create or Edit a Form**
   - Add some test fields (Name, Email, Phone, etc.)
   
3. **Configure Communication**
   - Click "Communication Settings" tab
   - Enable WhatsApp:
     - Phone: `919876543210` (static) or `{{Phone}}` (dynamic from form)
     - Message: `Hello {{Name}}, thank you for submitting!`
   - Enable Email:
     - Email: `test@gmail.com` (static) or `{{Email}}` (dynamic from form)
     - Subject: `Form Submission - {{Name}}`
     - Body: `Dear {{Name}},%0AThank you for your submission.`
   
4. **Save the Form**

5. **Test Form Submission**
   - Open the form in a task or flow
   - Fill out the form fields
   - Click "Submit Form"
   - You should see "Send via WhatsApp" and "Send via Email" buttons
   
6. **Click Send Buttons**
   - WhatsApp should open with pre-filled message
   - Gmail should open with pre-filled email

## Expected Behavior

✅ Communication Settings tab appears in Form Builder  
✅ WhatsApp/Email configuration can be saved  
✅ After form submission, send buttons appear  
✅ Clicking buttons opens WhatsApp/Gmail with form data  
✅ Placeholders are replaced with actual values  

## Troubleshooting

If buttons don't appear:
- Check that communication is enabled in form settings
- Verify form submitted successfully
- Check browser console for errors

If placeholders aren't replaced:
- Ensure exact match with field labels
- Check placeholder format: `{{FieldLabel}}`
- Verify field has a value

## Files Modified

- `shared/schema.ts` - Added whatsappConfig and emailConfig fields
- `client/src/pages/form-builder.tsx` - Added Communication Settings tab
- `client/src/components/form-renderer.tsx` - Added send buttons
- `client/src/lib/communicationUtils.ts` - URL generation logic
- `migrations/add_communication_config_to_form_templates.sql` - Database migration

## Need Help?

Refer to the detailed documentation in `docs/COMMUNICATION_ADDON.md`
