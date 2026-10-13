# EmailJS Setup Guide

This guide explains how to configure EmailJS for sending team member invitation emails.

## What is EmailJS?

EmailJS is a client-side email service that allows you to send emails directly from the browser without a backend server. It uses your existing email service (Gmail, Outlook, etc.) to send emails.

## Setup Steps

### 1. Create an EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (the free tier allows up to 200 emails/month)
3. Verify your email address

### 2. Add an Email Service

1. In EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider:
   - **Gmail**: Recommended for personal use
   - **Outlook**: For Microsoft accounts
   - **Custom SMTP**: For business email servers
4. Follow the authentication steps:
   - For Gmail: You'll need to create an App Password
     - Go to Google Account > Security > 2-Step Verification
     - Select "App passwords"
     - Generate a new app password for EmailJS
5. Note the **Service ID** (e.g., "service_gmail")

### 3. Create an Email Template

1. In EmailJS dashboard, go to "Email Templates"
2. Click "Create New Template"
3. Choose the service you created in step 2
4. Set up the template:

**Subject:**
```
You're invited to join {{app_name}}!
```

**Body (HTML):**
```html
<html>
<body>
  <h2>Welcome to {{app_name}}!</h2>
  
  <p>Hello {{to_name}},</p>
  
  <p>You have been invited to join <strong>{{app_name}}</strong> as a <strong>{{role}}</strong>.</p>
  
  <p><strong>Invited by:</strong> {{from_name}} ({{from_email}})</p>
  
  <p>To get started:</p>
  <ol>
    <li>Click the link below to open the app</li>
    <li>Sign in with your Google account ({{to_email}})</li>
    <li>You'll have access based on your {{role}} role</li>
  </ol>
  
  <p>
    <a href="{{invite_link}}" style="background-color: #2d5a27; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
      Open {{app_name}}
    </a>
  </p>
  
  <p>If you have any questions, contact {{from_email}}.</p>
  
  <hr>
  <p style="color: #666; font-size: 12px;">
    This is an automated invitation from {{app_name}}.
  </p>
</body>
</html>
```

5. Save the template and note the **Template ID**

### 4. Get Your Public Key

1. In EmailJS dashboard, go to "Account" > "General"
2. Copy your **Public Key** (also called Public Key or API Key)

### 5. Configure Environment Variables

Add the following to your `.env` file:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

### 6. Restart Your Development Server

After updating the `.env` file, restart the development server:

```bash
npm run dev
```

## Testing the Configuration

1. Sign in as an Owner
2. Go to Settings > Team
3. Enter a test email address
4. Select a role
5. Click "Send Invite"
6. Check the recipient's inbox for the invitation email

## Troubleshooting

### Email not sending

- Verify all three environment variables are set correctly
- Check the browser console for error messages
- Ensure your EmailJS service is authenticated properly
- Verify you haven't exceeded the free tier limit (200 emails/month)

### Template variables not working

- Ensure template variables use double curly braces: `{{variable_name}}`
- Check that variable names match exactly what's in the code:
  - `to_email`
  - `to_name`
  - `from_name`
  - `from_email`
  - `role`
  - `app_name`
  - `invite_link`

### Gmail authentication issues

- Use an App Password instead of your regular password
- Ensure 2-Step Verification is enabled on your Google account
- If using a work/school Google account, check if admin restrictions apply

## Security Notes

- The public key is safe to expose in client-side code
- Never share your EmailJS private key or account credentials
- EmailJS limits prevent email abuse
- Consider upgrading to a paid plan for production use

## Alternative: Without EmailJS

If you prefer not to use EmailJS, the invite functionality will still work:
- Users will be added to Firestore
- They can sign in with Google authentication
- You'll need to notify them manually (e.g., via phone, Slack, etc.)
